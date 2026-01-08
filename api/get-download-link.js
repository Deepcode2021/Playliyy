export default async function handler(request, response) {
    // 1. Allow CORS (So your frontend can talk to this backend)
    response.setHeader('Access-Control-Allow-Credentials', true);
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    response.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Handle standard browser checks
    if (request.method === 'OPTIONS') {
        response.status(200).end();
        return;
    }

    // 2. Get the Video ID from the frontend request
    // We expect a POST request with { id: "videoId" }
    const { id } = JSON.parse(request.body);

    if (!id) {
        return response.status(400).json({ error: 'No video ID provided' });
    }

    // 3. Call RapidAPI using the Secret Key
    const rapidUrl = `https://youtube-mp3-2025.p.rapidapi.com/v1/social/youtube/audio`;
    const options = {
        method: 'POST',
        headers: {
            'x-rapidapi-key': process.env.RAPID_API_KEY, // SECURE KEY HERE
            'x-rapidapi-host': 'youtube-mp3-2025.p.rapidapi.com',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: id })
    };

    try {
        const apiRes = await fetch(rapidUrl, options);
        const data = await apiRes.json();

        // 4. Send the result back to your frontend
        response.status(200).json(data);
    } catch (error) {
        console.error("RapidAPI Error:", error);
        response.status(500).json({ error: 'Failed to fetch from RapidAPI' });
    }
}