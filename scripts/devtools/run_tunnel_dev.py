#!/usr/bin/env python3
"""
Запуск защищённого туннеля для Vite (Caddy BasicAuth + localtunnel).

- Проверяет доступность Vite (опционально).
- Поднимает Caddy reverse proxy с BasicAuth (bcrypt через `caddy hash-password`).
- Открывает localtunnel к защищённому прокси.
- Корректно гасит процессы и временный Caddyfile по Ctrl+C.
"""

from __future__ import annotations

import argparse
import os
import re
import shutil
import signal
import socket
import subprocess
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import deque
from typing import Callable, Deque, Optional

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
LOCAL_HASH_PATH = os.path.join(SCRIPT_DIR, "data", "auth.bcrypt")
FALLBACK_HASH_PATH = os.path.expanduser("~/.axiom_tunnel_dev/auth.bcrypt")
DEFAULT_HASH_PATH = os.path.expanduser(os.environ.get("AXIOM_TUNNEL_HASH_FILE", LOCAL_HASH_PATH))
DEFAULT_LT_HOST = os.environ.get("AXIOM_TUNNEL_LT_HOST", "https://loca.lt")

LT_URL_RE = re.compile(r"https://[A-Za-z0-9-]+\.(?:loca\.lt|localtunnel\.me)")


def parse_bool(value: str) -> bool:
    """Парсинг булевых строк для флагов CLI."""
    if isinstance(value, bool):
        return value
    val = value.strip().lower()
    if val in {"1", "true", "yes", "y", "on"}:
        return True
    if val in {"0", "false", "no", "n", "off"}:
        return False
    raise argparse.ArgumentTypeError(f"Expected boolean value, got '{value}'.")


def mask_secret(secret: str) -> str:
    """Вернуть маску для секретов (без утечки значения)."""
    if not secret:
        return "******"
    return "*" * max(6, min(12, len(secret)))


def is_command_available(cmd: str) -> bool:
    return shutil.which(cmd) is not None


def require_command(cmd: str, install_hint: str) -> None:
    if not is_command_available(cmd):
        raise RuntimeError(f"Required command '{cmd}' not found. {install_hint}")


def normalize_url(url: str) -> str:
    """Гарантировать наличие схемы http в URL."""
    parsed = urllib.parse.urlparse(url)
    if not parsed.scheme:
        return f"http://{url}"
    return url


def wait_for_http_ok(url: str, timeout: int) -> bool:
    """Ждать ответа HTTP 2xx/3xx."""
    deadline = time.time() + timeout
    last_error: Optional[Exception] = None
    while time.time() < deadline:
        try:
            req = urllib.request.Request(url, method="GET")
            with urllib.request.urlopen(req, timeout=5) as resp:
                if 200 <= resp.status < 400:
                    return True
        except urllib.error.HTTPError as err:
            last_error = err
        except Exception as exc:  # noqa: BLE001
            last_error = exc
        time.sleep(1)
    if last_error:
        sys.stderr.write(f"Last error while waiting for {url}: {last_error}\n")
    return False


def wait_for_status(url: str, expected_status: int, timeout: int, proc: subprocess.Popen | None = None) -> bool:
    """Ждать заданный HTTP статус (например, 401)."""
    deadline = time.time() + timeout
    last_error: Optional[Exception] = None
    while time.time() < deadline:
        if proc is not None and proc.poll() is not None:
            return False
        try:
            req = urllib.request.Request(url, method="GET")
            with urllib.request.urlopen(req, timeout=4) as resp:
                if resp.status == expected_status:
                    return True
        except urllib.error.HTTPError as err:
            if err.code == expected_status:
                return True
            last_error = err
        except Exception as exc:  # noqa: BLE001
            last_error = exc
        time.sleep(0.8)
    if last_error:
        sys.stderr.write(f"Last error while probing {url}: {last_error}\n")
    return False


def caddy_hash_password(plaintext: str) -> str:
    """Получить bcrypt через `caddy hash-password`."""
    res = subprocess.run(
        ["caddy", "hash-password", "--plaintext", plaintext],
        capture_output=True,
        text=True,
        check=False,
    )
    output = (res.stdout or "") + (res.stderr or "")
    lines = [ln.strip() for ln in output.splitlines() if ln.strip()]
    if res.returncode != 0 or not lines:
        raise RuntimeError(f"caddy hash-password failed (code {res.returncode}): {output}")
    for line in reversed(lines):
        if line.startswith("$2"):
            return line
    raise RuntimeError(f"Could not parse bcrypt hash from caddy output:\n{output}")


def build_temp_caddyfile(auth_user: str, bcrypt: str, upstream_url: str, proxy_port: int) -> str:
    """Write temporary Caddyfile for BasicAuth reverse proxy."""
    parsed = urllib.parse.urlparse(upstream_url)
    upstream_hostport = parsed.netloc or upstream_url.replace("http://", "").replace("https://", "")
    content = (
        "{\n"
        "  admin off\n"
        "}\n\n"
        f":{proxy_port} {{\n"
        f"  basicauth /* {{\n"
        f"    {auth_user} {bcrypt}\n"
        f"  }}\n"
        f"  reverse_proxy {upstream_url} {{\n"
        f"    header_up Host {upstream_hostport}\n"
        f"  }}\n"
        f"}}\n"
    )
    tmp = tempfile.NamedTemporaryFile(
        mode="w",
        delete=False,
        prefix="axiom_caddyfile_dev_auth_",
        suffix=".caddyfile",
        dir="/tmp",
    )
    tmp.write(content)
    tmp.flush()
    tmp.close()
    return tmp.name


def is_port_free(port: int, host: str = "127.0.0.1") -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            sock.bind((host, port))
        except OSError:
            return False
    return True


def stream_output(
    proc: subprocess.Popen,
    label: str,
    buf: Deque[str],
    quiet: bool,
    on_line: Callable[[str], None] | None = None,
) -> None:
    """Stream subprocess output with optional prefix, keeping a small buffer."""
    if proc.stdout is None:
        return
    for raw_line in proc.stdout:
        line = raw_line.rstrip("\n")
        buf.append(line)
        if on_line:
            on_line(line)
        if not quiet:
            sys.stdout.write(f"[{label}] {line}\n")
            sys.stdout.flush()


def stop_process(proc: subprocess.Popen | None, name: str, quiet: bool) -> None:
    if proc is None or proc.poll() is not None:
        return
    signals = [signal.SIGINT, signal.SIGTERM]
    for sig in signals:
        try:
            proc.send_signal(sig)
            proc.wait(timeout=5)
            if proc.poll() is not None:
                return
        except Exception:
            continue
    try:
        proc.kill()
    except Exception:
        if not quiet:
            sys.stderr.write(f"Failed to kill {name}\n")


def read_bcrypt_from_file(path: str) -> str:
    if not os.path.exists(path):
        raise RuntimeError(f"Auth hash file not found: {path}")
    with open(path, "r", encoding="utf-8") as fh:
        for line in fh:
            val = line.strip()
            if val:
                return val
    raise RuntimeError(f"Auth hash file is empty: {path}")


def get_password(args: argparse.Namespace) -> str:
    if args.auth_pass:
        return args.auth_pass
    env_value = os.environ.get(args.auth_pass_env)
    if env_value:
        return env_value
    raise RuntimeError(
        f"Auth password is required. Pass via --auth-pass or set env {args.auth_pass_env}."
    )


def resolve_hash_write_path(args: argparse.Namespace) -> str:
    if args.auth_hash_file:
        return os.path.expanduser(args.auth_hash_file)
    env_path = os.environ.get("AXIOM_TUNNEL_HASH_FILE")
    if env_path:
        return os.path.expanduser(env_path)
    return DEFAULT_HASH_PATH


def find_existing_hash_path(args: argparse.Namespace) -> Optional[str]:
    candidates = []
    if args.auth_hash_file:
        candidates.append(os.path.expanduser(args.auth_hash_file))
    env_path = os.environ.get("AXIOM_TUNNEL_HASH_FILE")
    if env_path:
        candidates.append(os.path.expanduser(env_path))
    candidates.extend([DEFAULT_HASH_PATH, FALLBACK_HASH_PATH])
    for path in candidates:
        if path and os.path.exists(path):
            return path
    return None


def resolve_bcrypt(args: argparse.Namespace) -> tuple[str, str]:
    """
    Return (bcrypt_hash, display_mask).

    If --auth-hash-file is provided, read bcrypt from there and mask as 'bcrypt-file'.
    Otherwise, derive bcrypt via caddy hash-password using provided/plain password.
    """
    existing_path = find_existing_hash_path(args)
    if existing_path:
        bcrypt = read_bcrypt_from_file(existing_path)
        return bcrypt, "bcrypt-file"

    password = get_password(args)
    masked = mask_secret(password)
    bcrypt = caddy_hash_password(password)
    if args.write_hash_file:
        target = resolve_hash_write_path(args)
        os.makedirs(os.path.dirname(target), exist_ok=True)
        with open(target, "w", encoding="utf-8") as fh:
            fh.write(bcrypt + "\n")
        if not args.quiet:
            sys.stdout.write(f"Stored bcrypt at {target}\n")
    return bcrypt, masked


def build_localtunnel_cmd(args: argparse.Namespace) -> list[str]:
    if args.localtunnel_bin:
        cmd = [args.localtunnel_bin]
    elif is_command_available("lt"):
        cmd = ["lt"]
    elif is_command_available("localtunnel"):
        cmd = ["localtunnel"]
    else:
        cmd = ["npx", "--yes", "localtunnel"]
    cmd += ["--port", str(args.proxy_port)]
    if args.subdomain:
        cmd += ["--subdomain", args.subdomain]
    host = args.lt_host or DEFAULT_LT_HOST
    if host:
        cmd += ["--host", host]
    return cmd


def run(args: argparse.Namespace) -> int:
    require_command("caddy", "Install from https://caddyserver.com/docs/install")
    if not (is_command_available("lt") or is_command_available("localtunnel") or is_command_available("npx") or args.localtunnel_bin):
        raise RuntimeError("localtunnel requires 'npx' or a localtunnel binary (lt/localtunnel).")

    vite_origin = normalize_url(args.vite_url) if args.vite_url else f"http://{args.vite_host}:{args.vite_port}"
    proxy_url = f"http://127.0.0.1:{args.proxy_port}"

    if args.verify:
        sys.stdout.write(f"Checking Vite at {vite_origin} ...\n")
        if not wait_for_http_ok(vite_origin, args.timeout):
            raise RuntimeError(f"Vite not reachable at {vite_origin} within {args.timeout}s.")
        sys.stdout.write(f"Vite: {vite_origin} (OK)\n")
    else:
        sys.stdout.write(f"Vite: {vite_origin} (verify skipped)\n")

    if not is_port_free(args.proxy_port):
        raise RuntimeError(f"Port {args.proxy_port} is busy. Choose another via --proxy-port.")

    bcrypt, masked_pass = resolve_bcrypt(args)
    caddyfile_path = build_temp_caddyfile(args.auth_user, bcrypt, vite_origin, args.proxy_port)
    caddy_buf: Deque[str] = deque(maxlen=80)
    caddy_proc: subprocess.Popen | None = None
    lt_proc: subprocess.Popen | None = None
    lt_buf: Deque[str] = deque(maxlen=120)

    try:
        caddy_cmd = ["caddy", "run", "--config", caddyfile_path, "--adapter", "caddyfile"]
        caddy_proc = subprocess.Popen(
            caddy_cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
        )
        threading.Thread(
            target=stream_output,
            args=(caddy_proc, "caddy", caddy_buf, args.quiet, None),
            daemon=True,
        ).start()

        if not wait_for_status(proxy_url, expected_status=401, timeout=args.timeout, proc=caddy_proc):
            raise RuntimeError(
                f"Caddy proxy did not respond with 401 at {proxy_url}. "
                "Check port availability or auth config."
            )
        sys.stdout.write(f"Proxy (BasicAuth): {proxy_url} (401 expected)\n")
        sys.stdout.flush()

        lt_cmd = build_localtunnel_cmd(args)
        lt_proc = subprocess.Popen(
            lt_cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
        )

        tunnel_url: Optional[str] = None
        summary_printed = False

        def handle_lt_line(line: str) -> None:
            nonlocal tunnel_url, summary_printed
            found = LT_URL_RE.search(line)
            if tunnel_url is None and found:
                tunnel_url = found.group(0)
                sys.stdout.write(
                    "------ Tunnel ready ------\n"
                    f"Vite: {vite_origin} (OK)\n"
                    f"Proxy (BasicAuth): {proxy_url} (401 expected)\n"
                    f"Tunnel: {tunnel_url}\n"
                    f"Auth user: {args.auth_user}\n"
                    f"Auth pass: {masked_pass} (masked)\n"
                    "Press Ctrl+C to stop\n"
                )
                sys.stdout.flush()
                summary_printed = True

        threading.Thread(
            target=stream_output,
            args=(lt_proc, "localtunnel", lt_buf, args.quiet, handle_lt_line),
            daemon=True,
        ).start()

        tunnel_deadline = time.time() + max(args.timeout, 30)
        while tunnel_url is None and time.time() < tunnel_deadline:
            if lt_proc.poll() is not None:
                break
            time.sleep(0.5)

        if tunnel_url is None:
            error_tail = "\n".join(list(lt_buf)[-10:])
            if not error_tail.strip():
                raise RuntimeError(
                    "Timed out waiting for tunnel URL from localtunnel "
                    f"(>{max(args.timeout, 30)}s). Localtunnel did not output any lines. "
                    "Это обычно значит, что npx не смог скачать пакет или нет доступа к host localtunnel. "
                    "Попробуйте запустить вручную: `npx --yes localtunnel --port <proxy> --host https://loca.lt` "
                    "или укажите `--lt-host https://localtunnel.me`."
                )
            raise RuntimeError(
                "Timed out waiting for tunnel URL from localtunnel "
                f"(>{max(args.timeout, 30)}s). Last lines:\n{error_tail}"
            )

        if not summary_printed:
            sys.stdout.write(
                f"Tunnel: {tunnel_url}\n"
                f"Auth user: {args.auth_user}\n"
                f"Auth pass: {masked_pass} (masked)\n"
                "Press Ctrl+C to stop\n"
            )
            sys.stdout.flush()

        while True:
            if (lt_proc and lt_proc.poll() is not None) or (caddy_proc and caddy_proc.poll() is not None):
                break
            time.sleep(0.5)

    except KeyboardInterrupt:
        sys.stdout.write("\nCtrl+C received, shutting down...\n")
        sys.stdout.flush()
    finally:
        stop_process(lt_proc, "localtunnel", args.quiet)
        stop_process(caddy_proc, "caddy", args.quiet)
        if os.path.exists(caddyfile_path):
            try:
                os.remove(caddyfile_path)
            except Exception:
                if not args.quiet:
                    sys.stderr.write(f"Failed to remove temp file {caddyfile_path}\n")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Защищённый туннель для Vite (Caddy + localtunnel).")
    parser.add_argument("--vite-host", default="127.0.0.1", help="Хост Vite (по умолчанию 127.0.0.1)")
    parser.add_argument("--vite-port", type=int, default=5173, help="Порт Vite (по умолчанию 5173)")
    parser.add_argument("--vite-url", help="Полный URL Vite (переопределяет host/port).")
    parser.add_argument("--proxy-port", type=int, default=8080, help="Порт локального BasicAuth-прокси (по умолчанию 8080)")
    parser.add_argument("--auth-user", default="axiom", help="Имя пользователя BasicAuth (по умолчанию axiom)")
    parser.add_argument("--auth-pass", help="Пароль BasicAuth (опционально, предпочтительно через ENV).")
    parser.add_argument(
        "--auth-pass-env",
        default="AXIOM_TUNNEL_PASS",
        help="Имя переменной окружения для пароля (по умолчанию AXIOM_TUNNEL_PASS)",
    )
    parser.add_argument(
        "--auth-hash-file",
        help="Путь к файлу с bcrypt (пропускает ввод пароля/ENV).",
    )
    parser.add_argument(
        "--write-hash-file",
        action="store_true",
        help="Если хэш считан из пароля, сохранить bcrypt в файл (или путь по умолчанию).",
    )
    parser.add_argument(
        "--subdomain",
        help="Опциональный сабдомен localtunnel (может быть занят).",
    )
    parser.add_argument(
        "--lt-host",
        default=None,
        help="Переопределить host localtunnel (по умолчанию https://loca.lt).",
    )
    parser.add_argument(
        "--localtunnel-bin",
        help="Явный путь к бинарнику localtunnel (если не хотим npx).",
    )
    parser.add_argument(
        "--verify",
        type=parse_bool,
        nargs="?",
        const=True,
        default=True,
        help="Проверять доступность Vite перед стартом (по умолчанию true).",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=90,
        help="Таймаут (сек) проверки готовности Vite/прокси/URL (по умолчанию 90).",
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Меньше логов (ключевые сообщения остаются).",
    )
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    try:
        return run(args)
    except Exception as exc:  # noqa: BLE001
        sys.stderr.write(f"Error: {exc}\n")
        sys.stderr.flush()
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
