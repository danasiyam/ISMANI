// Global variables for webcam handling
let webcam;
let stream;
let isWebcamActive = false;
let detectionInterval;
let frameCount = 0;
const REQUIRED_FRAMES = 30;

// Get DOM elements
const videoElement = document.getElementById('webcam');
const startButton = document.getElementById('start-webcam-btn');
const stopButton = document.getElementById('stop-webcam-btn');
const terminal = document.getElementById('terminal');
const progressBar = document.createElement('div');
progressBar.className = 'progress-bar';
terminal.appendChild(progressBar);

// Add event listeners
startButton.addEventListener('click', startWebcam);
stopButton.addEventListener('click', stopWebcam);

async function startWebcam() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: 640,
                height: 480
            }
        });
        
        videoElement.srcObject = stream;
        await videoElement.play();
        
        startButton.style.display = 'none';
        stopButton.style.display = 'block';
        terminal.innerHTML = '<p>جاري جمع الإطارات...</p>';
        progressBar.style.width = '0%';
        
        isWebcamActive = true;
        frameCount = 0;
        
        startDetection();
    } catch (error) {
        console.error('Error accessing webcam:', error);
        terminal.innerHTML = '<p>خطأ في الوصول إلى الكاميرا</p>';
    }
}

function stopWebcam() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        videoElement.srcObject = null;
        
        if (detectionInterval) {
            clearInterval(detectionInterval);
        }
        
        startButton.style.display = 'block';
        stopButton.style.display = 'none';
        terminal.innerHTML = '<p>تم إيقاف الكاميرا</p>';
        
        isWebcamActive = false;
        frameCount = 0;
        progressBar.style.width = '0%';
    }
}

function updateProgressBar() {
    const progress = (frameCount / REQUIRED_FRAMES) * 100;
    progressBar.style.width = `${Math.min(progress, 100)}%`;
    progressBar.style.backgroundColor = progress < 100 ? '#ffd700' : '#4CAF50';
}

function startDetection() {
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
    
    detectionInterval = setInterval(async () => {
        if (!isWebcamActive) return;
        
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        
        try {
            const blob = await new Promise(resolve => {
                canvas.toBlob(resolve, 'image/jpeg');
            });
            
            const formData = new FormData();
            formData.append('frame', blob);
            
            const endpoint = '/detectWords';
            const response = await fetch(endpoint, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.status === 'collecting') {
                frameCount = data.frames_collected;
                updateProgressBar();
                terminal.innerHTML = `
                    <p>جاري جمع الإطارات: ${frameCount}/${REQUIRED_FRAMES}</p>
                    <div class="progress-bar">${progressBar.outerHTML}</div>
                `;
            } else if (data.status === 'success') {
                terminal.innerHTML = `
                    <p>الكلمة المكتشفة: ${data.letters.join(' ')}</p>
                    <p>نسبة الثقة: ${(data.confidence * 100).toFixed(2)}%</p>
                    <div class="progress-bar">${progressBar.outerHTML}</div>
                `;
            }
        } catch (error) {
            console.error('Error during detection:', error);
            terminal.innerHTML = '<p>خطأ في عملية الكشف</p>';
        }
    }, 100);
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (isWebcamActive) {
        stopWebcam();
    }
});

// Add CSS for progress bar
const style = document.createElement('style');
style.textContent = `
    .progress-bar {
        width: 0%;
        height: 20px;
        background-color: #ffd700;
        border-radius: 10px;
        transition: width 0.3s ease-in-out;
        margin: 10px 0;
        border: 1px solid #ccc;
    }
`;
document.head.appendChild(style);