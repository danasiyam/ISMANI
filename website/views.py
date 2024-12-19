from flask import Blueprint, render_template, request, jsonify
import cv2
import numpy as np
from ultralytics import YOLO
import time


views = Blueprint('views', __name__)

# Load your YOLOv8 model
model = YOLO('D:\\GradProjectUi\\BackEnd\\model\\best.pt')
# Server-side variables to maintain detected letters
letters = []
last_detected_time = time.time()
DELAY_INTERVAL = 3  # Time interval between detections in seconds

@views.route('/')
def home():
    return render_template("home.html")

@views.route('/learn')
def learn():
    return render_template("StartLearning.html")

@views.route('/decide')
def decide():
    return render_template("decide.html")

@views.route('/practice')
def practice():
    return render_template("WebCam.html")

@views.route('/detect', methods=['POST'])
def detect():
    global letters, last_detected_time
    try:
        # Get the image from the request
        img_data = request.files['frame'].read()
        np_img = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(np_img, cv2.IMREAD_COLOR)

        # Run YOLOv8 detection
        results = model(img)

        current_time = time.time()
        if current_time - last_detected_time >= DELAY_INTERVAL:
            for result in results:
                for box in result.boxes:
                    label = model.names[int(box.cls[0])]

                    # Process detected letters
                    if label == "space":
                        letters.append(" ")
                    elif label == "del":
                        if letters:
                            letters.pop()
                    else:
                        letters.append(label)

                    # Update last detection time
                    last_detected_time = current_time

        # Form the current word
        current_word = ''.join(letters)

        # Reshape Arabic text for proper rendering
        reshaped_text = arabic_reshaper.reshape(current_word)
        bidi_text = get_display(reshaped_text)

        return jsonify({'word': bidi_text})
    except Exception as e:
        return jsonify({'error': str(e)})