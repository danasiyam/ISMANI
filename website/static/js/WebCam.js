const webcamElement = document.getElementById('webcam');
const terminalElement = document.getElementById('terminal');
const startWebcamButton = document.getElementById('start-webcam-btn');
const stopWebcamButton = document.getElementById('stop-webcam-btn');

let isWebcamStarted = false;
let intervalId = null;
let expectedLetter = null; // Will be set from URL parameters

// Get the expected letter from URL parameters when in learning mode
function getExpectedLetterFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    if (mode === 'learn') {
        expectedLetter = urlParams.get('expected_letter');
        // Update terminal to show what letter to practice
        terminalElement.innerHTML = `<p>قم بتجربة حرف ${expectedLetter}</p>`;
    }
}

// Function to update the terminal with detection results and feedback
function updateTerminal(detectedLetters) {
    if (!expectedLetter) {
        // Normal mode - just show detected letters
        terminalElement.innerHTML = `
            <p>${detectedLetters || 'لم يتم اكتشاف أي حرف'}</p>
        `;
    } else {
        // Learning mode - check if the detected letter matches expected
        const lastDetectedLetter = detectedLetters.trim().slice(-1); // Get last detected letter
        
        if (lastDetectedLetter === expectedLetter) {
            terminalElement.innerHTML = `
                <p class="success-message">أحسنت! لقد قمت بالإشارة الصحيحة لحرف ${expectedLetter}</p>
                <p>الحرف المكتشف: ${detectedLetters}</p>
            `;
        } else if (detectedLetters) {
            terminalElement.innerHTML = `
                <p class="try-again-message">حاول مرة أخرى - تأكد من أن إشارتك واضحة</p>
                <p>الحرف المتوقع: ${expectedLetter}</p>
                <p>الحرف المكتشف: ${detectedLetters}</p>
            `;
        } else {
            terminalElement.innerHTML = `
                <p>قم بتجربة حرف ${expectedLetter}</p>
                <p>لم يتم اكتشاف أي حرف بعد</p>
            `;
        }
    }
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
        terminalElement.innerHTML = "<p>لم نتمكن من الوصول إلى الكاميرا</p>";
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
    terminalElement.innerHTML = '<p>تم إيقاف الكشف</p>';
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

        // Add expected letter to request if in learning mode
        const url = expectedLetter ? 
            `/detect?expected_letter=${encodeURIComponent(expectedLetter)}` : 
            '/detect';

        const response = await fetch(url, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();
        if (result.letters) {
            updateTerminal(result.letters);
        } else if (result.error) {
            console.error(result.error);
            updateTerminal('فشل الكشف');
        }
    } catch (error) {
        console.error('Error sending frame:', error);
        updateTerminal('خطأ في معالجة الإطار');
    }
}

// Function to start detection
function startDetection() {
    intervalId = setInterval(sendFrameToServer, 1000);
}

// Initialize everything when the page loads
document.addEventListener('DOMContentLoaded', () => {
    getExpectedLetterFromURL();
    startWebcamButton.addEventListener('click', startWebcam);
    stopWebcamButton.addEventListener('click', stopWebcam);
});