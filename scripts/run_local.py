#!/usr/bin/env python3
"""
AXIOM_DEMO_UI — local launcher

Starts Vite in selected mode and opens the browser when the server is ready.

Usage examples:
  python scripts/run_local.py                # dev on http://localhost:5173
  python scripts/run_local.py --mode export  # preview export on http://localhost:5174
  python scripts/run_local.py --mode preview --port 5178
"""

import argparse
import os
import sys
import time
import subprocess
import webbrowser
from urllib.request import urlopen
from urllib.error import URLError


def wait_for_http(url: str, timeout: float = 60.0, interval: float = 0.5) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with urlopen(url, timeout=2) as resp:  # noqa: S310 (stdlib only)
                if 200 <= resp.status < 500:
                    return True
        except URLError:
            pass
        time.sleep(interval)
    return False


def main() -> int:
    parser = argparse.ArgumentParser(description="Run local dev/preview and open browser")
    parser.add_argument("--mode", choices=["dev", "preview", "export"], default="dev")
    parser.add_argument("--port", type=int, default=0)
    parser.add_argument("--host", default="localhost")
    parser.add_argument("--no-open", action="store_true", help="do not open a browser")
    args = parser.parse_args()

    # Defaults per mode
    default_ports = {"dev": 5173, "preview": 5173, "export": 5174}
    port = args.port or default_ports[args.mode]

    # Compose command
    if args.mode == "dev":
        cmd = ["npm", "run", "dev", "--", "--strictPort", "--port", str(port)]
    elif args.mode == "preview":
        cmd = ["npm", "run", "preview", "--", "--strictPort", "--port", str(port)]
    else:  # export
        cmd = ["npm", "run", "preview:export", "--", "--strictPort", "--port", str(port)]

    print(f"[run_local] starting: {' '.join(cmd)}")
    proc = subprocess.Popen(cmd, env=os.environ)

    url = f"http://{args.host}:{port}/"
    print(f"[run_local] waiting for {url} ...")
    ready = wait_for_http(url)
    if ready:
        print(f"[run_local] server is up at {url}")
        if not args.no_open:
            print("[run_local] opening default browser…")
            try:
                webbrowser.open(url)
            except Exception as e:  # noqa: BLE001
                print(f"[run_local] failed to open browser: {e}")
    else:
        print("[run_local] server did not respond in time. Check console output.")

    try:
        proc.wait()
        return proc.returncode or 0
    except KeyboardInterrupt:
        print("\n[run_local] stopping…")
        try:
            proc.terminate()
        except Exception:
            pass
        return 0


if __name__ == "__main__":
    sys.exit(main())

