// api/get-spotify-download.js
export default async function handler(req, res) {
    // We expect the POST body to contain the track ID
    const { id } = JSON.parse(req.body);
    const spotifyUrl = `https://open.spotify.com/track/${id}`;

    const apiKey = process.env.RAPIDAPI_KEY; // Your e7cee... key
    const apiHost = 'spotify-music-mp3-downloader-api.p.rapidapi.com';

    const url = `https://${apiHost}/download?link=${encodeURIComponent(spotifyUrl)}`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'x-rapidapi-key': apiKey,
                'x-rapidapi-host': apiHost
            }
        });

        const json = await response.json();

        // Logic from your screenshot
        if (json.success && json.data && json.data.medias) {
            const downloadLink = json.data.medias[0].url;
            res.status(200).json({ link: downloadLink });
        } else {
            res.status(404).json({ error: 'No link found' });
        }

    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch download link' });
    }
}