
const apiKey = "AIzaSyA9EYTuBT4rnYHSCmleEnZUMc-rdY6S_ME";

async function testModel(modelName) {
    console.log(`Testing ${modelName}...`);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: "Hello" }] }]
            })
        });
        const data = await response.json();
        if (data.error) {
            console.error(`❌ ${modelName} Error:`, data.error.message);
        } else {
            console.log(`✅ ${modelName} Success!`);
        }
    } catch (e) {
        console.error(`❌ ${modelName} Exception:`, e.message);
    }
}

async function run() {
    await testModel("gemini-1.5-flash");
    await testModel("gemini-2.0-flash-exp");
    await testModel("gemini-2.5-flash");
}

run();
