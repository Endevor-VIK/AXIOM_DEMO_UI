# TUNNEL_DEV_README — Protected Quick Tunnel for Vite

Dev helper that wraps Caddy (BasicAuth) and Cloudflare Quick Tunnel around an already running Vite dev server.

## Prerequisites
- Vite dev server running separately (e.g. `python3 scripts/run_local.py` or `npm run dev`) on `http://127.0.0.1:5173` by default.
- `cloudflared` installed and on PATH (`cloudflared --version`).
- `caddy` installed and on PATH (`caddy version`).
- Set a password via env (default env var: `AXIOM_TUNNEL_PASS`) or `--auth-pass`. Do **not** commit secrets.

## Quick start
1) Start Vite: `python3 scripts/run_local.py` (or equivalent).  
2) Export password: `export AXIOM_TUNNEL_PASS='StrongPassHere'`.  
3) Run tunnel: `python3 scripts/run_tunnel_dev.py`.  
4) Wait for output:
   - `Vite: http://127.0.0.1:5173 (OK)`
   - `Proxy (BasicAuth): http://127.0.0.1:8080 (401 expected)`
   - `Tunnel: https://....trycloudflare.com`
   - `Auth user: axiom` (default)  
   Press `Ctrl+C` to stop (cloudflared → caddy shutdown + temp file cleanup).

## Common examples
- Change Vite port:  
  `AXIOM_TUNNEL_PASS='...' python3 scripts/run_tunnel_dev.py --vite-port 5174`
- Custom Vite URL (overrides host/port):  
  `AXIOM_TUNNEL_PASS='...' python3 scripts/run_tunnel_dev.py --vite-url http://127.0.0.1:5173`
- Change proxy port:  
  `AXIOM_TUNNEL_PASS='...' python3 scripts/run_tunnel_dev.py --proxy-port 8081`
- Disable preflight verify (not recommended):  
  `AXIOM_TUNNEL_PASS='...' python3 scripts/run_tunnel_dev.py --verify false`
- Protocol override (default http2; quic can be flaky):  
  `AXIOM_TUNNEL_PASS='...' python3 scripts/run_tunnel_dev.py --protocol http2`

## Flags (cheat sheet)
- `--auth-user` default `axiom`; password from `--auth-pass` or env `--auth-pass-env` (default `AXIOM_TUNNEL_PASS`).
- `--proxy-port` default `8080` (BasicAuth reverse proxy).
- `--edge-ip-version` default `4`; keep http2 protocol unless quic is explicitly needed.
- `--tunnel-url` points cloudflared to a custom target (default: local proxy). If you override, ensure BasicAuth still protects the target.

## Troubleshooting
- **Vite not reachable**: ensure dev server is running on the chosen host/port; try `curl http://127.0.0.1:5173/`. Use `--vite-url` if host differs. As a last resort run with `--verify false` (not recommended).
- **WSL1 host**: Vite may refuse to start on WSL1 (`WSL 1 is not supported`). Upgrade to WSL2 or run dev server on a compatible host and point `--vite-url` to it.
- **Port 8080 busy**: pick another proxy port (`--proxy-port 8081`) or free the port.
- **QUIC fails**: stick with the default `--protocol http2`. If you tried `quic` and it flaps, switch back to http2.
- **cloudflared/caddy not installed**: install caddy via https://caddyserver.com/docs/install; install cloudflared via Cloudflare docs (Quick Tunnel binary). Confirm with `caddy version` / `cloudflared --version`.
- **Tunnel URL never appears**: network restrictions or Cloudflare rate limits can delay Quick Tunnel; the script times out and prints the last log lines. Re-run later or check VPN/firewall rules.

## Safety notes
- Password is never printed in clear text; only masked in stdout.
- Keep secrets out of git. Use env vars or a local `.env.local` (already ignored).
- `scripts/run_local.py` is untouched; the tunnel script assumes Vite is already running.
