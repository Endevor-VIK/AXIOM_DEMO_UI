#!/usr/bin/env python3
"""
Wrapper to auto-start Vite (run_local.py) and then tunnel (run_tunnel_dev.py) with stored bcrypt.

Flow:
- Optionally reuse already running Vite (default true).
- If not running, start run_local.py and wait for readiness.
- Start run_tunnel_dev.py with provided flags (hash file/default hash path supported).
- Graceful shutdown on Ctrl+C: stop tunnel first, then dev server.
"""

from __future__ import annotations

import argparse
import os
import signal
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
from typing import Optional

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
RUN_LOCAL = os.path.join(SCRIPT_DIR, "run_local.py")
RUN_TUNNEL = os.path.join(SCRIPT_DIR, "run_tunnel_dev.py")


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


def stream_output(proc: subprocess.Popen, label: str, quiet: bool) -> None:
    if proc.stdout is None:
        return
    for line in proc.stdout:
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
    if args.protocol:
        cmd += ["--protocol", args.protocol]
    if args.edge_ip_version:
        cmd += ["--edge-ip-version", str(args.edge_ip_version)]
    if args.no_autoupdate is not None:
        cmd += ["--no-autoupdate", "true" if args.no_autoupdate else "false"]
    if args.tunnel_url:
        cmd += ["--tunnel-url", args.tunnel_url]
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
        args=(proc, "dev", quiet),
        daemon=True,
    ).start()
    return proc


def start_tunnel(cmd: list[str], quiet: bool) -> subprocess.Popen:
    proc = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )
    threading.Thread(
        target=stream_output,
        args=(proc, "tunnel", quiet),
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


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Auto-start Vite (run_local) then tunnel (run_tunnel_dev).")
    parser.add_argument("--vite-host", default="127.0.0.1", help="Vite host (default: 127.0.0.1)")
    parser.add_argument("--vite-port", type=int, default=5173, help="Vite port (default: 5173)")
    parser.add_argument("--vite-url", help="Full Vite URL; if set, overrides host/port.")
    parser.add_argument("--proxy-port", type=int, default=8080, help="Proxy port for tunnel (default: 8080)")
    parser.add_argument("--auth-user", default="axiom", help="BasicAuth username (default: axiom)")
    parser.add_argument("--auth-pass", help="Plain password (optional; prefer env/hash file).")
    parser.add_argument("--auth-pass-env", default="AXIOM_TUNNEL_PASS", help="Env var for password (default: AXIOM_TUNNEL_PASS)")
    parser.add_argument("--auth-hash-file", help="Path to bcrypt hash file (default: auto in run_tunnel_dev).")
    parser.add_argument("--write-hash-file", action="store_true", help="Persist generated bcrypt to hash file when hashing from password.")
    parser.add_argument("--protocol", default="http2", help="cloudflared protocol (default: http2)")
    parser.add_argument("--edge-ip-version", default="4", help="cloudflared edge IP version (default: 4)")
    parser.add_argument("--no-autoupdate", type=parse_bool, nargs="?", const=True, default=True, help="Pass --no-autoupdate to cloudflared (default: true)")
    parser.add_argument("--tunnel-url", help="Override tunnel target (default: local proxy).")
    parser.add_argument("--verify", type=parse_bool, nargs="?", const=True, default=True, help="Verify Vite before tunnel (default: true)")
    parser.add_argument("--timeout", type=int, default=30, help="Timeout for Vite readiness check (seconds, default: 30)")
    parser.add_argument("--reuse-if-running", action="store_true", default=True, help="If Vite already responds, skip spawning run_local.py (default: true)")
    parser.add_argument("--quiet", action="store_true", help="Reduce log noise (prefixes remain).")
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    vite_url = args.vite_url or f"http://{args.vite_host}:{args.vite_port}/"
    env = os.environ.copy()

    dev_proc: Optional[subprocess.Popen] = None
    tunnel_proc: Optional[subprocess.Popen] = None

    try:
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
        tunnel_proc = start_tunnel(tunnel_cmd, args.quiet)
        if not args.quiet:
            sys.stdout.write(f"Started tunnel: {' '.join(tunnel_cmd)}\n")
        # Wait while processes alive
        while True:
            if tunnel_proc.poll() is not None:
                if tunnel_proc.returncode not in (0, None):
                    raise RuntimeError(f"Tunnel exited with code {tunnel_proc.returncode}")
                break
            time.sleep(0.5)
    except KeyboardInterrupt:
        sys.stdout.write("\nCtrl+C received, shutting down...\n")
    finally:
        stop_process(tunnel_proc, "tunnel")
        stop_process(dev_proc, "run_local")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
