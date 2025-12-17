import JSZip from 'https://esm.sh/jszip@3.10.1';

const container = document.getElementById('cardContainer');
const LINK_INPUT = document.getElementById('link');
const downloadBtn = document.querySelector('#button');

// We store the IDs here so the "Download" button can access them later
let globalYtUrls = [];

// 1. Listen for Enter key to fetch the playlist
LINK_INPUT.addEventListener('keyup', async function (event) {
    if (event.key === 'Enter') {
        event.preventDefault();

        const playlistId = getPlaylistIdFromUrl(LINK_INPUT.value);
        const API_KEY = 'AIzaSyCztruboSxYzKp61Nsp1DOZe7YL99Em7Zc';

        if (playlistId) {
            // Clear previous data
            container.innerHTML = '';
            globalYtUrls = [];
            await getPlaylistSongNames(playlistId, API_KEY);
        }

    }
});

// 2. Fetch logic
async function getPlaylistSongNames(playlistId, apiKey) {
    const MAX_RESULTS = 50;
    let url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&key=${apiKey}&maxResults=${MAX_RESULTS}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.items) {
            data.items.forEach((item) => {
                const songname = item.snippet.title;
                const songurl = item.snippet.resourceId.videoId;

                // Add to our global list for the zip function
                globalYtUrls.push(songurl);

                // UI Display
                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `<h3>${songname}</h3>`;
                container.appendChild(card);
            });
            console.log("Fetched IDs:", globalYtUrls);
        }
    } catch (error) {
        console.error('Fetch error:', error);
    }
}

// 3. ZIP and Convert Logic
async function convertAndZip(ids) {
    const zip = new JSZip();
    const RAPID_API_KEY = '1a331aace8msh615507eb01b1205p19a1a2jsn2697b521d79a';

    console.log("Starting ZIP process for", ids.length, "songs...");

    // Map every ID to a fetch promise
    const tasks = ids.map(async (videoId, index) => {
        try {
            const apiResponse = await fetch(`https://youtube-mp36.p.rapidapi.com/dl?id=${videoId}`, {
                headers: {
                    'X-RapidAPI-Key': RAPID_API_KEY,
                    'X-RapidAPI-Host': 'youtube-mp36.p.rapidapi.com'
                }
            });
            const apiData = await apiResponse.json();

            if (apiData.status === "ok") {
                const mp3Res = await fetch(apiData.link);
                const blob = await mp3Res.blob();
                const fileName = apiData.title ? `${apiData.title}.mp3` : `song-${index}.mp3`;
                zip.file(fileName, blob);
                console.log(`Added: ${fileName}`);
            }
        } catch (err) {
            console.error("Failed to convert song:", videoId);
        }
    });

    await Promise.all(tasks);

    const content = await zip.generateAsync({ type: "blob" });
    const downloadUrl = URL.createObjectURL(content);

    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = "playlist.zip";
    a.click();
    URL.revokeObjectURL(downloadUrl);
}

// 4. Download Button Trigger
downloadBtn.addEventListener('click', async function () {
    if (globalYtUrls.length === 0) {
        // alert("No songs found to download!");
        return;
    }
    // downloadBtn.innerText = "Processing...";
    // await convertAndZip(globalYtUrls);
    downloadPlaylistAsZip(); 
    // downloadBtn.innerText = "Download ZIP";
});

// Helper Function
function getPlaylistIdFromUrl(link) {
    try {
        const url = new URL(link);
        return url.searchParams.get('list');
    } catch (e) { return null; }
}

function downloadPlaylistAsZip() {
    // globalYtUrls is your array of video IDs from the YouTube API
    const ids = globalYtUrls.join(',');
    const hfBase = "https://kyakaruiska-yt-bulk-zip-api.hf.space";

    // This starts one single download of the entire .zip
    window.location.href = `${hfBase}/api/bulk-mp3?ids=${ids}`;
}