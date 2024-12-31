from flask import Blueprint, render_template, request, redirect, url_for, jsonify
from flask_login import login_required, current_user
import cv2
import numpy as np
import time
# import tensorflow as tf
from ultralytics import YOLO
# import mediapipe as mp

views = Blueprint('views', __name__)

# Load your YOLOv8 model for letters
yolo_model = YOLO('C:/Users/noora/Desktop/BackEnd/BackEnd/model/best.pt')


# Mediapipe holistic for extracting keypoints
# mp_holistic = mp.solutions.holistic

# Server-side variables for letter detection
letters = []
last_detected_time = time.time()
DELAY_INTERVAL = 3  # Time interval between letter detections in seconds

# Server-side variables for action detection
sequence = []
sentence = []
predictions = []
THRESHOLD = 0.5


@views.route('/')
def home():
    return render_template("home.html")

@views.route('/learn')
def learn():
    return render_template("StartLearning.html")

@views.route('/learnWords')
def learnWords():
    return render_template("StartLearningWords.html")

@views.route('/decide')
@login_required
def decide():
    return render_template("decide.html")


@views.route('/check_auth')
def check_auth():
    if current_user.is_authenticated:
        return redirect(url_for('views.decide'))  
    else:
        return redirect(url_for('auth.login'))  


@views.route('/practice')
def practice():
    return render_template("WebCam.html")


@views.route('/detect', methods=['POST'])
def detect():
    global letters, last_detected_time, sequence, sentence, predictions
    try:
        # Get the image from the request
        img_data = request.files['frame'].read()
        np_img = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(np_img, cv2.IMREAD_COLOR)

        # Process the image for letter detection
        results = yolo_model(img)

        current_time = time.time()
        if current_time - last_detected_time >= DELAY_INTERVAL:
            for result in results:
                for box in result.boxes:
                    label = yolo_model.names[int(box.cls[0])]

                    # Arabic dictionary mapping for letters
                    arabic_dict = {'Ain': 'ع','Al': 'ال','Alef': 'ا','Beh': 'ب','Dad': 'ض','Dal': 'د','Feh': 'ف','Ghain': 'غ','Hah': 'ح',
                                   'Heh': 'ه','Jeem': 'ج','Kaf': 'ك','Khah': 'خ','Laa': 'لا','Lam': 'ل','Meem': 'م','Noon': 'ن','Qaf': 'ق',
                                   'Reh': 'ر', 'Sad': 'ص','Seen': 'س','Sheen': 'ش','Tah': 'ط','Teh': 'ت','Teh_Marbuta': 'ة',
                                   'Thal': 'ذ','Theh': 'ث','Waw': 'و','Yeh': 'ي','Zah': 'ظ','Zain': 'ز'}

                    # Process detected letters and replace them with their Arabic equivalents
                    if label == "space":
                        letters.append(" ")  # For space
                    elif label == "del":
                        if letters:  # For delete, remove the last letter
                            letters.pop()
                    else:
                        # Map the detected label to its Arabic equivalent
                        arabic_letter = arabic_dict.get(label, label)  # Default to label if not found
                        letters.append(arabic_letter)

                    # Update last detection time
                    last_detected_time = current_time

        # Combine letter results
        current_word = ''.join(letters)

        return jsonify({
            'letters': current_word,
        })
    except Exception as e:
        return jsonify({'error': str(e)})
