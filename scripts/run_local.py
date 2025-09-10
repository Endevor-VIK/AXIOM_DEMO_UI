#!/usr/bin/env python3
"""
Lightweight local runner with robust readiness wait.

Usage:
  python scripts/run_local.py

Environment:
  PORT           Dev server port (default: 5173)
  HOST           Host to probe (default: 127.0.0.1)

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

    # Choose platform-appropriate npm executable
    npm = 'npm.cmd' if os.name == 'nt' else 'npm'

    # Start dev server
    proc = subprocess.Popen(
        [npm, 'run', 'dev'],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        env=os.environ.copy(),
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

