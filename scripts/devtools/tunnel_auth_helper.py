#!/usr/bin/env python3
"""
Хелпер для аутентификации туннеля: генерирует/хранит bcrypt в безопасном пути.

Примеры:
  # Сгенерировать bcrypt из пароля через caddy и сохранить в путь по умолчанию
  AXIOM_TUNNEL_PASS='MyPass' python3 scripts/devtools/tunnel_auth_helper.py init

  # Сохранить уже готовый bcrypt (без вызова caddy)
  python3 scripts/devtools/tunnel_auth_helper.py init --auth-hash "$2a$14$...."

  # Показать путь хранения bcrypt
  python3 scripts/devtools/tunnel_auth_helper.py show-path
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys

DEFAULT_HASH_PATH = os.path.expanduser(
    os.environ.get("AXIOM_TUNNEL_HASH_FILE", "~/.axiom_tunnel_dev/auth.bcrypt")
)


def is_command_available(cmd: str) -> bool:
    from shutil import which

    return which(cmd) is not None


def caddy_hash_password(plaintext: str) -> str:
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
    raise RuntimeError(f"Could not parse bcrypt from caddy output:\n{output}")


def init_hash(args: argparse.Namespace) -> None:
    os.makedirs(os.path.dirname(args.path), exist_ok=True)
    if args.auth_hash:
        bcrypt = args.auth_hash.strip()
    else:
        password = args.auth_pass or os.environ.get(args.auth_pass_env)
        if not password:
            raise SystemExit(f"Provide password via --auth-pass or env {args.auth_pass_env}")
        if not is_command_available("caddy"):
            raise SystemExit("caddy is required to generate bcrypt (caddy hash-password).")
        bcrypt = caddy_hash_password(password)
    with open(args.path, "w", encoding="utf-8") as fh:
        fh.write(bcrypt + "\n")
    sys.stdout.write(f"Stored bcrypt at {args.path}\n")
    sys.stdout.flush()


def show_path(args: argparse.Namespace) -> None:
    sys.stdout.write(f"Default bcrypt path: {args.path}\n")
    sys.stdout.flush()


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Хелпер для bcrypt: генерация/сохранение хэша для туннеля.")
    sub = parser.add_subparsers(dest="cmd", required=True)

    init_p = sub.add_parser("init", help="Сгенерировать или записать готовый bcrypt в файл.")
    init_p.add_argument(
        "--path",
        default=DEFAULT_HASH_PATH,
        help=f"Путь для хранения bcrypt (по умолчанию {DEFAULT_HASH_PATH})",
    )
    init_p.add_argument(
        "--auth-pass",
        help="Пароль в открытом виде (если не указан, берётся из ENV).",
    )
    init_p.add_argument(
        "--auth-pass-env",
        default="AXIOM_TUNNEL_PASS",
        help="Имя переменной окружения с паролем (по умолчанию AXIOM_TUNNEL_PASS).",
    )
    init_p.add_argument(
        "--auth-hash",
        help="Указать готовый bcrypt (пропускает caddy hash-password).",
    )

    show_p = sub.add_parser("show-path", help="Показать путь хранения bcrypt по умолчанию.")
    show_p.add_argument(
        "--path",
        default=DEFAULT_HASH_PATH,
        help=f"Путь для вывода (по умолчанию {DEFAULT_HASH_PATH})",
    )

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    if args.cmd == "init":
        init_hash(args)
    elif args.cmd == "show-path":
        show_path(args)
    else:
        parser.error("Unknown command")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
