import fs from 'fs';
import path from 'path';

function parseEnv() {
    const envPath = path.resolve('.env');
    if (!fs.existsSync(envPath)) {
        console.error("❌ .env file not found");
        return {};
    }
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n');
    const env = {};
    for (const line of lines) {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
            let value = match[2] || '';
            if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
            if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
            env[match[1]] = value;
        }
    }
    return env;
}

async function testMux() {
    const env = parseEnv();
    const muxTokenId = env.MUX_TOKEN_ID;
    const muxTokenSecret = env.MUX_TOKEN_SECRET;

    console.log("Testing Mux API with:");
    console.log("ID:", muxTokenId);
    console.log("Secret length:", muxTokenSecret?.length);

    if (!muxTokenId || !muxTokenSecret) {
        console.error("❌ MUX_TOKEN_ID or MUX_TOKEN_SECRET not found in .env");
        return;
    }

    try {
        const auth = Buffer.from(`${muxTokenId}:${muxTokenSecret}`).toString('base64');
        const response = await fetch("https://api.mux.com/video/v1/assets", {
            method: "GET",
            headers: {
                Authorization: `Basic ${auth}`,
            }
        });

        if (response.ok) {
            console.log("✅ Mux API connection successful!");
            const data = await response.json();
            console.log(`Found ${data.data.length} assets.`);
            data.data.forEach(asset => {
                console.log(`- ID: ${asset.id} | Status: ${asset.status} | Created: ${new Date(asset.created_at * 1000).toLocaleString()}`);
            });
        } else {
            console.log("❌ Mux API connection failed.");
            console.log("Status:", response.status);
            const text = await response.text();
            console.log("Error Detail:", text);
        }
    } catch (err) {
        console.error("Error connecting to Mux:", err);
    }
}

testMux();
