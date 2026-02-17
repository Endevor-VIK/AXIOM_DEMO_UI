#!/usr/bin/env python3
"""
Интерактивная обёртка: автоматически стартует Vite (run_local.py), ждёт готовности и запускает туннель (run_tunnel_dev.py).

Поток выполнения:
- Переиспользует уже работающий Vite (по умолчанию), иначе запускает run_local.py и ждёт готовности.
- Затем стартует run_tunnel_dev.py с нужными флагами (по умолчанию без BasicAuth).
- По Ctrl+C корректно гасит туннель, потом dev-сервер.
- Если запустить без аргументов — откроется меню с типовыми действиями.
"""

from __future__ import annotations

import argparse
import os
import re
import signal
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
from typing import Callable, Optional

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
RUN_LOCAL = os.path.join(SCRIPT_DIR, "run_local.py")
RUN_TUNNEL = os.path.join(SCRIPT_DIR, "run_tunnel_dev.py")
DEFAULT_LT_HOST = os.environ.get("AXIOM_TUNNEL_LT_HOST", "auto")
LT_URL_RE = re.compile(r"https://[A-Za-z0-9-]+\.(?:loca\.lt|localtunnel\.me)")


def wait_for_http_ok(url: str, timeout: int) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            req = urllib.request.Request(url, method="GET")
            with urllib.request.urlopen(req, timeout=5) as resp:
                if 200 <= resp.status < 400:
                    return True
        except urllib.error.HTTPError as err:
            if 200 <= err.code < 400:
                return True
        except Exception:
            pass
        time.sleep(1)
    return False


def stream_output(proc: subprocess.Popen, label: str, quiet: bool, on_line: Callable[[str], None] | None = None) -> None:
    if proc.stdout is None:
        return
    for line in proc.stdout:
        if on_line:
            on_line(line.rstrip("\n"))
        if not quiet:
            sys.stdout.write(f"[{label}] {line}")
            sys.stdout.flush()


def stop_process(proc: subprocess.Popen | None, name: str) -> None:
    if proc is None or proc.poll() is not None:
        return
    for sig in (signal.SIGINT, signal.SIGTERM):
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
        pass


def is_port_free(port: int, host: str = "127.0.0.1") -> bool:
    import socket

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            sock.bind((host, port))
        except OSError:
            return False
    return True


def find_free_port(preferred: int, attempts: int = 10) -> int:
    """Найти свободный порт, начиная с preferred и инкрементируя."""
    port = preferred
    for _ in range(attempts):
        if is_port_free(port):
            return port
        port += 1
    raise RuntimeError("Не удалось подобрать свободный порт для прокси.")


def build_tunnel_cmd(args: argparse.Namespace) -> list[str]:
    cmd = [sys.executable, RUN_TUNNEL]
    if args.vite_host:
        cmd += ["--vite-host", args.vite_host]
    if args.vite_port:
        cmd += ["--vite-port", str(args.vite_port)]
    if args.vite_url:
        cmd += ["--vite-url", args.vite_url]
    if args.proxy_port:
        cmd += ["--proxy-port", str(args.proxy_port)]
    if args.basic_auth is not None:
        cmd += ["--basic-auth", "true" if args.basic_auth else "false"]
    if args.auth_user:
        cmd += ["--auth-user", args.auth_user]
    if args.auth_pass:
        cmd += ["--auth-pass", args.auth_pass]
    if args.auth_pass_env:
        cmd += ["--auth-pass-env", args.auth_pass_env]
    if args.auth_hash_file:
        cmd += ["--auth-hash-file", args.auth_hash_file]
    if args.write_hash_file:
        cmd.append("--write-hash-file")
    if args.subdomain:
        cmd += ["--subdomain", args.subdomain]
    if args.lt_host and args.lt_host.strip().lower() != "auto":
        cmd += ["--lt-host", args.lt_host]
    if args.localtunnel_bin:
        cmd += ["--localtunnel-bin", args.localtunnel_bin]
    if args.verify is not None:
        cmd += ["--verify", "true" if args.verify else "false"]
    if args.timeout:
        cmd += ["--timeout", str(args.timeout)]
    if args.quiet:
        cmd.append("--quiet")
    return cmd


def start_run_local(env: dict[str, str], quiet: bool) -> subprocess.Popen:
    proc = subprocess.Popen(
        [sys.executable, RUN_LOCAL],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        env=env,
    )
    threading.Thread(
        target=stream_output,
        args=(proc, "dev", quiet, None),
        daemon=True,
    ).start()
    return proc


def start_tunnel(cmd: list[str], quiet: bool, on_line: Callable[[str], None] | None = None) -> subprocess.Popen:
    proc = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )
    threading.Thread(
        target=stream_output,
        args=(proc, "tunnel", quiet, on_line),
        daemon=True,
    ).start()
    return proc


def parse_bool(value: str) -> bool:
    val = value.strip().lower()
    if val in {"1", "true", "yes", "y", "on"}:
        return True
    if val in {"0", "false", "no", "n", "off"}:
        return False
    raise argparse.ArgumentTypeError(f"Expected boolean, got '{value}'")


def prompt_default(prompt: str, default: str) -> str:
    sys.stdout.write(f"{prompt} [{default}]: ")
    sys.stdout.flush()
    val = sys.stdin.readline().strip()
    return val or default


def prompt_int(prompt: str, default: int) -> int:
    val = prompt_default(prompt, str(default))
    try:
        return int(val)
    except ValueError:
        sys.stdout.write("Некорректное число, использую значение по умолчанию.\n")
        sys.stdout.flush()
        return default


def prompt_bool(prompt: str, default: bool) -> bool:
    default_str = "Y/n" if default else "y/N"
    sys.stdout.write(f"{prompt} ({default_str}): ")
    sys.stdout.flush()
    val = sys.stdin.readline().strip().lower()
    if not val:
        return default
    return val in {"y", "yes", "1", "true", "on"}


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Авто-старт Vite (run_local) и туннеля (localtunnel).")
    parser.add_argument("--vite-host", default="127.0.0.1", help="Хост Vite (по умолчанию 127.0.0.1)")
    parser.add_argument("--vite-port", type=int, default=5173, help="Порт Vite (по умолчанию 5173)")
    parser.add_argument("--vite-url", help="Полный URL Vite; если указан, переопределяет host/port.")
    parser.add_argument("--proxy-port", type=int, default=8080, help="Порт прокси для туннеля (по умолчанию 8080)")
    parser.add_argument("--basic-auth", type=parse_bool, nargs="?", const=True, default=False, help="Включить BasicAuth на прокси (по умолчанию false)")
    parser.add_argument("--auth-user", default="axiom", help="Имя пользователя BasicAuth (если --basic-auth=true)")
    parser.add_argument("--auth-pass", help="Пароль BasicAuth в открытом виде (если --basic-auth=true)")
    parser.add_argument("--auth-pass-env", default="AXIOM_TUNNEL_PASS", help="Имя ENV с паролем BasicAuth (если --basic-auth=true)")
    parser.add_argument("--auth-hash-file", help="Путь к файлу bcrypt (если --basic-auth=true)")
    parser.add_argument("--write-hash-file", action="store_true", help="Сохранять сгенерированный bcrypt в файл (если --basic-auth=true)")
    parser.add_argument("--subdomain", help="Опциональный сабдомен localtunnel (может быть занят).")
    parser.add_argument(
        "--lt-host",
        default=DEFAULT_LT_HOST,
        help="Host localtunnel или 'auto' для fallback-цепочки (по умолчанию auto).",
    )
    parser.add_argument("--localtunnel-bin", help="Явный путь к бинарнику localtunnel (если не хотим npx).")
    parser.add_argument("--verify", type=parse_bool, nargs="?", const=True, default=True, help="Проверять Vite перед туннелем (по умолчанию true)")
    parser.add_argument("--timeout", type=int, default=90, help="Таймаут ожидания готовности Vite (сек, по умолчанию 90)")
    parser.add_argument("--reuse-if-running", type=parse_bool, nargs="?", const=True, default=True, help="Если Vite уже отвечает, не запускать run_local.py (по умолчанию true)")
    parser.add_argument("--quiet", action="store_true", help="Меньше логов (префиксы сохраняются).")
    return parser


def run_with_args(args: argparse.Namespace) -> int:
    vite_url = args.vite_url or f"http://{args.vite_host}:{args.vite_port}/"
    env = os.environ.copy()

    dev_proc: Optional[subprocess.Popen] = None
    tunnel_proc: Optional[subprocess.Popen] = None
    tunnel_url: str | None = None

    def handle_tunnel_line(line: str) -> None:
        nonlocal tunnel_url
        found = LT_URL_RE.search(line)
        if found and tunnel_url is None:
            tunnel_url = found.group(0)
            if not args.quiet:
                sys.stdout.write(
                    "\n------ Tunnel ready (auto) ------\n"
                    f"Vite: {vite_url}\n"
                    f"Proxy: http://127.0.0.1:{args.proxy_port} "
                    f"({'BasicAuth 401 expected' if args.basic_auth else 'no auth'})\n"
                    f"Tunnel: {tunnel_url}\n"
                    f"{'Auth user: ' + args.auth_user if args.basic_auth else 'BasicAuth: disabled'}\n"
                    "Отдай публичный URL пользователю.\n"
                )
                sys.stdout.flush()

    try:
        if not is_port_free(args.proxy_port):
            new_port = find_free_port(args.proxy_port + 1)
            if not args.quiet:
                sys.stdout.write(
                    f"Proxy port {args.proxy_port} занят, переключаюсь на {new_port}\n"
                )
            args.proxy_port = new_port

        if args.reuse_if_running and wait_for_http_ok(vite_url, timeout=3):
            if not args.quiet:
                sys.stdout.write(f"Vite already running at {vite_url}; skipping run_local.py\n")
        else:
            dev_proc = start_run_local(env, args.quiet)
            if not args.quiet:
                sys.stdout.write(f"Started run_local.py (PID {dev_proc.pid}), waiting for {vite_url}\n")
            if not wait_for_http_ok(vite_url, timeout=args.timeout):
                raise RuntimeError(f"Vite not reachable at {vite_url} within {args.timeout}s (run_local).")
            if not args.quiet:
                sys.stdout.write(f"Vite: {vite_url} (OK)\n")

        tunnel_cmd = build_tunnel_cmd(args)
        tunnel_proc = start_tunnel(tunnel_cmd, args.quiet, on_line=handle_tunnel_line)
        if not args.quiet:
            sys.stdout.write(f"Started tunnel: {' '.join(tunnel_cmd)}\n")

        while True:
            if tunnel_proc.poll() is not None:
                if tunnel_proc.returncode not in (0, None):
                    raise RuntimeError(
                        f"Tunnel exited with code {tunnel_proc.returncode}. "
                        "Проверьте порт прокси (--proxy-port) или настройки localtunnel."
                    )
                break
            time.sleep(0.5)
    except KeyboardInterrupt:
        sys.stdout.write("\nCtrl+C received, shutting down...\n")
        return 1
    except Exception as exc:  # noqa: BLE001
        sys.stderr.write(f"Error: {exc}\n")
        return 1
    finally:
        stop_process(tunnel_proc, "tunnel")
        stop_process(dev_proc, "run_local")
    return 0


def interactive_menu(default_args: argparse.Namespace) -> None:
    sys.stdout.write(
        "\n[run_tunnel_dev_auto — меню]\n"
        "1) Быстрый старт без BasicAuth (reuse Vite, verify=true)\n"
        "2) Кастомный старт (порты/режим BasicAuth)\n"
        "0) Выход\n"
        "Выберите действие: "
    )
    sys.stdout.flush()
    choice = sys.stdin.readline().strip()

    if choice == "0":
        sys.stdout.write("Выход.\n")
        sys.stdout.flush()
        return

    args = argparse.Namespace(**vars(default_args))

    if choice == "2":
        args.vite_host = prompt_default("Vite host", args.vite_host)
        args.vite_port = prompt_int("Vite port", args.vite_port)
        args.proxy_port = prompt_int("Proxy port", args.proxy_port)
        args.basic_auth = prompt_bool("Включить BasicAuth (браузерный логин/пароль)", args.basic_auth)
        if args.basic_auth:
            hash_path = prompt_default(
                "Путь к bcrypt-файлу (опционально; Enter = не использовать)",
                args.auth_hash_file or "",
            )
            args.auth_hash_file = hash_path.strip() or None
        else:
            args.auth_hash_file = None
        args.subdomain = prompt_default("Сабдомен localtunnel (опционально)", args.subdomain or "") or None
        args.verify = prompt_bool("Проверять Vite перед стартом (verify)", True)
        args.reuse_if_running = prompt_bool("Переиспользовать уже запущенный Vite", True)
        args.quiet = not prompt_bool("Подробный вывод (Y = подробно, N = тише)", True)
    else:
        args.basic_auth = False
        args.auth_hash_file = None

    rc = run_with_args(args)
    if rc != 0:
        sys.stdout.write("\nСтарт не удался. Частая причина: порт прокси занят (попробуйте 8081 или другой).\n")
        sys.stdout.flush()


def main() -> int:
    parser = build_parser()
    if len(sys.argv) == 1:
        default_args = parser.parse_args([])
        interactive_menu(default_args=default_args)
        return 0

    args = parser.parse_args()
    return run_with_args(args)


if __name__ == "__main__":
    raise SystemExit(main())
