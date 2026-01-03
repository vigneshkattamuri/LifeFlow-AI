const https = require('https');
const key = 'AIzaSyBXLOYW2Ei-n0jFi5yqdnCUb78E8uGLzrM';

const fs = require('fs');

console.log('Fetching models...');
https.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`, (resp) => {
    let data = '';
    resp.on('data', (chunk) => { data += chunk; });
    resp.on('end', () => {
        try {
            const json = JSON.parse(data);
            fs.writeFileSync('models_output.json', JSON.stringify(json, null, 2));
            console.log('Done. Written to models_output.json');
        } catch (e) {
            console.log(data); // Log raw if not json
        }
    });
}).on("error", (err) => {
    console.log("Error: " + err.message);
});
