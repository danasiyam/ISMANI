let webcam;
let stream;
let isWebcamActive = false;
let detectionInterval;
let frameCount = 0;
const REQUIRED_FRAMES = 30;
let lastPredictionTime = 0;
const PREDICTION_COOLDOWN = 5000; // 5 seconds between showing predictions
let canShowNewPrediction = true;

// Get DOM elements
const videoElement = document.getElementById('webcam');
const startButton = document.getElementById('start-webcam-btn');
const stopButton = document.getElementById('stop-webcam-btn');
const terminal = document.getElementById('terminal');
const progressBar = document.createElement('div');
progressBar.className = 'progress-bar';
terminal.appendChild(progressBar);

// Get the expected word from URL parameters
const urlParams = new URLSearchParams(window.location.search);
const expectedWord = urlParams.get('expected_letter');

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
        lastPredictionTime = 0;
        canShowNewPrediction = true;
        
        startDetection();
    } catch (error) {
        console.error('Error accessing webcam:', error);
        terminal.innerHTML = '<p>خطأ في الوصول إلى الكاميرا</p>';
    }
}

function startDetection() {
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
    
    // Capture and process frames more frequently for real-time detection
    detectionInterval = setInterval(async () => {
        if (!isWebcamActive) return;
        
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        
        try {
            const blob = await new Promise(resolve => {
                canvas.toBlob(resolve, 'image/jpeg');
            });
            
            const formData = new FormData();
            formData.append('frame', blob);
            
            const endpoint = `/detectWords?mode=learn&expected_letter=${expectedWord}`;
            const response = await fetch(endpoint, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.status === 'collecting') {
                frameCount = data.frames_collected;
                updateProgressBar();
                if (canShowNewPrediction) {
                    terminal.innerHTML = `
                        <p>جاري جمع الإطارات: ${frameCount}/${REQUIRED_FRAMES}</p>
                        <div class="progress-bar">${progressBar.outerHTML}</div>
                    `;
                }
            } else if (data.status === 'success') {
                const detectedWord = data.word_id;
                const isCorrect = detectedWord === expectedWord;
                const currentTime = Date.now();
                
                // Only update the display if we can show a new prediction
                if (canShowNewPrediction) {
                    lastPredictionTime = currentTime;
                    canShowNewPrediction = false;
                    
                    terminal.innerHTML = `
                        <div class="${isCorrect ? 'success-message' : 'error-message'}">
                            <p>${isCorrect ? 'أحسنت! الكلمة صحيحة' : 'حاول مرة أخرى - الكلمة غير صحيحة'}</p>
                            <p>الكلمة المتوقعة: ${expectedWord}</p>
                            <p>الكلمة المكتشفة: ${detectedWord || 'لم يتم التعرف بعد'}</p>
                        </div>
                        <div class="progress-bar">${progressBar.outerHTML}</div>
                    `;

                    // Reset frames for next detection
                    frameCount = 0;
                    updateProgressBar();
                    
                    // Enable showing new prediction after cooldown
                    setTimeout(() => {
                        canShowNewPrediction = true;
                        if (!isCorrect) {
                            terminal.innerHTML = `
                                <p>جاري المراقبة...</p>
                                <div class="progress-bar">${progressBar.outerHTML}</div>
                            `;
                        }
                    }, PREDICTION_COOLDOWN);
                }
            }
        } catch (error) {
            console.error('Error during detection:', error);
            if (canShowNewPrediction) {
                terminal.innerHTML = '<p>خطأ في عملية الكشف</p>';
            }
        }
    }, 100); // Increased capture rate to 10 FPS for more responsive detection
}

function updateProgressBar() {
    const progress = (frameCount / REQUIRED_FRAMES) * 100;
    progressBar.style.width = `${Math.min(progress, 100)}%`;
    progressBar.style.backgroundColor = progress < 100 ? '#ffd700' : '#4CAF50';
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

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (isWebcamActive) {
        stopWebcam();
    }
});