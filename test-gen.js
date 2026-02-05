const https = require('https');
const key = 'AIzaSyBXLOYW2Ei-n0jFi5yqdnCUb78E8uGLzrM';
const model = 'gemini-2.0-flash'; // Testing the one we just picked

const data = JSON.stringify({
    contents: [{ parts: [{ text: "Hello, world!" }] }]
});

const options = {
    hostname: 'generativelanguage.googleapis.com',
    path: `/v1beta/models/${model}:generateContent?key=${key}`,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = https.request(options, (res) => {
    let responseData = '';

    res.on('data', (chunk) => {
        responseData += chunk;
    });

    res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log('Body:', responseData);
    });
});

req.on('error', (error) => {
    console.error('Error:', error);
});

req.write(data);
req.end();
