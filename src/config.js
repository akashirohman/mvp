// src/config.js

const config = {
    // --- Pengaturan Proxy ---
    PROXY_SOURCES: [
        'https://free-proxy-list.net/', 
        'https://www.sslproxies.org/',
        'http://www.proxy-list.net/',
        'http://www.gatherproxy.com/',
        'https://www.mkproxy.com/free-proxy-list',
        'https://free.proxy.com.kz/',
        'http://proxyfish.com/proxies/',
    ],
    PROXY_TEST_URL: 'http://ip-api.com/json', // URL untuk menguji konektivitas dan mendapatkan info IP proxy
    PROXY_VALIDATION_TIMEOUT: 5000, // Timeout dalam ms untuk validasi proxy

    // --- Pengaturan User-Agent ---
    USER_AGENTS: [
        // Daftar User-Agent populer untuk simulasi browser yang berbeda
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/121.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/120.0.0.0',
        'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    ],

    // --- Pengaturan Puppeteer (untuk Google Search) ---
    PUPPETEER_LAUNCH_OPTIONS: {
        headless: true, // true untuk mode tanpa GUI, false untuk melihat browser (hanya untuk debugging)
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process', // Penting untuk beberapa lingkungan
            '--disable-gpu',
            '--disable-infobars',
            '--window-size=1920,1080',
        ]
    },
    Google_Search_URL: 'https://www.google.com/search?q=', // Perhatikan underscore dan huruf kapital
    MAX_Google_Search_PAGES: 10, // Maksimal halaman Google yang akan dicari

    // --- Pengaturan Lainnya ---
    REQUEST_TIMEOUT: 15000, // Timeout umum untuk permintaan HTTP (15 detik)
    MIN_VISIT_DELAY_MS: 1000, // Minimal jeda antar kunjungan per thread
    MAX_VISIT_DELAY_MS: 5000, // Maksimal jeda antar kunjungan per thread
    MAX_PROXY_FAILURES: 3, // Berapa kali proxy bisa gagal sebelum dihapus sementara
    PROXY_RETRY_INTERVAL_MS: 300000, // Waktu (5 menit) sebelum mencoba proxy gagal lagi
};

module.exports = config;
