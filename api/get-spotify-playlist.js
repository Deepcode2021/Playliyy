// api/get-spotify-playlist.js
export default async function handler(req, res) {
    const { id } = req.query;

    // 1. Get Access Token
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const authString = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    try {
        const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${authString}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=client_credentials'
        });
        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        // 2. Get Playlist Tracks (Fetching first 100 for speed)
        const playlistUrl = `https://api.spotify.com/v1/playlists/${id}/tracks?limit=100`;
        const playlistResponse = await fetch(playlistUrl, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const playlistData = await playlistResponse.json();

        // 3. Format data to match your frontend structure
        const items = playlistData.items.map(item => {
            if (!item.track) return null;
            return {
                id: item.track.id,     // We need this to build the link later
                title: item.track.name // Display name
            };
        }).filter(item => item !== null);

        res.status(200).json({ items });

    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch Spotify playlist' });
    }
}