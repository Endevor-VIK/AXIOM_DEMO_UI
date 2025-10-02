// netwatch.cpp : минималистичный монитор сети для Windows
// Компиляция: cl /EHsc netwatch.cpp /link winhttp.lib iphlpapi.lib ws2_32.lib Icmp.lib

#ifndef _WIN32_WINNT
#define _WIN32_WINNT 0x0600
#endif
#ifndef WINVER
#define WINVER _WIN32_WINNT
#endif

#define WIN32_LEAN_AND_MEAN
#define NOMINMAX
#ifdef _WIN32
  // Порядок важен: Winsock2 → Ws2tcpip
  #include <winsock2.h>
  #include <ws2tcpip.h>
#endif
#include <windows.h>
#ifndef NTDDI_VERSION
#include <sdkddkver.h>
#endif
#include <winhttp.h>
#include <iphlpapi.h>
#include <iptypes.h>
#include <icmpapi.h>
#include <netioapi.h>

// Fallback для старых SDK, если флаги не заданы
#ifndef GAA_FLAG_SKIP_ANYCAST
#define GAA_FLAG_SKIP_ANYCAST   0x0002
#endif
#ifndef GAA_FLAG_SKIP_MULTICAST
#define GAA_FLAG_SKIP_MULTICAST 0x0004
#endif
#ifndef GAA_FLAG_SKIP_DNS_SERVER
#define GAA_FLAG_SKIP_DNS_SERVER 0x0008
#endif

#include <cstdio>
#include <string>
#include <vector>
#include <chrono>
#include <thread>
#include <algorithm>

#pragma comment(lib, "winhttp.lib")
#pragma comment(lib, "iphlpapi.lib")
#pragma comment(lib, "ws2_32.lib")

// --- динамическая загрузка icmp.dll -----------------------------------------

struct IcmpDyn {
    HMODULE h{};
    decltype(&IcmpCreateFile)  CreateFile{};
    decltype(&IcmpCloseHandle) CloseHandle{};
    decltype(&IcmpSendEcho)    SendEcho{};
    bool ok{false};

    IcmpDyn() {
        h = LoadLibraryW(L"icmp.dll");
        if (h) {
            CreateFile  = reinterpret_cast<decltype(CreateFile) >(GetProcAddress(h, "IcmpCreateFile"));
            CloseHandle = reinterpret_cast<decltype(CloseHandle)>(GetProcAddress(h, "IcmpCloseHandle"));
            SendEcho    = reinterpret_cast<decltype(SendEcho)   >(GetProcAddress(h, "IcmpSendEcho"));
            ok = CreateFile && CloseHandle && SendEcho;
        }
    }
    ~IcmpDyn() { if (h) FreeLibrary(h); }
};

static IcmpDyn g_icmp;

// --- утилиты вывода ---------------------------------------------------------

static bool EnableVT() {
    HANDLE h = GetStdHandle(STD_OUTPUT_HANDLE);
    if (h == INVALID_HANDLE_VALUE) return false;
    DWORD mode = 0;
    if (!GetConsoleMode(h, &mode)) return false;
    mode |= ENABLE_VIRTUAL_TERMINAL_PROCESSING;
    return SetConsoleMode(h, mode) != 0;
}

static void ClearScreen() {
    // ESC[2J — очистить; ESC[H — в 0,0; ESC[?25l — спрятать курсор
    std::printf("\x1b[2J\x1b[H\x1b[?25l");
}

static void ShowCursor() {
    std::printf("\x1b[?25h");
}

static std::string HumanBytes(double bps) {
    const char* units[] = {"B/s","KB/s","MB/s","GB/s","TB/s"};
    int u = 0;
    while (bps >= 1024.0 && u < 4) { bps /= 1024.0; ++u; }
    char buf[64];
    std::snprintf(buf, sizeof(buf), "%.1f %s", bps, units[u]);
    return buf;
}

static std::string LastErrorStr(DWORD err) {
    LPWSTR msg = nullptr;
    FormatMessageW(FORMAT_MESSAGE_ALLOCATE_BUFFER | FORMAT_MESSAGE_FROM_SYSTEM |
                       FORMAT_MESSAGE_IGNORE_INSERTS,
                   nullptr, err, 0, (LPWSTR)&msg, 0, nullptr);
    char out[512];
    if (msg) {
        WideCharToMultiByte(CP_UTF8, 0, msg, -1, out, sizeof(out), 0, 0);
        LocalFree(msg);
        return std::string(out);
    }
    return "error " + std::to_string(err);
}

// --- сетевые проверки --------------------------------------------------------

struct PingResult {
    bool ok = false;
    DWORD rttMs = 0;
    std::string err;
};

static PingResult PingIPv4(const char* ip) {
    PingResult r;
    if (!g_icmp.ok) { r.err = "icmp.dll not available"; return r; }

    HANDLE hIcmp = g_icmp.CreateFile();
    if (hIcmp == INVALID_HANDLE_VALUE) { r.err = "IcmpCreateFile failed"; return r; }

    IPAddr addr = 0;
    inet_pton(AF_INET, ip, &addr);

    char sendData[] = "nw";
    DWORD replySize = sizeof(ICMP_ECHO_REPLY) + sizeof(sendData) + 64;
    std::vector<char> reply(replySize);

    DWORD ret = g_icmp.SendEcho(hIcmp, addr, sendData, sizeof(sendData),
                                nullptr, reply.data(), replySize, 1000);
    if (ret > 0) {
        auto* rep = reinterpret_cast<ICMP_ECHO_REPLY*>(reply.data());
        r.ok = (rep->Status == IP_SUCCESS);
        r.rttMs = rep->RoundTripTime;
        if (!r.ok) r.err = "ICMP status " + std::to_string(rep->Status);
    } else {
        r.err = LastErrorStr(GetLastError());
    }
    g_icmp.CloseHandle(hIcmp);
    return r;
}

struct DnsResult {
    bool ok = false;
    std::string addr;
    std::string err;
};

static DnsResult ResolveHost(const wchar_t* host) {
    DnsResult r;
    ADDRINFOW hints = {};
    hints.ai_family = AF_UNSPEC;
    ADDRINFOW* res = nullptr;
    int code = GetAddrInfoW(host, L"443", &hints, &res);
    if (code == 0 && res) {
        wchar_t buf[128] = L"";
        void* src = nullptr;
        int fam = res->ai_family;
        if (fam == AF_INET) {
            src = &((sockaddr_in*)res->ai_addr)->sin_addr;
        } else if (fam == AF_INET6) {
            src = &((sockaddr_in6*)res->ai_addr)->sin6_addr;
        }
        if (src) {
            InetNtopW(fam, src, buf, 128);
            char utf8[256];
            WideCharToMultiByte(CP_UTF8, 0, buf, -1, utf8, sizeof(utf8), 0, 0);
            r.addr = utf8;
        }
        r.ok = true;
    } else {
        r.err = "GetAddrInfoW code " + std::to_string(code);
    }
    if (res) FreeAddrInfoW(res);
    return r;
}

struct HttpResult {
    bool ok = false;
    DWORD status = 0;
    std::string err;
    std::string proxy; // кратко, что использовано
};

static HttpResult HeadOpenAI() {
    HttpResult r;
    // Объявляем заранее, чтобы goto не обходил инициализацию
    DWORD sc = 0;
    DWORD scLen = sizeof(DWORD);

    HINTERNET hSession = WinHttpOpen(L"NetWatch/1.0",
        WINHTTP_ACCESS_TYPE_DEFAULT_PROXY, WINHTTP_NO_PROXY_NAME, WINHTTP_NO_PROXY_BYPASS, 0);
    if (!hSession) { r.err = "WinHttpOpen: " + LastErrorStr(GetLastError()); return r; }

    // таймауты покороче
    WinHttpSetTimeouts(hSession, 5000, 5000, 5000, 5000);

    // выясним, что по прокси
    WINHTTP_PROXY_INFO pinfo = {};
    DWORD sz = sizeof(pinfo);
    if (WinHttpQueryOption(hSession, WINHTTP_OPTION_PROXY, &pinfo, &sz)) {
        if (pinfo.dwAccessType == WINHTTP_ACCESS_TYPE_NAMED_PROXY) r.proxy = "Named";
        else if (pinfo.dwAccessType == WINHTTP_ACCESS_TYPE_DEFAULT_PROXY) r.proxy = "Default";
        else r.proxy = "Direct";
    } else {
        r.proxy = "Unknown";
    }

    HINTERNET hConnect = WinHttpConnect(hSession, L"api.openai.com", INTERNET_DEFAULT_HTTPS_PORT, 0);
    if (!hConnect) { r.err = "WinHttpConnect: " + LastErrorStr(GetLastError()); WinHttpCloseHandle(hSession); return r; }

    HINTERNET hReq = WinHttpOpenRequest(hConnect, L"HEAD", L"/v1/models",
        NULL, WINHTTP_NO_REFERER, WINHTTP_DEFAULT_ACCEPT_TYPES, WINHTTP_FLAG_SECURE);
    if (!hReq) { r.err = "OpenRequest: " + LastErrorStr(GetLastError()); WinHttpCloseHandle(hConnect); WinHttpCloseHandle(hSession); return r; }

    BOOL sent = WinHttpSendRequest(hReq, WINHTTP_NO_ADDITIONAL_HEADERS, 0, WINHTTP_NO_REQUEST_DATA, 0, 0, 0);
    if (!sent) { r.err = "SendRequest: " + LastErrorStr(GetLastError()); goto cleanup; }
    if (!WinHttpReceiveResponse(hReq, NULL)) { r.err = "ReceiveResponse: " + LastErrorStr(GetLastError()); goto cleanup; }

    if (WinHttpQueryHeaders(hReq, WINHTTP_QUERY_STATUS_CODE | WINHTTP_QUERY_FLAG_NUMBER, WINHTTP_HEADER_NAME_BY_INDEX, &sc, &scLen, WINHTTP_NO_HEADER_INDEX)) {
        r.status = sc;
        // 401 Unauthorized без токена — это "ОК, до хоста достучались"
        r.ok = (sc == 200 || sc == 204 || sc == 301 || sc == 302 || sc == 401 || sc == 403 || sc == 404);
    } else {
        r.err = "QueryHeaders: " + LastErrorStr(GetLastError());
    }

cleanup:
    if (hReq) WinHttpCloseHandle(hReq);
    if (hConnect) WinHttpCloseHandle(hConnect);
    if (hSession) WinHttpCloseHandle(hSession);
    return r;
}

// --- скорость интерфейсов ----------------------------------------------------

struct Throughput {
    double inBps = 0.0;
    double outBps = 0.0;
};

static bool GoodRow(const MIB_IF_ROW2& r) {
    if (r.OperStatus != IfOperStatusUp) return false;
    if (r.InterfaceAndOperStatusFlags.HardwareInterface == FALSE && r.Type != IF_TYPE_ETHERNET_CSMACD && r.Type != IF_TYPE_IEEE80211) {
        // пропустим виртуальные/туннельные
        if (r.Type == IF_TYPE_SOFTWARE_LOOPBACK || r.Type == IF_TYPE_TUNNEL) return false;
    }
    return true;
}

static Throughput MeasureThroughput(double seconds) {
    static ULONG64 prevIn = 0, prevOut = 0;
    static bool first = true;

    PMIB_IF_TABLE2 tbl = nullptr;
    Throughput tp{};
    if (GetIfTable2(&tbl) == NO_ERROR && tbl) {
        ULONG64 inSum = 0, outSum = 0;
        for (ULONG i = 0; i < tbl->NumEntries; ++i) {
            const auto& row = tbl->Table[i];
            if (!GoodRow(row)) continue;
            inSum += row.InOctets;
            outSum += row.OutOctets;
        }
        if (!first && seconds > 0.0) {
            tp.inBps  = double(inSum - prevIn)   / seconds;
            tp.outBps = double(outSum - prevOut) / seconds;
        }
        prevIn = inSum; prevOut = outSum; first = false;
        FreeMibTable(tbl);
    }
    return tp;
}

// --- выбор IP/интерфейса для вывода -----------------------------------------

static std::string PrimaryIPv4() {
    ULONG flags = GAA_FLAG_SKIP_ANYCAST | GAA_FLAG_SKIP_MULTICAST | GAA_FLAG_SKIP_DNS_SERVER;
    ULONG bufLen = 16 * 1024;
    std::vector<char> buf(bufLen);
    IP_ADAPTER_ADDRESSES* aa = reinterpret_cast<IP_ADAPTER_ADDRESSES*>(buf.data());
    if (GetAdaptersAddresses(AF_INET, flags, nullptr, aa, &bufLen) == NO_ERROR) {
        for (auto p = aa; p; p = p->Next) {
            if (p->OperStatus != IfOperStatusUp) continue;
            if (p->IfType == IF_TYPE_SOFTWARE_LOOPBACK) continue;
            for (auto u = p->FirstUnicastAddress; u; u = u->Next) {
                char ip[INET_ADDRSTRLEN]{};
                auto* sa = (sockaddr_in*)u->Address.lpSockaddr;
                inet_ntop(AF_INET, &sa->sin_addr, ip, sizeof(ip));
                return std::string(ip) + " (" + std::string(p->AdapterName) + ")";
            }
        }
    }
    return "-";
}

// --- main loop ---------------------------------------------------------------

int main(int argc, char** argv) {
    SetConsoleOutputCP(CP_UTF8);
    EnableVT();

    int intervalMs = 2000;
    if (argc >= 2) intervalMs = std::max(500, atoi(argv[1]));

    std::printf("Starting NetWatch (interval %d ms). Press Ctrl+C to exit.\n", intervalMs);
    std::this_thread::sleep_for(std::chrono::milliseconds(800));

    bool running = true;

    auto last = std::chrono::steady_clock::now();

    while (running) {
        auto now = std::chrono::steady_clock::now();
        double elapsed = std::chrono::duration<double>(now - last).count();
        if (elapsed <= 0.0) elapsed = intervalMs / 1000.0;

        // измерения
        auto p1 = PingIPv4("1.1.1.1");
        auto p2 = PingIPv4("8.8.8.8");
        auto dns = ResolveHost(L"api.openai.com");
        auto http = HeadOpenAI();
        auto tp = MeasureThroughput(elapsed);
        auto ip = PrimaryIPv4();

        // отрисовка
        ClearScreen();
        SYSTEMTIME st; GetLocalTime(&st);
        std::printf("NETWATCH  %04d-%02d-%02d %02d:%02d:%02d    interval: %0.1fs\n",
                    st.wYear, st.wMonth, st.wDay, st.wHour, st.wMinute, st.wSecond,
                    intervalMs / 1000.0);
        std::printf("IP: %s\n", ip.c_str());
        std::printf("Throughput:  IN %-12s   OUT %-12s\n",
                    HumanBytes(tp.inBps).c_str(), HumanBytes(tp.outBps).c_str());

        std::printf("\nPING:\n");
        std::printf("  1.1.1.1   : %-4s  rtt=%3lu ms   %s\n",
                    p1.ok ? "OK" : "FAIL", p1.rttMs, p1.ok ? "" : p1.err.c_str());
        std::printf("  8.8.8.8   : %-4s  rtt=%3lu ms   %s\n",
                    p2.ok ? "OK" : "FAIL", p2.rttMs, p2.ok ? "" : p2.err.c_str());

        std::printf("\nDNS:\n");
        std::printf("  api.openai.com : %-4s  %s\n",
                    dns.ok ? "OK" : "FAIL", dns.ok ? dns.addr.c_str() : dns.err.c_str());

        std::printf("\nHTTPS (OpenAI):\n");
        if (http.ok) {
            std::printf("  HEAD https://api.openai.com/v1/models  -> HTTP %lu  (proxy: %s)\n",
                        http.status, http.proxy.c_str());
            std::printf("  Note: HTTP 401 = рукопожатие/TLS/маршрут ОК, токен не передавали (это ожидаемо).\n");
        } else {
            std::printf("  ERROR: %s  (proxy: %s)\n", http.err.c_str(), http.proxy.c_str());
        }

        std::printf("\nPress Ctrl+C to stop.");
        std::fflush(stdout);

        last = now;
        // сон
        for (int slept = 0; slept < intervalMs; slept += 50) {
            std::this_thread::sleep_for(std::chrono::milliseconds(50));
            // простая проверка Ctrl+C — чтобы мгновенно вернуть курсор
            if (GetAsyncKeyState(VK_CANCEL)) break;
        }
    }

    ShowCursor();
    return 0;
}
