export default async function handler(request, response) {
    // 1. Setup CORS
    response.setHeader('Access-Control-Allow-Credentials', true);
    response.setHeader('Access-Control-Allow-Origin', '*');

    // 2. Get the Playlist ID from the URL query (e.g., ?id=PL123...)
    const { id } = request.query;

    if (!id) {
        return response.status(400).json({ error: 'Missing Playlist ID' });
    }

    const API_KEY = process.env.YOUTUBE_API_KEY; // Secure Key
    const MAX_RESULTS = 50;
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${id}&key=${API_KEY}&maxResults=${MAX_RESULTS}`;

    try {
        const ytResponse = await fetch(url);
        const data = await ytResponse.json();

        if (data.error) {
            return response.status(500).json(data.error);
        }

        response.status(200).json(data);
    } catch (error) {
        response.status(500).json({ error: 'Failed to fetch YouTube data' });
    }
}