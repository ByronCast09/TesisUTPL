const axios = require('axios');

async function checkApi() {
    try {
        const response = await axios.get('http://localhost:5000/api/radar/LGUAXX/pngs?limit=1');
        if (response.data && response.data.pngs && response.data.pngs.length > 0) {
            const first = response.data.pngs[0];
            if (first.url) {
                console.log('SUCCESS: API returns "url" field.');
            } else {
                console.log('FAILURE: API does NOT return "url" field.');
            }
        } else {
            console.log('WARNING: No pngs found to check.');
        }
    } catch (error) {
        console.error('ERROR calling API:', error.message);
    }
}

checkApi();
