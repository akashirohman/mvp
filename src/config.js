// src/config.js

const config = {
    // --- Pengaturan IPRoyal Proxy ---
    // SET INI KE true DAN ISI KREDENSIAL JIKA MENGGUNAKAN IPROYAL
    // SET INI KE false JIKA MENGGUNAKAN PROXY GRATISAN
    IPROYAL_PROXY: {
        ENABLED: false, // <-- UBAH INI (true/false) SESUAI KEBUTUHAN ANDA
        HOST: 'geo.iproyal.com', // Ganti dengan Gateway Host IPRoyal Anda
        PORT: 12321,             // Ganti dengan Gateway Port IPRoyal Anda
        USERNAME: 'YOUR_IPROYAL_USERNAME', // Ganti dengan Username IPRoyal Anda
        PASSWORD: 'YOUR_IPROYAL_PASSWORD', // Ganti dengan Password IPRoyal Anda
        PROTOCOL: 'http' // Biasanya 'http', bisa juga 'https' atau 'socks5'
    },

    // --- Pengaturan Proxy Gratis ---
    // Daftar URL penyedia proxy gratis (akan diabaikan jika IPROYAL_PROXY.ENABLED: true)
    // Pastikan URL di sini adalah yang Anda inginkan dan masih aktif
    PROXY_SOURCES: [
        'https://free-proxy-list.net/',
        'https://www.sslproxies.org/',
        'https://www.proxynova.com/proxy-server-list/country-id/',
        'https://hidemy.name/en/proxy-list/?country=ID#list',
        'https://proxyscrape.com/free-proxy-list',
        'http://www.proxy-list.net/',
        'http://www.gatherproxy.com/',
        'https://www.mkproxy.com/free-proxy-list',
        'https://free.proxy.com.kz/',
        // 'http://proxyfish.com/proxies/', // Sering 403, bisa dikomentari
    ],
    PROXY_TEST_URL: 'http://ip-api.com/json', // URL untuk menguji konektivitas
    PROXY_VALIDATION_TIMEOUT: 15000, // Timeout validasi (dalam ms)

    // --- Pengaturan User-Agent ---
    USER_AGENTS: [
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
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu',
            '--disable-infobars',
            '--window-size=1920,1080',
            // ARGUMEN PROXY PUPPETEER: Aktifkan/nonaktifkan berdasarkan IPROYAL_PROXY.ENABLED
            // Jika IPROYAL_PROXY.ENABLED adalah true, argumen ini akan ditambahkan secara otomatis:
            ...(config.IPROYAL_PROXY.ENABLED ? [`--proxy-server=${config.IPROYAL_PROXY.PROTOCOL}://${config.IPROYAL_PROXY.HOST}:${config.IPROYAL_PROXY.PORT}`] : []),
        ]
    },
    Google_Search_URL: 'https://www.google.com/search?q=',
    MAX_Google_Search_PAGES: 10,

    // --- Pengaturan Lainnya ---
    REQUEST_TIMEOUT: 15000, // Timeout umum untuk permintaan HTTP (15 detik)
    MIN_VISIT_DELAY_MS: 1000, // Minimal jeda antar kunjungan per thread
    MAX_VISIT_DELAY_MS: 5000, // Maksimal jeda antar kunjungan per thread
    MAX_PROXY_FAILURES: 3, // Berapa kali proxy gratis bisa gagal sebelum dihapus sementara
    PROXY_RETRY_INTERVAL_MS: 300000, // Waktu (5 menit) sebelum mencoba proxy gagal lagi
};

module.exports = config;
