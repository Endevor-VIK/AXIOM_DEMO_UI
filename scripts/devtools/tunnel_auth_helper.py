#!/usr/bin/env python3
"""
Хелпер для аутентификации туннеля: генерирует/хранит/удаляет bcrypt в безопасном пути.

Примеры:
  # Меню управления (создание/замена/удаление/показ пути)
  python3 scripts/devtools/tunnel_auth_helper.py menu

  # Сгенерировать bcrypt из пароля через caddy и сохранить в путь по умолчанию
  AXIOM_TUNNEL_PASS='MyPass' python3 scripts/devtools/tunnel_auth_helper.py init

  # Сохранить уже готовый bcrypt (без вызова caddy)
  python3 scripts/devtools/tunnel_auth_helper.py init --auth-hash "$2a$14$...."

  # Показать путь хранения bcrypt
  python3 scripts/devtools/tunnel_auth_helper.py show-path
"""

from __future__ import annotations

import argparse
import getpass
import os
import subprocess
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DATA_DIR = os.path.join(SCRIPT_DIR, "data")
DEFAULT_HASH_PATH = os.path.expanduser(
    os.environ.get("AXIOM_TUNNEL_HASH_FILE", os.path.join(DEFAULT_DATA_DIR, "auth.bcrypt"))
)


def is_command_available(cmd: str) -> bool:
    from shutil import which

    return which(cmd) is not None


def ensure_data_dir(path: str) -> None:
    """Создать директорию для хранения хэша, если её нет."""
    directory = os.path.dirname(path)
    if directory:
        os.makedirs(directory, exist_ok=True)


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
    ensure_data_dir(args.path)
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


def prompt_password() -> str:
    """Безопасный ввод пароля с подтверждением."""
    pwd1 = getpass.getpass("Введите пароль: ")
    pwd2 = getpass.getpass("Повторите пароль: ")
    if pwd1 != pwd2:
        raise SystemExit("Пароли не совпадают, повторите попытку.")
    if not pwd1:
        raise SystemExit("Пароль не может быть пустым.")
    return pwd1


def delete_hash(path: str) -> None:
    if os.path.exists(path):
        os.remove(path)
        sys.stdout.write(f"Удалён файл хэша: {path}\n")
    else:
        sys.stdout.write("Файл хэша не найден, удалять нечего.\n")
    sys.stdout.flush()


def menu(args: argparse.Namespace) -> None:
    path = args.path or DEFAULT_HASH_PATH
    ensure_data_dir(path)
    while True:
        sys.stdout.write(
            "\n[tunnel-auth-helper]\n"
            "1) Создать/обновить хэш (ввести пароль)\n"
            "2) Записать готовый bcrypt\n"
            "3) Удалить текущий хэш\n"
            "4) Показать путь хэша\n"
            "0) Выход\n"
            "Выберите действие: "
        )
        sys.stdout.flush()
        choice = sys.stdin.readline().strip()

        if choice == "1":
            password = prompt_password()
            if not is_command_available("caddy"):
                sys.stderr.write("Нужен установленный caddy для генерации bcrypt.\n")
                continue
            bcrypt = caddy_hash_password(password)
            ensure_data_dir(path)
            with open(path, "w", encoding="utf-8") as fh:
                fh.write(bcrypt + "\n")
            sys.stdout.write(f"Сохранён новый bcrypt в {path}\n")
            sys.stdout.flush()
        elif choice == "2":
            sys.stdout.write("Вставьте готовый bcrypt: ")
            sys.stdout.flush()
            bcrypt = sys.stdin.readline().strip()
            if not bcrypt.startswith("$2"):
                sys.stderr.write("Похоже, строка не похожа на bcrypt. Проверьте ввод.\n")
                continue
            ensure_data_dir(path)
            with open(path, "w", encoding="utf-8") as fh:
                fh.write(bcrypt + "\n")
            sys.stdout.write(f"Сохранён bcrypt в {path}\n")
            sys.stdout.flush()
        elif choice == "3":
            delete_hash(path)
        elif choice == "4":
            sys.stdout.write(f"Текущий путь: {path}\n")
            if os.path.exists(path):
                sys.stdout.write("Файл существует.\n")
            else:
                sys.stdout.write("Файл пока не создан.\n")
            sys.stdout.flush()
        elif choice == "0":
            sys.stdout.write("Выход.\n")
            sys.stdout.flush()
            break
        else:
            sys.stdout.write("Неизвестный выбор, повторите.\n")


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

    menu_p = sub.add_parser("menu", help="Интерактивное меню (создать/заменить/удалить хэш).")
    menu_p.add_argument(
        "--path",
        default=DEFAULT_HASH_PATH,
        help=f"Путь для хранения bcrypt (по умолчанию {DEFAULT_HASH_PATH})",
    )

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    if args.cmd == "init":
        init_hash(args)
    elif args.cmd == "show-path":
        show_path(args)
    elif args.cmd == "menu":
        menu(args)
    else:
        parser.error("Unknown command")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
