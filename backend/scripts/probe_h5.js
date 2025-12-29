const axios = require('axios');
require('dotenv').config();

const baseUrl = process.env.RADAR_LOXX_URL || 'http://100.100.81.47:8080/';

// Known timestamp: 2025-11-15 00:00:00
const datePath = '2025-11-15';
const datePathNoHyphen = '20251115';
const filenameBase = 'LOXX_20251115_000000';

const patterns = [
    `${filenameBase}.h5`,
    `${filenameBase}.h5.gz`,
    `${filenameBase}.zip`,
    `${datePath}/${filenameBase}.h5`,
    `${datePath}/${filenameBase}.h5.gz`,
    `${datePath}/${filenameBase}.zip`,
    `${datePathNoHyphen}/${filenameBase}.h5`,
    `${datePathNoHyphen}/${filenameBase}.h5.gz`
];

async function probe() {
    console.log(`Probing ${baseUrl} for H5 files...`);

    for (const pattern of patterns) {
        const url = new URL(pattern, baseUrl).href;
        console.log(`Checking ${url}...`);
        try {
            const res = await axios.head(url, { timeout: 5000 });
            if (res.status === 200) {
                console.log(`✓ FOUND! ${url}`);
                console.log(`Type: ${res.headers['content-type']}`);
                console.log(`Size: ${res.headers['content-length']}`);
                return;
            }
        } catch (err) {
            if (err.response && err.response.status === 404) {
                // console.log('Not found');
            } else {
                console.log(`Error: ${err.message}`);
            }
        }
    }
    console.log('Finished probing. No H5 files found with standard patterns.');
}

probe();
