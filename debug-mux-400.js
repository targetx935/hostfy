import fs from 'fs';
import path from 'path';

function parseEnv() {
    const envPath = path.resolve('.env');
    if (!fs.existsSync(envPath)) return {};
    const content = fs.readFileSync(envPath, 'utf8');
    const env = {};
    content.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
            let value = match[2] || '';
            if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
            env[match[1]] = value;
        }
    });
    return env;
}

async function debugMux() {
    const env = parseEnv();
    const muxTokenId = env.MUX_TOKEN_ID;
    const muxTokenSecret = env.MUX_TOKEN_SECRET;

    if (!muxTokenId || !muxTokenSecret) {
        console.error("❌ Credentials missing");
        return;
    }

    const videoId = "test-video-id-" + Date.now();
    const filePath = "";

    console.log("Mocking Mux Upload URL Request...");

    try {
        const auth = Buffer.from(`${muxTokenId}:${muxTokenSecret}`).toString('base64');
        const response = await fetch("https://api.mux.com/video/v1/uploads", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${auth}`,
            },
            body: JSON.stringify({
                cors_origin: "*",
                new_asset_settings: {
                    playback_policy: ["public"],
                    passthrough: JSON.stringify({ videoId, filePath: filePath || "" }),
                },
            }),
        });

        const status = response.status;
        const data = await response.json();

        if (response.ok) {
            console.log("✅ SUCCESS! Mux accepted the request.");
            console.log("URL:", data.data.url);
        } else {
            console.log(`❌ FAILED with status ${status}`);
            console.log("Mux Error Response:", JSON.stringify(data, null, 2));
        }
    } catch (err) {
        console.error("Error:", err);
    }
}

debugMux();
