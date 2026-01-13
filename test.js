import JSZip from 'https://esm.sh/jszip@3.10.1';

// 1. HELPER: Sleep function
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const container = document.getElementById('cardContainer');
const LINK_INPUT = document.getElementById('link');
const downloadBtn = document.querySelector('#button');
const btnText = document.getElementById('btnText');
const progressFill = document.getElementById('progressFill');

// Store data here regardless of platform
let globalTrackData = [];
let currentPlatform = ''; // 'youtube' or 'spotify'

// 2. HELPER: Detect Platform
function getPlatform(link) {
    try {
        const url = new URL(link);
        if (url.hostname.includes('spotify.com') || url.hostname.includes('spoti.fi')) return 'spotify';
        if (url.hostname.includes('youtube.com') || url.hostname.includes('youtu.be')) return 'youtube';
        return 'unknown';
    } catch { return 'invalid'; }
}

// 3. LISTEN: Main Logic
LINK_INPUT.addEventListener('keyup', async function (event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        const rawLink = LINK_INPUT.value;
        currentPlatform = getPlatform(rawLink);

        container.innerHTML = '';
        globalTrackData = [];

        if (currentPlatform === 'youtube') {
            const playlistId = new URL(rawLink).searchParams.get('list');
            if (playlistId) await fetchTracks(`/api/get-playlist?id=${playlistId}`);
        }
        else if (currentPlatform === 'spotify') {
            // Extract ID: .../playlist/37i9dQZF1DXcBWIGoYBM5M...
            const match = rawLink.match(/playlist\/([a-zA-Z0-9]+)/);
            if (match) await fetchTracks(`/api/get-spotify-playlist?id=${match[1]}`);
        }
        else {
            alert("Please enter a valid YouTube or Spotify playlist link.");
        }
    }
});

// 4. FETCH: Generic Track Fetcher (Works for both)
async function fetchTracks(apiUrl) {
    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.items) {
            data.items.forEach((item) => {
                // Unified structure for both platforms
                let title, id;

                if (currentPlatform === 'youtube') {
                    title = item.snippet.title;
                    id = item.snippet.resourceId.videoId;
                } else {
                    title = item.title;
                    id = item.id;
                }

                globalTrackData.push({ id, title });

                // Create Card UI
                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `<h3>${title}</h3>`;
                container.appendChild(card);
            });
        }
    } catch (error) {
        console.error('Error fetching playlist:', error);
        alert("Failed to load playlist.");
    }
}

// 5. DOWNLOAD: Bulk Download
async function downloadPlaylistAsZip() {
    if (globalTrackData.length === 0) {
        alert("No videos loaded!");
        return;
    }

    btnText.innerText = "Starting...";
    progressFill.style.width = "0%";
    downloadBtn.disabled = true;

    const zip = new JSZip();
    const BATCH_SIZE = 3;

    // Helper: Selects the correct API endpoint
    const processItem = async (track) => {
        try {
            let apiUrl = '';

            // Choose API based on platform
            if (currentPlatform === 'youtube') {
                apiUrl = `/api/get-download-link`; // Your existing YT backend
            } else {
                apiUrl = `/api/get-spotify-download`; // Your NEW Spotify backend
            }

            const response = await fetch(apiUrl, {
                method: 'POST',
                body: JSON.stringify({ id: track.id })
            });
            const data = await response.json();

            // Handle different response structures
            const downloadLink = data.link || data.url || data.linkDownload;

            if (downloadLink) {
                const audioResponse = await fetch(downloadLink);
                const audioBlob = await audioResponse.blob();
                const safeTitle = track.title.replace(/[\\/:*?"<>|]/g, "_").trim();
                zip.file(`${safeTitle}.mp3`, audioBlob);
                return true;
            }
        } catch (error) {
            console.error(`Failed: ${track.title}`, error);
            return false;
        }
    };

    // --- BATCH DOWNLOADING LOOP ---
    try {
        const total = globalTrackData.length;
        let processedCount = 0;

        for (let i = 0; i < total; i += BATCH_SIZE) {
            const batch = globalTrackData.slice(i, i + BATCH_SIZE);
            await Promise.all(batch.map(track => processItem(track)));

            processedCount += batch.length;
            const percent = Math.min((processedCount / total) * 100, 100);
            progressFill.style.width = `${percent}%`;
            btnText.innerText = `Downloading... ${Math.round(percent)}%`;

            await sleep(1000); // Prevent rate limits
        }

        btnText.innerText = "Zipping files...";
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const zipUrl = URL.createObjectURL(zipBlob);

        const link = document.createElement('a');
        link.href = zipUrl;
        link.download = `${currentPlatform}_Playlist_${Date.now()}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        btnText.innerText = "Done!";
        progressFill.style.backgroundColor = "#dedede";

    } catch (err) {
        console.error("Error:", err);
        btnText.innerText = "Error Occurred";
        progressFill.style.backgroundColor = "red";
    } finally {
        setTimeout(() => {
            downloadBtn.disabled = false;
            btnText.innerText = "Download ZIP";
            progressFill.style.width = "0%";
            progressFill.style.backgroundColor = "#4caf50";
        }, 5000);
    }
}

downloadBtn.addEventListener('click', downloadPlaylistAsZip);