#!/usr/bin/env python3
"""
Lightweight local runner with robust readiness wait.

Usage:
  python scripts/run_local.py

Environment:
  PORT           Dev server port (default: 5173)
  HOST           Host to probe (default: 127.0.0.1)
  DEV_HOST       Host for Vite server (auto 0.0.0.0 on WSL)
  SKIP_WSL_PORTPROXY  Disable auto netsh portproxy setup on WSL

Notes:
  - Uses HEAD requests with backoff to avoid early timeouts.
  - Cross-platform npm dev spawn (npm.cmd on Windows).
"""

from __future__ import annotations

import os
import sys
import time
import signal
import urllib.request
import subprocess


def is_wsl() -> bool:
    """Detect WSL2 environment."""
    try:
        return 'microsoft' in os.uname().release.lower()
    except Exception:
        return False


def wsl_ip() -> str | None:
    """Best-effort primary WSL IPv4 address."""
    try:
        out = subprocess.check_output(['hostname', '-I'], text=True).strip().split()
        return out[0] if out else None
    except Exception:
        return None


def ensure_windows_localhost(port: int, target_ip: str) -> None:
    """
    Create a Windows portproxy so localhost:<port> reaches the WSL IP.

    Some hosts disable automatic mirroring; this mirrors explicitly via netsh.
    """
    netsh = '/mnt/c/Windows/System32/netsh.exe'
    if not os.path.exists(netsh):
        return

    delete_cmd = [
        netsh,
        'interface',
        'portproxy',
        'delete',
        'v4tov4',
        f'listenport={port}',
        'listenaddress=127.0.0.1',
    ]
    add_cmd = [
        netsh,
        'interface',
        'portproxy',
        'add',
        'v4tov4',
        f'listenport={port}',
        'listenaddress=127.0.0.1',
        f'connectport={port}',
        f'connectaddress={target_ip}',
    ]

    subprocess.run(delete_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    res = subprocess.run(add_cmd, capture_output=True, text=True)
    if res.returncode == 0:
        print(f"WSL portproxy: Windows localhost:{port} → {target_ip}:{port}", flush=True)
    else:
        sys.stderr.write(
            "WSL portproxy failed (needs admin). "
            f"Use http://{target_ip}:{port}/ or run netsh manually.\n"
        )
        sys.stderr.flush()


def wait_for_http(url: str, attempts: int = 40) -> bool:
    """Probe URL with HEAD requests, up to N attempts with small backoff."""
    for i in range(attempts):
        try:
            req = urllib.request.Request(url, method='HEAD')
            with urllib.request.urlopen(req, timeout=8) as resp:
                if 200 <= resp.status < 400:
                    return True
        except Exception:
            pass
        time.sleep(0.5 + i * 0.02)
    return False


def main() -> int:
    port = int(os.environ.get('PORT') or 5173)
    host = os.environ.get('HOST') or '127.0.0.1'
    url = f"http://{host}:{port}/"

    env = os.environ.copy()

    # In WSL, explicitly mirror to Windows localhost if possible
    if is_wsl() and not env.get('SKIP_WSL_PORTPROXY'):
        env.setdefault('DEV_HOST', '0.0.0.0')
        ip = wsl_ip()
        if ip:
            ensure_windows_localhost(port, ip)

    # Choose platform-appropriate npm executable
    npm = 'npm.cmd' if os.name == 'nt' else 'npm'

    # Start dev server
    proc = subprocess.Popen(
        [npm, 'run', 'dev'],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        env=env,
    )

    print(f"Dev server starting (PID {proc.pid}). Waiting for {url} ...", flush=True)

    # Stream early output while waiting, to aid debugging
    ready = False
    start = time.time()
    while True:
        if proc.poll() is not None:
            # Server exited early
            sys.stdout.write("\n[dev] exited early with code %s\n" % proc.returncode)
            sys.stdout.flush()
            break

        # Interleave readiness probe and log streaming
        if not ready and wait_for_http(url, attempts=1):
            ready = True
            elapsed = time.time() - start
            print(f"Ready in {elapsed:.1f}s → {url}", flush=True)
            # continue streaming logs

        # Stream any available lines without blocking too long
        if proc.stdout is not None:
            line = proc.stdout.readline()
            if line:
                sys.stdout.write(line)
                sys.stdout.flush()
        
        if ready:
            # After ready, just stream output until interrupted
            time.sleep(0.1)
        else:
            # Not ready yet, small wait before next probe
            time.sleep(0.2)

        # Give up if it takes too long (hard cap ~40 attempts * ~0.7s ≈ 28s)
        if not ready and (time.time() - start) > 30:
            print("Timeout waiting for dev server.", flush=True)
            break

    # Ensure process is terminated when we exit
    try:
        if proc.poll() is None:
            if os.name == 'nt':
                proc.terminate()
            else:
                proc.send_signal(signal.SIGINT)
                time.sleep(0.5)
                if proc.poll() is None:
                    proc.terminate()
    except Exception:
        pass

    return 0


if __name__ == '__main__':
    raise SystemExit(main())
