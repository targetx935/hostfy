import 'dotenv/config';

const testUploadConfig = async () => {
    try {
        const response = await fetch(`${process.env.VITE_SUPABASE_URL}/functions/v1/get-bunny-upload-config`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`,
                'apikey': process.env.VITE_SUPABASE_ANON_KEY
            },
            body: JSON.stringify({
                title: "Test Debug Video",
                videoId: "test-id-123"
            })
        });

        const data = await response.json();
        console.log("Status:", response.status);
        console.log("Data:", data);

        if (!response.ok) {
            console.error("FAILED TO FETCH configuration", data);
        }
    } catch (e) {
        console.error("Network or parsing error", e);
    }
}

testUploadConfig();
