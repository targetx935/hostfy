const fetch = globalThis.fetch;
const SUPABASE_URL = 'https://zsxrpiubhvtxwecbfamg.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzeHJwaXViaHZ0eHdlY2JmYW1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MDA1NTEsImV4cCI6MjA4NzQ3NjU1MX0.PH9IRwChsKv9gUDLwjRQU2xMvF2Fcx3WaWER0Bm0VJ0';
const KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ANON_KEY;

async function fixUrls() {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/videos?url=like.https://iframe.mediadelivery.net*`, {
            headers: { 'apikey': KEY, 'Authorization': 'Bearer ' + KEY }
        });
        const videos = await res.json();

        console.log(`Found ${videos.length} videos to fix.`);

        for (const v of videos) {
            if (!v.bunny_id) continue;
            const newUrl = `https://vz-db553844-7d5.b-cdn.net/${v.bunny_id}/playlist.m3u8`;

            const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/videos?id=eq.${v.id}`, {
                method: 'PATCH',
                headers: {
                    'apikey': KEY,
                    'Authorization': 'Bearer ' + KEY,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({ url: newUrl })
            });

            if (updateRes.ok) {
                console.log('Fixed URL for video:', v.title, newUrl);
            } else {
                console.error('Failed to update:', v.id, await updateRes.text());
            }
        }
    } catch (e) {
        console.error(e);
    }
}

fixUrls();
