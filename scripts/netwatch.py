#!/usr/bin/env python3
"""netwatch.py

Небольшой наблюдатель сети на Python.

Скрипт показывает текущее состояние соединения, ведёт журнал и помогает
выявлять проблемы (DNS, ICMP, HTTP/HTTPS). Он задуман как
кроссплатформенная, простая в настройке замена утилите ``netwatch.cpp``.

Основные возможности
--------------------

* **Отдельное окно на Windows**: флаг ``--new-console`` перезапускает
  скрипт в новой консоли, чтобы не занимать встроенный терминал IDE.
* **Раздельные логи по запускам**: файлы ``scripts/netlog/runlog_*.log``
  c отметками старта/остановки и автопометкой незавершённого прошлого
  сеанса.
* **Многоуровневые проверки**: локальный IP/маршрут, ICMP до выбранных
  целей (по умолчанию 1.1.1.1 и 8.8.8.8), DNS для основного хоста,
  HTTP/HTTPS‑запрос к основному сервису (по умолчанию api.openai.com) и
  дополнительные тестовые URL (``generate_204`` и др.).
* **Отслеживание трафика**: при наличии ``psutil`` выводит скорость по
  всем интерфейсам с усреднением на интервале опроса.
* **Самовосстановление**: любые ошибки внутри цикла ловятся и не
  останавливают работу; можно оставить скрипт работать автономно.
* **JSON‑снимок состояния**: последняя сводка сохраняется в
  ``scripts/netlog/last_status.json`` или в путь из ``--status-file``.

Запуск
------

    python scripts/netwatch.py
    python scripts/netwatch.py --interval 1 --new-console
    python scripts/netwatch.py --plain --services google.com/generate_204

Логи пишутся в ``scripts/netlog``, а в терминал выводится обновляемая
панель.
"""

from __future__ import annotations

import argparse
import datetime
import http.client
import json
import logging
import os
import signal
import socket
import subprocess
import sys
import threading
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple

try:
    import psutil  # type: ignore
except ImportError:
    psutil = None  # psutil is optional; throughput will be disabled if missing


###############################################################################
# Utility classes and functions
###############################################################################


class AnsiColor:
    """ANSI escape sequences for coloured terminal output.

    Colours are only used when ``plain`` mode is not requested.
    """

    GREEN = "\033[32m"
    RED = "\033[31m"
    YELLOW = "\033[33m"
    CYAN = "\033[36m"
    MAGENTA = "\033[35m"
    RESET = "\033[0m"


def ensure_console(new_console_flag: bool) -> None:
    """On Windows, optionally spawn the script in a separate console window.

    If ``new_console_flag`` is True and we are running on Windows, the
    function relaunches the current Python interpreter in a new console
    and exits. On other platforms this function is a no‑op.

    Note: This uses ``subprocess.CREATE_NEW_CONSOLE`` which is only
    available on Windows. Invocations on POSIX systems simply return.
    """

    if not new_console_flag:
        return

    if os.name != "nt":
        # Non‑Windows platforms cannot allocate a new console via this method.
        return

    # Determine whether we already have our own console. If the parent
    # process attached us to its console (e.g. VS Code integrated
    # terminal), launching a new console detaches the monitor from the
    # parent UI.
    try:
        import ctypes  # pylint: disable=import-error

        kernel32 = ctypes.windll.kernel32  # type: ignore[attr-defined]
        # GetConsoleWindow returns 0 if no console is associated.
        if kernel32.GetConsoleWindow():
            # Relaunch into new console; filter out the --new-console flag to
            # avoid infinite recursion.
            script = os.path.abspath(sys.argv[0])
            args = [sys.executable, script] + [arg for arg in sys.argv[1:] if arg != "--new-console"]
            creationflags = subprocess.CREATE_NEW_CONSOLE  # type: ignore[attr-defined]
            try:
                subprocess.Popen(args, creationflags=creationflags)
                # Immediately exit this process; the new instance will run.
                sys.exit(0)
            except Exception as exc:
                # If spawning fails, fall back to current console.
                sys.stderr.write(f"Failed to open new console: {exc}\n")
                return
    except Exception:
        # If ctypes is unavailable or an unexpected error occurs, do nothing.
        pass


def human_bytes_per_second(value: Optional[float]) -> str:
    """Convert a bytes‑per‑second value into a human readable string.

    If ``value`` is None, returns ``"N/A"``.
    """

    if value is None:
        return "N/A"
    units = ["B/s", "KB/s", "MB/s", "GB/s", "TB/s"]
    i = 0
    while value >= 1024 and i < len(units) - 1:
        value /= 1024.0
        i += 1
    return f"{value:8.2f} {units[i]}"


def human_timedelta(delta: datetime.timedelta) -> str:
    """Вернуть длительность в формате HH:MM:SS."""

    total_seconds = int(delta.total_seconds())
    hours, remainder = divmod(total_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"


def enable_windows_ansi() -> bool:
    """Попытаться включить поддержку ANSI‑последовательностей в консоли Windows."""

    if os.name != "nt":
        return True
    try:
        import ctypes  # pylint: disable=import-error

        kernel32 = ctypes.windll.kernel32  # type: ignore[attr-defined]
        handle = kernel32.GetStdHandle(-11)  # STD_OUTPUT_HANDLE = -11
        mode = ctypes.c_uint32()
        if kernel32.GetConsoleMode(handle, ctypes.byref(mode)) == 0:
            return False
        ENABLE_VIRTUAL_TERMINAL_PROCESSING = 0x0004
        new_mode = mode.value | ENABLE_VIRTUAL_TERMINAL_PROCESSING
        if kernel32.SetConsoleMode(handle, new_mode) == 0:
            return False
        return True
    except Exception:
        return False


def check_previous_run(log_dir: Path) -> None:
    """Inspect the most recent log file and append a termination record if needed.

    When the script starts it checks the latest ``runlog_*.log`` file in
    ``log_dir``. If that file does not contain a ``NETWATCH STOP`` marker
    (indicating that the previous run did not terminate gracefully),
    appends a line noting that the previous session ended unexpectedly
    along with the file’s modification time.
    """

    try:
        logs = [p for p in log_dir.iterdir() if p.is_file() and p.name.startswith("runlog_")]
        if not logs:
            return
        last_log = max(logs, key=lambda p: p.stat().st_mtime)
        with last_log.open("r+", encoding="utf-8") as fh:
            content = fh.read()
            if "NETWATCH STOP" not in content:
                mtime = datetime.datetime.fromtimestamp(last_log.stat().st_mtime)
                fh.write(f"\n=== NETWATCH STOP (previous run incomplete) {mtime.isoformat()} ===\n")
    except Exception:
        # If any error occurs during inspection, silently ignore it.
        pass


###############################################################################
# NetWatch implementation
###############################################################################


class NetWatch:
    """Monitor network connectivity and write logs.

    This class encapsulates the state and behaviour of the network monitor.
    """

    def __init__(
        self,
        interval: float,
        log_file: Path,
        ping_targets: List[str],
        service_endpoints: List[Tuple[str, str, str]],
        throughput_enabled: bool,
        plain_output: bool,
        primary_host: str,
        primary_path: str,
        primary_scheme: str,
        primary_method: str,
        ping_timeout: float,
        http_timeout: float,
        status_file: Optional[Path],
        logger: logging.Logger,
    ) -> None:
        self.interval = max(0.5, interval)
        self.log_file = log_file
        self.ping_targets = ping_targets
        # service_endpoints: list of (domain, path, scheme) entries
        self.service_endpoints = service_endpoints
        self.throughput_enabled = throughput_enabled and psutil is not None
        self.plain_output = plain_output
        self.primary_host = primary_host
        self.primary_path = primary_path if primary_path.startswith("/") else f"/{primary_path}"
        self.primary_scheme = primary_scheme.lower() or "https"
        self.primary_method = primary_method.upper()
        self.ping_timeout = max(0.2, ping_timeout)
        self.http_timeout = max(1.0, http_timeout)
        self.status_file = status_file
        self.logger = logger
        self._ansi_enabled = False

        # Internal state for throughput computation
        self._last_net_io: Optional[Tuple[int, int]] = None
        # Track downtime intervals
        self._downtime_start: Optional[datetime.datetime] = None
        self._downtime_total: datetime.timedelta = datetime.timedelta()
        self._started_at: datetime.datetime = datetime.datetime.now()
        # Stop flag for the main loop
        self._stop_event = threading.Event()
        # Try to enable ANSI/VT sequences on Windows consoles for proper clearing
        self._configure_console()

    # -------------------------------------------------------------------------
    # State gathering helpers
    # -------------------------------------------------------------------------

    def get_local_ip(self) -> Dict[str, Optional[str]]:
        """Return a mapping with your outward‑facing IP address.

        The method opens an unbound UDP socket and connects it to a public
        resolver (8.8.8.8:80). The OS routing table determines which
        interface and address will be used for this connection. No data is
        actually sent over the network, but ``socket.getsockname`` returns
        the local endpoint of the socket. If any error occurs, ``ip`` is
        ``None`` and ``error`` will contain a human readable message.
        """

        result: Dict[str, Optional[str]] = {"ip": None, "error": None}
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            # The address below need not be reachable; it's only used to choose
            # the correct outbound interface. See e.g. RFC 1122 for details.
            sock.connect(("8.8.8.8", 80))
            result["ip"] = sock.getsockname()[0]
        except Exception as exc:
            result["error"] = str(exc)
        finally:
            try:
                sock.close()
            except Exception:
                pass
        return result

    def ping_host(self, host: str, timeout: Optional[float] = None) -> Dict[str, Optional[object]]:
        """Ping an IPv4 host using the system ``ping`` command.

        ICMP echo requests normally require elevated privileges to send raw
        packets. To avoid requiring administrative rights, this function
        delegates to the platform’s ``ping`` utility via ``subprocess``. On
        Windows a single echo request is sent using ``ping -n 1 -w
        timeout_ms``; on POSIX systems ``ping -c 1 -W timeout`` is used.

        Returns a dictionary with keys ``ok`` (bool), ``rtt_ms`` (float or
        ``None``) and ``error`` (string or ``None``).
        """

        result: Dict[str, Optional[object]] = {
            "ok": False,
            "rtt_ms": None,
            "error": None,
        }
        timeout = self.ping_timeout if timeout is None else timeout
        try:
            if os.name == "nt":
                # Windows: -n 1 sends one echo, -w expects timeout in ms
                cmd = ["ping", "-n", "1", "-w", str(int(timeout * 1000)), host]
            else:
                # POSIX: -c 1 sends one packet, -W waits timeout seconds
                cmd = ["ping", "-c", "1", "-W", str(int(timeout)), host]
            proc = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="ignore")
            output = proc.stdout + proc.stderr
            if proc.returncode == 0:
                result["ok"] = True
                # Attempt to parse RTT from the output, which typically contains
                # something like "time=23ms" or "time=23.4 ms". We search
                # case‑insensitively for "time=".
                import re

                match = re.search(r"time[=<]\s*(\d+\.?\d*)\s*ms", output, re.IGNORECASE)
                if match:
                    result["rtt_ms"] = float(match.group(1))
            else:
                # Non‑zero return codes usually indicate timeouts or network
                # unreachable errors. Provide stderr as error message.
                result["error"] = output.strip() or f"ping вернул код {proc.returncode}"
        except FileNotFoundError:
            # If the ping utility is not available, we cannot perform the test.
            result["error"] = "ping не найден"
        except Exception as exc:
            result["error"] = str(exc)
        return result

    def resolve_host(self, host: str) -> Dict[str, Optional[object]]:
        """Разрешить домен через DNS.

        Возвращает словарь ``ok`` (bool), ``addresses`` (list[str]) и
        ``error``. Ошибка резолва фиксируется как ``ok=False``.
        """

        result: Dict[str, Optional[object]] = {
            "ok": False,
            "addresses": None,
            "error": None,
        }
        try:
            infos = socket.getaddrinfo(host, 443, proto=socket.IPPROTO_TCP)
            addresses = []
            for info in infos:
                addr = info[4][0]
                if addr not in addresses:
                    addresses.append(addr)
            result["addresses"] = addresses
            result["ok"] = bool(addresses)
        except Exception as exc:
            result["error"] = str(exc)
        return result

    def check_primary_http(self) -> Dict[str, Optional[object]]:
        """Проверить основной HTTP/HTTPS‑хост HEAD/GET запросом."""

        result: Dict[str, Optional[object]] = {
            "ok": False,
            "status": None,
            "error": None,
        }
        conn: Optional[http.client.HTTPConnection] = None
        try:
            cls = http.client.HTTPSConnection if self.primary_scheme == "https" else http.client.HTTPConnection
            conn = cls(self.primary_host, timeout=self.http_timeout)
            conn.request(self.primary_method, self.primary_path)
            resp = conn.getresponse()
            result["status"] = resp.status
            # Любой ответ от сервера значит, что соединение и TLS установились
            result["ok"] = True
        except Exception as exc:
            result["error"] = str(exc)
        finally:
            try:
                if conn is not None:
                    conn.close()
            except Exception:
                pass
        return result

    def check_service(self, host: str, path: str, scheme: str) -> Dict[str, Optional[object]]:
        """Check a given HTTP/HTTPS endpoint for network reachability.

        The function performs a GET request to the specified host and path.
        A response status of 204 (No Content) or 200 is treated as
        success. These endpoints are commonly used by operating systems
        and browsers to detect captive portals: if the request is
        redirected to a login page or times out, ``ok`` will be False.
        See for example the connectivity test URLs documented in May 2025
        by Anton Zhiyanov【971457281900871†L14-L31】.

        :param host: Domain name to contact, e.g. ``google.com``.
        :param path: URL path to request, e.g. ``/generate_204``.
        :param scheme: Either ``http`` or ``https``.
        :returns: dict with ``ok`` (bool), ``status`` (int or None) and
                  ``error`` (str or None).
        """

        result: Dict[str, Optional[object]] = {
            "ok": False,
            "status": None,
            "error": None,
        }
        conn: Optional[http.client.HTTPConnection] = None
        try:
            cls = http.client.HTTPSConnection if scheme.lower() == "https" else http.client.HTTPConnection
            conn = cls(host, timeout=5.0)
            conn.request("GET", path)
            resp = conn.getresponse()
            result["status"] = resp.status
            # For captive portal detection endpoints we accept 200 and 204
            if resp.status in (200, 204):
                result["ok"] = True
        except Exception as exc:
            result["error"] = str(exc)
        finally:
            try:
                if conn is not None:
                    conn.close()
            except Exception:
                pass
        return result

    def measure_throughput(self) -> Dict[str, Optional[float]]:
        """Measure aggregate bytes per second in and out.

        Utilises the ``psutil`` library to read cumulative counters for
        all network interfaces. The difference between successive calls
        divided by the monitoring interval yields a bytes‑per‑second
        estimate. If throughput monitoring is disabled or ``psutil`` is
        missing, both values will be ``None``.
        """

        if not self.throughput_enabled or psutil is None:
            return {"in_bps": None, "out_bps": None}
        io = psutil.net_io_counters()
        sent = io.bytes_sent
        recv = io.bytes_recv
        if self._last_net_io is None:
            self._last_net_io = (sent, recv)
            return {"in_bps": None, "out_bps": None}
        last_sent, last_recv = self._last_net_io
        self._last_net_io = (sent, recv)
        # Compute per second rates based on configured interval
        in_bps = (recv - last_recv) / self.interval
        out_bps = (sent - last_sent) / self.interval
        return {"in_bps": max(in_bps, 0.0), "out_bps": max(out_bps, 0.0)}

    def _update_downtime(self, summary: str, now_dt: datetime.datetime) -> datetime.timedelta:
        """Зафиксировать длительность простоя/аптайма и вернуть накопленный простой."""

        is_up = summary.startswith(("OK", "ОК", "Интернет"))
        if not is_up:
            if self._downtime_start is None:
                self._downtime_start = now_dt
        else:
            if self._downtime_start is not None:
                duration = now_dt - self._downtime_start
                self._downtime_total += duration
                human_duration = str(duration).split(".")[0]
                self._write_log(f"DOWNTIME {human_duration}")
                self._downtime_start = None

        if self._downtime_start is not None:
            return self._downtime_total + (now_dt - self._downtime_start)
        return self._downtime_total

    def _log_inline_error(self, message: object) -> None:
        """Записать ошибку в текущий лог, не прерывая работу."""

        self._write_log(f"{message}", level="ERROR")

    def _write_status_file(self, state: Dict[str, object]) -> None:
        """Сохранить последний статус в JSON (для внешнего мониторинга)."""

        if not self.status_file:
            return
        try:
            self.status_file.parent.mkdir(parents=True, exist_ok=True)
            with self.status_file.open("w", encoding="utf-8") as fh:
                json.dump(state, fh, ensure_ascii=False, indent=2)
        except Exception as exc:
            # Не шумим в консоли, только тихий лог
            self.logger.debug("Не удалось записать файл статуса: %s", exc, exc_info=False)

    def _write_log(self, message: str, level: str = "INFO") -> None:
        """Единый формат логов, совпадающий с исходным netwatch.cpp."""

        ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        line = f"{ts} | {level.upper():<5} | {message}\n"
        try:
            with self.log_file.open("a", encoding="utf-8") as fh:
                fh.write(line)
        except Exception:
            pass

    def _configure_console(self) -> None:
        """Включить ANSI при возможности и подготовить функции очистки."""

        if self.plain_output:
            self._ansi_enabled = False
            return
        if sys.stdout.isatty() and enable_windows_ansi():
            self._ansi_enabled = True
        else:
            self._ansi_enabled = False

    def _clear_screen(self) -> None:
        """Очистить экран, учитывая поддержку ANSI."""

        if self.plain_output:
            return
        if self._ansi_enabled:
            sys.stdout.write("\x1b[2J\x1b[H")
            return
        # Fallback: системная команда очистки, чтобы не печатать коды в логи
        try:
            if os.name == "nt":
                os.system("cls")
            else:
                sys.stdout.write("\n" * 60)
        except Exception:
            pass

    # -------------------------------------------------------------------------
    # Logging and presentation
    # -------------------------------------------------------------------------

    def summarise_state(
        self,
        ip_info: Dict[str, Optional[str]],
        ping_info: Dict[str, Dict[str, Optional[object]]],
        dns_info: Dict[str, Optional[object]],
        primary_http: Dict[str, Optional[object]],
        services: Dict[str, Dict[str, Optional[object]]],
    ) -> str:
        """Сформировать краткий вывод о состоянии подключения."""

        # Check local IP
        if ip_info.get("ip") is None:
            return "Нет активного IP – сетевой интерфейс не в сети"

        # Check ping results. If all targets failed we might still be
        # connected to the Internet if ICMP is blocked. We'll defer
        # judgement until DNS/HTTP checks.
        ping_ok = any(res.get("ok") for res in ping_info.values())

        # Check DNS
        if not dns_info.get("ok"):
            return f"Проблема DNS – не удалось разрешить {self.primary_host}"

        # Check captive portal endpoints
        if services:
            captive_ok = all(res.get("ok") for res in services.values())
        else:
            captive_ok = True

        # Check primary HTTP
        if not primary_http.get("ok"):
            if ping_ok and captive_ok:
                return f"Проблема соединения с {self.primary_host}"
            return f"Проблема HTTPS до {self.primary_host} – возможно нет интернета"

        # If we've reached here everything required is working
        if not ping_ok:
            # ICMP might be blocked but everything else works
            return "Интернет доступен – ICMP может быть заблокирован"
        return f"OK – интернет и {self.primary_host} доступны"

    def log_entry(self, state: Dict[str, object]) -> None:
        """Write a structured JSON‑like log entry for the current state."""

        try:
            payload = json.dumps(state, ensure_ascii=False)
            self._write_log(f"STATUS {payload}")
        except Exception as exc:
            sys.stderr.write(f"Не удалось записать в лог: {exc}\n")

    def update_console(self, state: Dict[str, object], summary: str) -> None:
        """Render the current diagnostic state to the terminal.

        Uses ANSI escape codes to clear the screen and colourise output
        unless ``plain_output`` is true. The dashboard contains sections
        for the local IP, ping targets, DNS resolution, OpenAI HTTP
        connectivity, additional service checks and throughput.
        """

        # Choose colours based on summary: green for OK, red for problems,
        # yellow for warnings
        use_color = self._ansi_enabled and not self.plain_output
        col = AnsiColor.GREEN if use_color else ""
        if summary.startswith("Проблема"):
            col = AnsiColor.RED if use_color else ""
        elif summary.startswith("Интернет"):
            col = AnsiColor.YELLOW if use_color else ""
        # Clear the screen and reposition cursor
        self._clear_screen()
        # Header
        now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        header = f"NETWATCH PY    {now}    интервал: {self.interval:.2f}с"
        sys.stdout.write(header + "\n")
        sys.stdout.write("-" * len(header) + "\n")
        now_dt = datetime.datetime.now()
        uptime = human_timedelta(now_dt - self._started_at)
        downtime = self._downtime_total
        if self._downtime_start:
            downtime += now_dt - self._downtime_start
        sys.stdout.write(f"Время работы : {uptime}\n")
        sys.stdout.write(f"Простой      : {human_timedelta(downtime)}\n\n")
        # Summary
        if self.plain_output or not use_color:
            sys.stdout.write(f"Статус: {summary}\n\n")
        else:
            sys.stdout.write(f"Общий статус: {col}{summary}{AnsiColor.RESET}\n\n")
        # Local IP
        if ip := state.get("ip", {}).get("ip"):
            sys.stdout.write(f"Локальный IP   : {ip}\n")
        else:
            err = state.get("ip", {}).get("error") or "unknown"
            sys.stdout.write(f"Локальный IP   : [ошибка] {err}\n")
        sys.stdout.write("\n")
        # Pings
        sys.stdout.write("Ping:\n")
        for host, res in state.get("ping", {}).items():
            ok = res.get("ok")
            rtt = res.get("rtt_ms")
            err = res.get("error")
            if ok:
                rtt_text = f"{rtt:.1f} ms" if rtt is not None else "n/a"
                if use_color:
                    line = f"  {host:<15}: {AnsiColor.GREEN}OK{AnsiColor.RESET}   rtt={rtt_text}"
                else:
                    line = f"  {host:<15}: OK   rtt={rtt_text}"
            else:
                msg = f"{err}" if err else "тайм-аут"
                if use_color:
                    line = f"  {host:<15}: {AnsiColor.RED}FAIL{AnsiColor.RESET} ({msg})"
                else:
                    line = f"  {host:<15}: FAIL ({msg})"
            sys.stdout.write(line + "\n")
        sys.stdout.write("\n")
        # DNS
        dns = state.get("dns", {})
        dns_host = dns.get("host") or self.primary_host
        if dns.get("ok"):
            addrs = ", ".join(dns.get("addresses") or [])
            if use_color:
                line = f"DNS {dns_host:<17}: {AnsiColor.GREEN}OK{AnsiColor.RESET}   {addrs}"
            else:
                line = f"DNS {dns_host:<17}: OK   {addrs}"
        else:
            err = dns.get("error") or "ошибка"
            if use_color:
                line = f"DNS {dns_host:<17}: {AnsiColor.RED}FAIL{AnsiColor.RESET} ({err})"
            else:
                line = f"DNS {dns_host:<17}: FAIL ({err})"
        sys.stdout.write(line + "\n\n")
        # OpenAI HTTP
        http = state.get("primary_http", {}) or state.get("openai_http", {})
        if http.get("ok"):
            status = http.get("status")
            if use_color:
                line = f"{self.primary_method} {self.primary_scheme.upper()} {dns_host:<12}: {AnsiColor.GREEN}OK{AnsiColor.RESET}   HTTP {status}"
            else:
                line = f"{self.primary_method} {self.primary_scheme.upper()} {dns_host:<12}: OK   HTTP {status}"
        else:
            err = http.get("error") or "ошибка"
            if use_color:
                line = f"{self.primary_method} {self.primary_scheme.upper()} {dns_host:<12}: {AnsiColor.RED}FAIL{AnsiColor.RESET} ({err})"
            else:
                line = f"{self.primary_method} {self.primary_scheme.upper()} {dns_host:<12}: FAIL ({err})"
        sys.stdout.write(line + "\n\n")
        # Additional services
        if state.get("services"):
            sys.stdout.write("Дополнительные сервисы:\n")
            for key, res in state.get("services", {}).items():
                if res.get("ok"):
                    if use_color:
                        line = f"  {key:<20}: {AnsiColor.GREEN}OK{AnsiColor.RESET}   HTTP {res.get('status')}"
                    else:
                        line = f"  {key:<20}: OK   HTTP {res.get('status')}"
                else:
                    err = res.get("error") or f"HTTP {res.get('status')}"
                    if use_color:
                        line = f"  {key:<20}: {AnsiColor.RED}FAIL{AnsiColor.RESET} ({err})"
                    else:
                        line = f"  {key:<20}: FAIL ({err})"
                sys.stdout.write(line + "\n")
            sys.stdout.write("\n")
        # Throughput
        thr = state.get("throughput", {}) or {}
        sys.stdout.write("Трафик (все интерфейсы):\n")
        in_bps = human_bytes_per_second(thr.get("in_bps"))
        out_bps = human_bytes_per_second(thr.get("out_bps"))
        sys.stdout.write(f"  IN : {in_bps}\n")
        sys.stdout.write(f"  OUT: {out_bps}\n\n")
        sys.stdout.write("Нажмите Ctrl+C для остановки...\n")
        sys.stdout.flush()

    # -------------------------------------------------------------------------
    # State collection
    # -------------------------------------------------------------------------

    def _collect_state(self) -> Dict[str, object]:
        """Собрать всю диагностику за одну итерацию."""

        now_dt = datetime.datetime.now()
        ip_info = self.get_local_ip()
        ping_info = {host: self.ping_host(host) for host in self.ping_targets}
        dns_info = self.resolve_host(self.primary_host)
        primary_http = self.check_primary_http()
        service_results: Dict[str, Dict[str, Optional[object]]] = {}
        for (host, path, scheme) in self.service_endpoints:
            key = f"{scheme}://{host}{path}"
            service_results[key] = self.check_service(host, path, scheme)
        throughput = self.measure_throughput()
        summary = self.summarise_state(ip_info, ping_info, dns_info, primary_http, service_results)
        downtime = self._update_downtime(summary, now_dt)
        uptime = now_dt - self._started_at
        state: Dict[str, object] = {
            "timestamp": now_dt.isoformat(),
            "ip": ip_info,
            "ping": ping_info,
            "dns": {**dns_info, "host": self.primary_host},
            "primary_http": primary_http,
            "openai_http": primary_http,  # совместимость со старыми логами
            "services": service_results,
            "throughput": throughput,
            "summary": summary,
            "uptime_seconds": int(uptime.total_seconds()),
            "downtime_seconds": int(downtime.total_seconds()),
            "primary": {
                "host": self.primary_host,
                "path": self.primary_path,
                "scheme": self.primary_scheme,
                "method": self.primary_method,
            },
        }
        return state

    # -------------------------------------------------------------------------
    # Main loop and stop handling
    # -------------------------------------------------------------------------

    def _finalise(self) -> None:
        """Write a termination record into the log file.

        Called upon exiting the main loop either via signal or normal
        termination. Ensures that each run ends with a ``NETWATCH STOP``
        marker.
        """

        ts = datetime.datetime.now().isoformat()
        self._write_log(f"=== NETWATCH STOP {ts} ===")

    def stop(self, signum: Optional[int] = None, frame: Optional[object] = None) -> None:
        """Signal handler: request that the monitoring loop terminates."""

        self._stop_event.set()

    def run(self) -> None:
        """Основной цикл мониторинга с защитой от падений."""

        # Перезапускаем отсчёт аптайма при фактическом старте цикла
        self._started_at = datetime.datetime.now()

        # Register signal handlers once inside the run method to avoid
        # interfering with potential parent processes. Signals like SIGTERM
        # may not be available on Windows.
        try:
            signal.signal(signal.SIGINT, self.stop)
        except Exception:
            pass
        try:
            signal.signal(signal.SIGTERM, self.stop)
        except Exception:
            pass

        # Write start record
        start_ts = self._started_at.isoformat()
        self._write_log(f"=== NETWATCH START {start_ts} ===")
        self._write_log(f"LOG FILE: {self.log_file}")
        self._write_log(
            "ARGS "
            f'{{"interval": {self.interval}, "throughput_enabled": {self.throughput_enabled}, '
            f'"services": {self.service_endpoints}, "ping_targets": {self.ping_targets}, '
            f'"primary": "{self.primary_scheme}://{self.primary_host}{self.primary_path} ({self.primary_method})", '
            f'"ping_timeout": {self.ping_timeout}, "http_timeout": {self.http_timeout}}}'
        )
        self._write_log(f"NETWATCH LOOP START, interval={self.interval:.3f}s")

        # Use atexit to ensure finalisation when Python exits normally
        import atexit

        atexit.register(self._finalise)

        # Main loop
        next_run = time.monotonic()
        while not self._stop_event.is_set():
            try:
                state = self._collect_state()
                summary = str(state.get("summary"))
                self.log_entry(state)
                self._write_status_file(state)
                self.update_console(state, summary)
            except Exception as exc:
                # Не выходим из цикла, чтобы скрипт мог работать автономно
                self.logger.exception("Сбой итерации", exc_info=True)
                self._log_inline_error(exc)
                summary = f"Проблема: внутренняя ошибка цикла ({exc})"
                try:
                    self.update_console({"summary": summary}, summary)
                except Exception:
                    pass
            # Sleep until next iteration maintaining fixed interval
            next_run += self.interval
            sleep_time = next_run - time.monotonic()
            if sleep_time > 0:
                self._stop_event.wait(sleep_time)

        # After loop exit, call finaliser explicitly (atexit will also call)
        self._finalise()


###############################################################################
# Argument parsing and entry point
###############################################################################


def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    """Разбор аргументов командной строки."""

    parser = argparse.ArgumentParser(description="Мониторинг сети с живой панелью и логами.")
    parser.add_argument("--interval", type=float, default=2.0, help="Интервал между проверками (сек). Минимум 0.5.")
    parser.add_argument("--ping-timeout", type=float, default=1.0, help="Таймаут ожидания ответа ping (сек).")
    parser.add_argument(
        "--targets",
        nargs="*",
        metavar="HOST",
        help="IP/домены для ping через системную утилиту (по умолчанию 1.1.1.1 8.8.8.8).",
    )
    parser.add_argument("--no-throughput", action="store_true", help="Отключить измерение трафика даже если psutil установлен.")
    parser.add_argument("--plain", action="store_true", help="Без очистки экрана и цветов.")
    parser.add_argument("--new-console", action="store_true", help="Windows: запустить в новой консоли.")
    parser.add_argument("--primary-host", default="api.openai.com", help="Основной хост для DNS/HTTP проверки.")
    parser.add_argument("--primary-path", default="/v1/models", help="Путь для основной HTTP проверки.")
    parser.add_argument("--primary-scheme", choices=["http", "https"], default="https", help="Схема основной проверки.")
    parser.add_argument("--primary-method", choices=["HEAD", "GET"], default="HEAD", help="HTTP метод для основной проверки.")
    parser.add_argument("--http-timeout", type=float, default=5.0, help="Таймаут HTTP/HTTPS запросов (сек).")
    parser.add_argument(
        "--services",
        nargs="*",
        metavar="HOST/PATH",
        help=(
            "Дополнительные HTTP(S) проверки: 'host/path' или 'scheme://host/path'. "
            "Без схемы берётся http."
        ),
    )
    parser.add_argument(
        "--log-dir",
        default=None,
        help="Каталог для логов (по умолчанию scripts/netlog рядом со скриптом).",
    )
    parser.add_argument(
        "--status-file",
        default=None,
        help="Файл, куда класть последний статус в JSON. По умолчанию scripts/netlog/last_status.json.",
    )
    return parser.parse_args(argv)


def main() -> None:
    args = parse_args()
    # Determine log directory
    script_dir = Path(__file__).resolve().parent
    log_dir = Path(args.log_dir) if args.log_dir else script_dir / "netlog"
    log_dir.mkdir(parents=True, exist_ok=True)
    # Inspect previous log for incomplete termination
    check_previous_run(log_dir)
    # Spawn a new console if requested (Windows only)
    ensure_console(args.new_console)
    # Compose log file name
    now = datetime.datetime.now()
    log_filename = f"runlog_{now.strftime('%d.%m.%y_%H-%M-%S')}.log"
    log_path = log_dir / log_filename
    status_path = Path(args.status_file) if args.status_file else log_dir / "last_status.json"
    # Configure logging only for potential debugging; regular logging into the file
    logger = logging.getLogger("netwatch")
    logger.setLevel(logging.INFO)
    # Avoid duplicate handlers on repeated runs
    if not logger.handlers:
        # Write debug logs to a .debug file as well
        debug_handler = logging.FileHandler(log_dir / "netwatch.debug.log", encoding="utf-8")
        debug_handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s"))
        logger.addHandler(debug_handler)
    # Build list of ping targets. Default: common DNS resolvers.
    ping_targets = args.targets or ["1.1.1.1", "8.8.8.8"]
    # Parse additional services. Default endpoints for captive portal detection
    default_services = [
        ("google.com", "/generate_204", "http"),
        ("cp.cloudflare.com", "/generate_204", "http"),
    ]
    service_endpoints: List[Tuple[str, str, str]] = default_services.copy()
    if args.services:
        for raw in args.services:
            scheme = "http"
            host_path = raw
            # If the user provided a scheme:// prefix, extract it
            if "://" in raw:
                scheme, rest = raw.split("://", 1)
                host_path = rest
            # Split host and path
            if "/" in host_path:
                host, path = host_path.split("/", 1)
                path = "/" + path
            else:
                host, path = host_path, "/"
            service_endpoints.append((host, path, scheme))
    # Determine throughput flag
    throughput_enabled = not args.no_throughput and psutil is not None
    # Instantiate and run the monitor
    monitor = NetWatch(
        interval=args.interval,
        log_file=log_path,
        ping_targets=ping_targets,
        service_endpoints=service_endpoints,
        throughput_enabled=throughput_enabled,
        plain_output=args.plain,
        primary_host=args.primary_host,
        primary_path=args.primary_path,
        primary_scheme=args.primary_scheme,
        primary_method=args.primary_method,
        ping_timeout=args.ping_timeout,
        http_timeout=args.http_timeout,
        status_file=status_path,
        logger=logger,
    )
    try:
        monitor.run()
    except Exception as exc:
        # Log unexpected exceptions and finalise
        logger.exception("Unexpected error: %s", exc)
        monitor._finalise()


if __name__ == "__main__":
    main()
