import JSZip from 'https://esm.sh/jszip@3.10.1';

// 1. HELPER: Sleep function
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const container = document.getElementById('cardContainer');
const LINK_INPUT = document.getElementById('link');
const downloadBtn = document.querySelector('#button');
// Grab the new UI elements for progress
const btnText = document.getElementById('btnText');
const progressFill = document.getElementById('progressFill');

let globalYtData = [];

// 2. LISTEN: Fetch Playlist
LINK_INPUT.addEventListener('keyup', async function (event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        const playlistId = getPlaylistIdFromUrl(LINK_INPUT.value);

        if (playlistId) {
            container.innerHTML = '';
            globalYtData = [];
            // Calling our secure Vercel API
            await getPlaylistSongNames(playlistId);
        }
    }
});

// 3. FETCH: Get Titles & IDs (Calls /api/get-playlist)
async function getPlaylistSongNames(playlistId) {
    
    const url = `/api/get-playlist?id=${playlistId}`;

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
        console.error('Error fetching playlist:', error);
        alert("Failed to load playlist. Make sure the ID is correct.");
    }
}

// 4. DOWNLOAD: Bulk Download (Calls /api/get-download-link)
async function downloadPlaylistAsZip() {
    if (globalYtData.length === 0) {
        alert("No videos loaded!");
        return;
    }

    // Reset UI
    btnText.innerText = "Starting...";
    progressFill.style.width = "0%";
    downloadBtn.disabled = true;

    const zip = new JSZip();
    const BATCH_SIZE = 3;

    // Helper: Call our secure Vercel API
    const processVideo = async (video) => {
        try {
            // UPDATED: Pointing to our backend
            const apiUrl = `/api/get-download-link`;

            const options = {
                method: 'POST',
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

        for (let i = 0; i < totalVideos; i += BATCH_SIZE) {
            const batch = globalYtData.slice(i, i + BATCH_SIZE);

            await Promise.all(batch.map(video => processVideo(video)));

            processedCount += batch.length;
            const percent = Math.min((processedCount / totalVideos) * 100, 100);

            progressFill.style.width = `${percent}%`;
            btnText.innerText = `Downloading... ${Math.round(percent)}%`;

            await sleep(1000);
        }

        btnText.innerText = "Zipping files...";
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const zipUrl = URL.createObjectURL(zipBlob);

        const link = document.createElement('a');
        link.href = zipUrl;
        link.download = `Playlist_Download_${Date.now()}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        btnText.innerText = "Done!";
        progressFill.style.backgroundColor = "#2196F3";

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

function getPlaylistIdFromUrl(link) {
    try {
        const url = new URL(link);
        return url.searchParams.get('list');
    } catch (e) { return null; }
}
