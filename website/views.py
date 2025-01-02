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

letters = []
last_detected_time = time.time()
DELAY_INTERVAL = 3  # Time interval between letter detections in seconds

# Arabic dictionary mapping for letters - moved here for global access
arabic_dict = {
    'Ain': 'ع', 'Al': 'ال', 'Alef': 'ا', 'Beh': 'ب', 'Dad': 'ض', 
    'Dal': 'د', 'Feh': 'ف', 'Ghain': 'غ', 'Hah': 'ح', 'Heh': 'ه',
    'Jeem': 'ج', 'Kaf': 'ك', 'Khah': 'خ', 'Laa': 'لا', 'Lam': 'ل',
    'Meem': 'م', 'Noon': 'ن', 'Qaf': 'ق', 'Reh': 'ر', 'Sad': 'ص',
    'Seen': 'س', 'Sheen': 'ش', 'Tah': 'ط', 'Teh': 'ت', 'Teh_Marbuta': 'ة',
    'Thal': 'ذ', 'Theh': 'ث', 'Waw': 'و', 'Yeh': 'ي', 'Zah': 'ظ', 'Zain': 'ز'
}


# Mediapipe holistic for extracting keypoints
# mp_holistic = mp.solutions.holistic

# Server-side variables for letter detection
letters = []
last_detected_time = time.time()
DELAY_INTERVAL = 6  # Time interval between letter detections in seconds

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

@views.route('/reset', methods=['POST'])
def reset():
        global letters
        letters = []  # Clear the previous word
        return jsonify({'status': 'reset'})


# In views.py - handles both modes
@views.route('/practice')
def practice():
    mode = request.args.get('mode', 'normal')
    expected_letter = request.args.get('expected_letter', None)
    return render_template("WebCam.html", mode=mode, expected_letter=expected_letter)

@views.route('/detect', methods=['POST'])
def detect():
    global letters, last_detected_time
    
    try:
        mode = request.args.get('mode', 'normal')
        expected_letter = request.args.get('expected_letter', None)

        # Get the image from the request
        img_data = request.files['frame'].read()
        np_img = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(np_img, cv2.IMREAD_COLOR)

        # Process the image for letter detection
        results = yolo_model(img)
        
        current_time = time.time()
        detected_label = None
        
        # Only process new detection if enough time has passed
        if current_time - last_detected_time >= DELAY_INTERVAL:
            for result in results:
                for box in result.boxes:
                    # Get the detected label
                    detected_label = yolo_model.names[int(box.cls[0])]
                    last_detected_time = current_time
                    break  # Take the first detection

            # Normal speaking mode - connect letters
            if mode == 'normal':
                if detected_label:
                    if detected_label == "space":
                        letters.append(" ")
                    elif detected_label == "del":
                        if letters:
                            letters.pop()
                    else:
                        arabic_letter = arabic_dict.get(detected_label, detected_label)
                        letters.append(arabic_letter)
                
                current_word = ''.join(letters)
                return jsonify({'letters': current_word})

            # Learning mode - check if letter matches
            else:
                
               
                if detected_label:
                    arabic_letter = arabic_dict.get(detected_label, detected_label)
                    matches = (arabic_letter == expected_letter)
                    return jsonify({
                        'letters': arabic_letter,
                        'matches': matches,
                        'expected_letter': expected_letter
                    })
                else:
                    return jsonify({
                        'letters': None,
                        'matches': False,
                        'expected_letter': expected_letter
                    })

        # If not enough time has passed, return current state
        if mode == 'normal':
            return jsonify({'letters': ''.join(letters)})
        else:
            return jsonify({
                'letters': None,
                'matches': False,
                'expected_letter': expected_letter
            })

    except Exception as e:
        print(f"Error in detect route: {str(e)}")  # For debugging
        return jsonify({'error': str(e)})
    
 