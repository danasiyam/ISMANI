const webcamElement = document.getElementById('webcam');
const terminalElement = document.getElementById('terminal');
const startWebcamButton = document.getElementById('start-webcam-btn');
const stopWebcamButton = document.getElementById('stop-webcam-btn'); // Stop button

let isWebcamStarted = false;
let intervalId = null;

// Function to update the terminal with the detected letters and actions
function updateTerminal(detectedLetters, detectedActions) {
    terminalElement.innerHTML = `
        <p> ${detectedLetters || 'None'}</p>
    `;
}

// Function to start the webcam
async function startWebcam() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        webcamElement.srcObject = stream;
        isWebcamStarted = true;
        startWebcamButton.style.display = 'none';
        stopWebcamButton.style.display = 'inline-block';
        startDetection();
    } catch (error) {
        console.error('Error accessing the webcam:', error);
        terminalElement.innerHTML = "<p>Unable to access the webcam.</p>";
    }
}

// Function to stop the webcam and detection
function stopWebcam() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
    const stream = webcamElement.srcObject;
    if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
    }
    webcamElement.srcObject = null;
    isWebcamStarted = false;
    stopWebcamButton.style.display = 'none';
    startWebcamButton.style.display = 'inline-block';
    terminalElement.innerHTML += '<p>Detection stopped.</p>';
}

// Function to send a frame to the server for detection
async function sendFrameToServer() {
    try {
        if (!isWebcamStarted) return;

        const canvas = document.createElement('canvas');
        canvas.width = webcamElement.videoWidth || 640;
        canvas.height = webcamElement.videoHeight || 480;
        const context = canvas.getContext('2d');
        context.drawImage(webcamElement, 0, 0, canvas.width, canvas.height);

        const frameBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'));
        const formData = new FormData();
        formData.append('frame', frameBlob);

        const response = await fetch('/detect', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();
        if (result.letters ) {
            updateTerminal(result.letters); 
        } else if (result.error) {
            console.error(result.error);
            updateTerminal('Detection failed.', null);
        }
    } catch (error) {
        console.error('Error sending frame:', error);
        updateTerminal('Error processing frame.', null);
    }
}

// Function to start detection
function startDetection() {
    intervalId = setInterval(sendFrameToServer, 3000); // Reduce interval for smoother detection
}

// Event listeners for start and stop buttons
startWebcamButton.addEventListener('click', startWebcam);
stopWebcamButton.addEventListener('click', stopWebcam);
