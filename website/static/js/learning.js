// Get the play buttons and the video viewer modal
const playButtons = document.querySelectorAll('.play-button');
const videoViewer = document.getElementById('video-viewer');
const videoPreview = document.getElementById('video-preview');
const letterTitle = document.getElementById('letter-title');
const closeViewerButton = document.getElementById('close-viewer');

//mute videos 
videoPreview.muted = true;

videoPreview.addEventListener('volumechange', () => {
    if (!videoPreview.muted) {
        videoPreview.muted = true; // Re-mute the video if it is unmuted
    }
});

// click event to play buttons
playButtons.forEach(button => {
    const letterBox = button.closest('.letter-box');
    const letter = letterBox.dataset.letter;
    const videoSrc = letterBox.dataset.video;

    // Play video when the play button is clicked
    button.addEventListener('click', () => {
        letterTitle.textContent = `حرف ${letter}`;
        videoPreview.src = videoSrc;
        videoViewer.style.display = 'block';  // Show the video modal
        videoPreview.play();  // Start playing the video
    });
});

// Close the video viewer when the "Close" button is clicked
closeViewerButton.addEventListener('click', () => {
    videoViewer.style.display = 'none';  
    videoPreview.pause();  
    videoPreview.src = ''; 
});
