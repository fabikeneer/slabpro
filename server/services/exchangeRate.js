const https = require('https');

let currentRate = null;
let lastUpdate = null;
let isFetching = false;

function fetchBinanceRate() {
    return new Promise((resolve) => {
        if (isFetching) return resolve(currentRate);
        isFetching = true;
        
        const url = 'https://ve.dolarapi.com/v1/dolares';
        
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                isFetching = false;
                try {
                    const parsed = JSON.parse(data);
                    if (Array.isArray(parsed)) {
                        const paralelo = parsed.find(item => item.fuente === 'paralelo' || item.nombre === 'Paralelo');
                        if (paralelo && paralelo.promedio) {
                            currentRate = parseFloat(paralelo.promedio);
                            lastUpdate = new Date().toISOString();
                            console.log(`[ExchangeRate] Tasa actualizada: ${currentRate} VES/USD (DolarAPI Paralelo)`);
                        }
                    }
                } catch (err) {
                    console.error('[ExchangeRate] Error parseando respuesta de API:', err.message);
                }
                resolve(currentRate);
            });
        }).on('error', (err) => {
            isFetching = false;
            console.error('[ExchangeRate] Error obteniendo tasa de API:', err.message);
            resolve(currentRate);
        });
    });
}

// Iniciar proceso de polling (cada 30 minutos)
function startPolling() {
    // Buscar al inicio
    fetchBinanceRate();
    
    // 30 mins = 30 * 60 * 1000 = 1800000 ms
    setInterval(fetchBinanceRate, 1800000);
}

function getRate() {
    return {
        rate: currentRate,
        lastUpdate: lastUpdate
    };
}

module.exports = {
    startPolling,
    getRate,
    forceUpdate: async () => {
        await fetchBinanceRate();
        return getRate();
    }
};
