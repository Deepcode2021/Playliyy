import JSZip from 'https://esm.sh/jszip@3.10.1';

const container = document.getElementById('cardContainer');
const LINK_INPUT = document.getElementById('link');
const downloadBtn = document.querySelector('#button');

// We store objects now: { id: "...", title: "..." }
let globalYtData = [];

// 1. Listen for Enter key to fetch the playlist metadata
LINK_INPUT.addEventListener('keyup', async function (event) {
    if (event.key === 'Enter') {
        event.preventDefault();

        const playlistId = getPlaylistIdFromUrl(LINK_INPUT.value);
        // Warning: Exposing API keys in client-side JS is a security risk.
        const API_KEY = 'AIzaSyCztruboSxYzKp61Nsp1DOZe7YL99Em7Zc';

        if (playlistId) {
            container.innerHTML = '';
            globalYtData = [];
            await getPlaylistSongNames(playlistId, API_KEY);
        }
    }
});

// 2. Fetch Playlist Logic (Storing Titles + IDs)
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

                // Save metadata for the ZIP process
                globalYtData.push({ id: videoId, title: songTitle });

                // UI Display
                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `<h3>${songTitle}</h3>`;
                container.appendChild(card);
            });
            console.log("Playlist metadata loaded:", globalYtData);
        }
    } catch (error) {
        console.error('YouTube API fetch error:', error);
    }
}

// 3. New Bulk Download Function
async function downloadPlaylistAsZip() {
    if (globalYtData.length === 0) return;

    downloadBtn.innerText = "Processing Bulk ZIP...";
    downloadBtn.disabled = true;

    // Use your specific Hugging Face Space URL
    const hfBase = "https://kyakaruiska-ytmusicapi.hf.space";

    // We send only the IDs to the server; the server handles fetching and zipping
    const ids = globalYtData.map(item => item.id).join(',');

    try {
        // Triggering a direct window location change for a file download
        window.location.href = `${hfBase}/api/bulk-mp3?ids=${ids}`;
    } catch (err) {
        console.error("Bulk download failed:", err);
    } finally {
        // Reset button after a slight delay
        setTimeout(() => {
            downloadBtn.innerText = "Download ZIP";
            downloadBtn.disabled = false;
        }, 5000);
    }
}

// 4. Button Event Listener
downloadBtn.addEventListener('click', downloadPlaylistAsZip);

// Helper Function
function getPlaylistIdFromUrl(link) {
    try {
        const url = new URL(link);
        return url.searchParams.get('list');
    } catch (e) { return null; }
}


