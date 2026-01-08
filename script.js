import JSZip from 'https://esm.sh/jszip@3.10.1';

// 1. HELPER: Sleep function to prevent API blocking
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const container = document.getElementById('cardContainer');
const LINK_INPUT = document.getElementById('link');
const downloadBtn = document.querySelector('#button');

let globalYtData = [];

// 2. LISTEN: Fetch playlist metadata
LINK_INPUT.addEventListener('keyup', async function (event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        const playlistId = getPlaylistIdFromUrl(LINK_INPUT.value);
        const API_KEY = ${{ secrets.YOUTUBE_API_KEY }};

        if (playlistId) {
            container.innerHTML = '';
            globalYtData = [];
            await getPlaylistSongNames(playlistId, API_KEY);
        }
    }
});

// 3. FETCH: Get Titles & IDs
async function getPlaylistSongNames(playlistId, apiKey) {
    const MAX_RESULTS = 50;
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&key=${apiKey}&maxResults=${MAX_RESULTS}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.items) {
            data.items.forEach((item) => {
                const songTitle = item.snippet.title;
                const videoId = item.snippet.resourceId.videoId;
                globalYtData.push({ id: videoId, title: songTitle });

                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `<h3>${songTitle}</h3>`;
                container.appendChild(card);
            });
        }
    } catch (error) {
        console.error('YouTube API fetch error:', error);
    }
}

// 4. DOWNLOAD: Updated to use the correct /v1/social/youtube/audio endpoint
async function downloadPlaylistAsZip() {
    if (globalYtData.length === 0) {
        alert("No videos loaded!");
        return;
    }

    downloadBtn.innerText = "Starting Bulk Download...";
    downloadBtn.disabled = true;

    const zip = new JSZip();
    const RAPID_API_KEY = ${{ secrets.RAPID_API_KEY }};
    const RAPID_HOST = 'youtube-mp3-2025.p.rapidapi.com';

    try {
        for (const [index, video] of globalYtData.entries()) {

            downloadBtn.innerText = `Processing ${index + 1}/${globalYtData.length}`;
            console.log(`Processing: ${video.title}`);

            try {
                // FIXED: Using the endpoint from your snippet
                const apiUrl = `https://${RAPID_HOST}/v1/social/youtube/audio`;

                const options = {
                    method: 'POST',
                    headers: {
                        'x-rapidapi-key': RAPID_API_KEY,
                        'x-rapidapi-host': RAPID_HOST,
                        'Content-Type': 'application/json'
                    },
                    // FIXED: Sending just the ID as per your snippet
                    body: JSON.stringify({ id: video.id })
                };

                const response = await fetch(apiUrl, options);
                const data = await response.json();

                // Check for the link in the response (using your previous JSON structure)
                // Note: Some APIs return 'linkDownload', others 'url', or 'link'. 
                // We check 'linkDownload' first based on your logs.
                const downloadLink = data.linkDownload || data.link || data.url;

                if (downloadLink) {
                    const audioResponse = await fetch(downloadLink);
                    const audioBlob = await audioResponse.blob();

                    // Sanitize title
                    const safeTitle = video.title.replace(/[\\/:*?"<>|]/g, "_").trim();
                    zip.file(`${safeTitle}.mp3`, audioBlob);
                } else {
                    console.warn(`Skipping ${video.title}: No download link found. API Response:`, data);
                }

            } catch (innerError) {
                console.error(`Error on song "${video.title}":`, innerError);
            }

            // Sleep 1.5s to avoid hitting API rate limits
            await sleep(1500);
        }

        // Generate ZIP
        downloadBtn.innerText = "Zipping...";
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const zipUrl = URL.createObjectURL(zipBlob);

        const link = document.createElement('a');
        link.href = zipUrl;
        link.download = `Playlist_Download_${Date.now()}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (err) {
        console.error("Critical Error:", err);
        alert("Download failed. Check console.");
    } finally {
        downloadBtn.innerText = "Download ZIP";
        downloadBtn.disabled = false;
    }
}

downloadBtn.addEventListener('click', downloadPlaylistAsZip);

function getPlaylistIdFromUrl(link) {
    try {
        const url = new URL(link);
        return url.searchParams.get('list');
    } catch (e) { return null; }

}
