const LINK = document.getElementById('link');
const link = LINK.value;
// console.log(LINK.value);
function getPlaylistIdFromUrl(LINK) {
    try {
        // 1. Create a URL object from the string
        const url = new URL(LINK);
        const params = new URLSearchParams(url.search);
        const playlistId = params.get('list');
        return playlistId;

    } catch (error) {
        // Handle invalid URLs (e.g., if the string isn't a valid URL format)
        console.error("Invalid URL provided:", error.message);
        return null;
    }
}

async function downloadYoutubeAsMp3(youtubeUrl) {
    // You would typically use a service like RapidAPI's "YouTube MP3" 
    const options = {
        method: 'GET',
        headers: {
            'X-RapidAPI-Key': '1a331aace8msh615507eb01b1205p19a1a2jsn2697b521d79a',
            'X-RapidAPI-Host': 'youtube-mp36.p.rapidapi.com'
        }
    };

    const response = await fetch(`https://youtube-mp36.p.rapidapi.com/dl?id=${getPlaylistIdFromUrl(youtubeUrl)}`, options);
    const data = await response.json();

    if (data.status === "ok") {
        // Redirect user to the generated download link
        window.location.href = data.link;
    }
}

downloadYoutubeAsMp3(link);