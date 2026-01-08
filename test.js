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
        const API_KEY = 'AIzaSyCztruboSxYzKp61Nsp1DOZe7YL99Em7Zc';

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
// 3. New Optimized "Batch" Download with Progress Bar
async function downloadPlaylistAsZip() {
    if (globalYtData.length === 0) {
        alert("No videos loaded!");
        return;
    }

    // UI Elements
    const btnText = document.getElementById('btnText');
    const progressFill = document.getElementById('progressFill');
    const downloadBtn = document.querySelector('#button');

    // Reset UI
    btnText.innerText = "Starting...";
    progressFill.style.width = "0%";
    downloadBtn.disabled = true;

    const zip = new JSZip();
    const RAPID_API_KEY = 'e7cee6fc2emsh1aadaf3963b1282p1b2464jsn776d15b5ce96';
    const RAPID_HOST = 'youtube-mp3-2025.p.rapidapi.com';

    const BATCH_SIZE = 3;

    // Helper for single video processing
    const processVideo = async (video) => {
        try {
            const apiUrl = `https://${RAPID_HOST}/v1/social/youtube/audio`;
            const options = {
                method: 'POST',
                headers: {
                    'x-rapidapi-key': RAPID_API_KEY,
                    'x-rapidapi-host': RAPID_HOST,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id: video.id })
            };

            const response = await fetch(apiUrl, options);
            const data = await response.json();
            const downloadLink = data.linkDownload || data.link || data.url;

            if (downloadLink) {
                const audioResponse = await fetch(downloadLink);
                const audioBlob = await audioResponse.blob();
                const safeTitle = video.title.replace(/[\\/:*?"<>|]/g, "_").trim();
                zip.file(`${safeTitle}.mp3`, audioBlob);
                return true;
            }
        } catch (error) {
            console.error(`Failed: ${video.title}`, error);
            return false;
        }
    };

    try {
        const totalVideos = globalYtData.length;
        let processedCount = 0;

        // --- BATCH LOOP ---
        for (let i = 0; i < totalVideos; i += BATCH_SIZE) {
            const batch = globalYtData.slice(i, i + BATCH_SIZE);

            // Run batch
            await Promise.all(batch.map(video => processVideo(video)));

            // Update Progress Math
            processedCount += batch.length;
            // Clamp to 100% just in case
            const percent = Math.min((processedCount / totalVideos) * 100, 100);

            // Update UI
            
            progressFill.style.width = `${percent}%`;
            btnText.innerText = `Downloading... ${Math.round(percent)}%`;

            // Cooldown
            await sleep(1000);
        }

        // Generate ZIP
        btnText.innerText = "Zipping files...";
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const zipUrl = URL.createObjectURL(zipBlob);

        const link = document.createElement('a');
        link.href = zipUrl;
        link.download = `Playlist_Download_${Date.now()}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Success State
        btnText.innerText = "Done! Download Started";
        progressFill.style.backgroundColor = "#2196F3"; // Change color to blue on finish

    } catch (err) {
        console.error("Error:", err);
        btnText.innerText = "Error Occurred";
        progressFill.style.backgroundColor = "red";
    } finally {
        // Optional: Re-enable button after a few seconds
        setTimeout(() => {
            downloadBtn.disabled = false;
            btnText.innerText = "Download ZIP";
            progressFill.style.width = "0%";
            progressFill.style.backgroundColor = "#4caf50"; // Reset color
        }, 5000);
    }
}
downloadBtn.addEventListener('click', downloadPlaylistAsZip);

function getPlaylistIdFromUrl(link) {
    try {
        const url = new URL(link);
        return url.searchParams.get('list');
    } catch (e) { return null; }
}