const axios = require('axios');
require('dotenv').config();

const radarUrl = process.env.RADAR_LOXX_URL || 'http://100.100.81.47:8080/';

console.log(`Inspecting remote index at ${radarUrl}...`);

async function inspectIndex() {
    try {
        // Try getting index.json
        const candidates = [
            new URL('index.json', radarUrl).href,
            new URL('api/radar/index', radarUrl).href
        ];

        for (const url of candidates) {
            console.log(`Trying ${url}...`);
            try {
                const response = await axios.get(url, { timeout: 10000 });
                console.log(`✓ Success fetching ${url}`);
                console.log('--- Response Snippet ---');

                let data = response.data;
                if (typeof data === 'string') {
                    console.log('Response is string, first 500 chars:');
                    console.log(data.substring(0, 500));
                } else if (typeof data === 'object') {
                    console.log('Response is object/JSON.');
                    if (data.dates) {
                        const dates = Object.keys(data.dates);
                        console.log(`Found ${dates.length} dates.`);
                        if (dates.length > 0) {
                            const firstDate = dates[0];
                            console.log(`Sample date: ${firstDate}`);
                            console.log(`Files in ${firstDate}:`, data.dates[firstDate]);
                        }
                    } else if (Array.isArray(data)) {
                        console.log('Response is array, first item:', data[0]);
                    } else {
                        console.log('Keys:', Object.keys(data));
                        // Introspect first few keys to see filenames
                        const keys = Object.keys(data).slice(0, 5);
                        keys.forEach(k => console.log(`${k}:`, data[k]));
                    }
                }
                return; // Stop after first success
            } catch (err) {
                console.log(`✗ Failed to fetch ${url}: ${err.message}`);
            }
        }
    } catch (err) {
        console.error('Fatal error:', err);
    }
}

inspectIndex();
