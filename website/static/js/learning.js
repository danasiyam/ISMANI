// Get the play buttons and the video viewer modal
const playButtons = document.querySelectorAll('.play-button');
const videoViewer = document.getElementById('video-viewer');
const videoPreview = document.getElementById('video-preview');
const letterTitle = document.getElementById('letter-title');
const closeViewerButton = document.getElementById('close-viewer');

// Add click event to play buttons
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
    videoViewer.style.display = 'none';  // Hide the video modal
    videoPreview.pause();  // Pause the video
    videoPreview.src = '';  // Reset the video source
});
