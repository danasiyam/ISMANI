const webcamElement = document.getElementById('webcam');
const terminalElement = document.getElementById('terminal');
const startWebcamButton = document.getElementById('start-webcam-btn');
const stopWebcamButton = document.getElementById('stop-webcam-btn');

let isWebcamStarted = false;
let intervalId = null;
let expectedLetter = null;
let detectedWords = [];

// Clear detection state
function clearDetection() {
    detectedWords = [];
    updateTerminal('');
}

// Handle page reload and navigation
window.addEventListener('beforeunload', clearDetection);
window.addEventListener('popstate', clearDetection);

// Extract expected letter from the URL
function getExpectedLetterFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    if (mode === 'learn') {
        expectedLetter = urlParams.get('expected_letter');
        terminalElement.innerHTML = `<p>قم بتجربة حرف ${expectedLetter}</p>`;
    }
    clearDetection(); // Clear state when URL params change
}

// Update terminal with detected letters or status
function updateTerminal(detectedLetters = '') {
    if (!expectedLetter) {
        terminalElement.innerHTML = `
            <p>${detectedLetters || 'لم يتم اكتشاف أي حرف'}</p>
        `;
    } else {
        const lastDetectedLetter = detectedLetters.trim().slice(-1) || '';

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

// Start webcam
async function startWebcam() {
    try {
        await fetch('/reset', { method: 'POST' });

        clearDetection(); // Reset state when starting webcam
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        webcamElement.srcObject = stream;
        isWebcamStarted = true;
        startWebcamButton.style.display = 'none';
        stopWebcamButton.style.display = 'inline-block';
        startDetection(); // Start detection loop
    } catch (error) {
        console.error('Error accessing the webcam:', error);
        terminalElement.innerHTML = "<p>لم نتمكن من الوصول إلى الكاميرا</p>";
    }
}

// Stop webcam
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
    clearDetection(); // Reset state when stopping webcam
    terminalElement.innerHTML = '<p>تم إيقاف الكشف</p>';
}

// Send frame to server for detection
async function sendFrameToServer() {
    if (!isWebcamStarted) return;

    try {
        const canvas = document.createElement('canvas');
        canvas.width = webcamElement.videoWidth || 640;
        canvas.height = webcamElement.videoHeight || 480;
        const context = canvas.getContext('2d');
        context.drawImage(webcamElement, 0, 0, canvas.width, canvas.height);

        const frameBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'));
        const formData = new FormData();
        formData.append('frame', frameBlob);

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

// Start detection loop
function startDetection() {
    intervalId = setInterval(sendFrameToServer, 1000);
}

// Initialize everything on page load
document.addEventListener('DOMContentLoaded', () => {
    getExpectedLetterFromURL();
    startWebcamButton.addEventListener('click', startWebcam);
    stopWebcamButton.addEventListener('click', stopWebcam);
});
