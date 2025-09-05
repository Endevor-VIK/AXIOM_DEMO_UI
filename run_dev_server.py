#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AXIOM PUBLIC DEMO UI — Local Dev Server (Python)

Запуск из папки-родителя, где лежит ./ui, ИЛИ из самой ./ui — скрипт сам определит корень.
Откроет браузер на http://localhost:<port>/ui/

Usage:
  python run_dev_server.py                 # порт 8080
  python run_dev_server.py -p 5500         # свой порт
  python run_dev_server.py --no-open       # без авто-открытия браузера
"""
from __future__ import annotations

import argparse
import http.client
import os
import socket
import threading
import time
import webbrowser
from pathlib import Path
from http.server import SimpleHTTPRequestHandler

try:  # Python 3.7+
    from http.server import ThreadingHTTPServer as HTTPServer
except Exception:  # very old Python
    from socketserver import TCPServer as HTTPServer  # type: ignore


def find_serve_root(script_dir: Path) -> Path:
    """Определяет, где лежит index.html и что сервить.
    - Если скрипт внутри ./ui  → сервим родителя.
    - Если скрипт рядом с ./ui → сервим текущую папку (родителя ui).
    """
    if (script_dir / 'index.html').exists():  # внутри ./ui
        return script_dir.parent
    if (script_dir / 'ui' / 'index.html').exists():  # рядом с ./ui
        return script_dir
    raise SystemExit("[AXIOM] Не найден ui/index.html рядом со скриптом. Положи файл в родителя ui или внутрь ui.")


def pick_free_port(start_port: int, host: str = '127.0.0.1') -> int:
    port = int(start_port)
    while True:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        try:
            s.bind((host, port))
            return port
        except OSError:
            port += 1
        finally:
            s.close()


def wait_http_ready(url: str, tries: int = 60, delay: float = 0.25) -> bool:
    from urllib.parse import urlparse

    u = urlparse(url)
    host = u.hostname or 'localhost'
    port = u.port or 80
    path = u.path or '/'

    for _ in range(tries):
        try:
            conn = http.client.HTTPConnection(host, port, timeout=0.8)
            conn.request('HEAD', path)
            resp = conn.getresponse()
            if 200 <= resp.status < 500:
                return True
        except Exception:
            pass
        finally:
            try:
                conn.close()
            except Exception:
                pass
        time.sleep(delay)
    return False


def build_handler(serve_root: Path):
    """Создаёт класс-обработчик с отключённым кэшированием и заданной директорией.
    Совместим с Python 3.13 (без partial при наследовании).
    """

    class NoCacheHandler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            # Аргумент directory поддерживается в Python 3.7+.
            super().__init__(*args, directory=str(serve_root), **kwargs)

        def end_headers(self):
            self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
            super().end_headers()

    return NoCacheHandler


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog='run_dev_server', description='AXIOM Demo UI — local dev server')
    parser.add_argument('-p', '--port', type=int, default=8080, help='порт (по умолчанию 8080)')
    parser.add_argument('--host', default='127.0.0.1', help='хост для бинда (по умолчанию 127.0.0.1)')
    parser.add_argument('--no-open', action='store_true', help='не открывать браузер автоматически')
    args = parser.parse_args(argv)

    script_dir = Path(__file__).resolve().parent
    serve_root = find_serve_root(script_dir)

    port = pick_free_port(args.port, host=args.host)
    open_url = f"http://localhost:{port}/ui/"

    HandlerCls = build_handler(serve_root)
    httpd = HTTPServer((args.host, port), HandlerCls)

    print(f"[AXIOM] Serving: {serve_root}")
    print(f"[AXIOM] URL:     {open_url}")
    print("[AXIOM] Stop:    Ctrl+C")

    if not args.no_open:
        def _open_when_ready():
            if wait_http_ready(open_url):
                webbrowser.open(open_url)
        threading.Thread(target=_open_when_ready, daemon=True).start()

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()
        print("[AXIOM] Server stopped.")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
