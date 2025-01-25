from flask import Blueprint, render_template, request, redirect, url_for, jsonify
from flask_login import login_required, current_user
import cv2
import numpy as np
import time
import tensorflow as tf
from ultralytics import YOLO
import mediapipe as mp
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense
from tensorflow.keras.models import load_model


views = Blueprint('views', __name__)

mp_holistic = mp.solutions.holistic
mp_drawing = mp.solutions.drawing_utils
# Load your YOLOv8 model for letters
yolo_model = YOLO('D:/Modification/Gradproject/model/best.pt')
actions=np.array(['السلام عليكم','كيف حالك','الحمدلله'])

def createModel():
    model = Sequential()
    model.add(LSTM(64, return_sequences=True, activation='relu', input_shape=(30, 1662)))
    model.add(LSTM(128, return_sequences=True, activation='relu'))
    model.add(LSTM(64, return_sequences=False, activation='relu'))
    model.add(Dense(64, activation='relu'))
    model.add(Dense(32, activation='relu'))
    model.add(Dense(actions.shape[0], activation='softmax'))

    model.compile(optimizer='Adam', loss='categorical_crossentropy', metrics=['categorical_accuracy'])
    return model

rnn_model = createModel()
rnn_model.summary()
rnn_model.load_weights('D:/Modification/Gradproject/model/action.h5')

sequence = []
sentence = []
predictions = []
THRESHOLD = 0.5


# Arabic dictionary mapping for letters - moved here for global access
arabic_dict = {
    'Ain': 'ع', 'Al': 'ال', 'Alef': 'ا', 'Beh': 'ب', 'Dad': 'ض', 
    'Dal': 'د', 'Feh': 'ف', 'Ghain': 'غ', 'Hah': 'ح', 'Heh': 'ه',
    'Jeem': 'ج', 'Kaf': 'ك', 'Khah': 'خ', 'Laa': 'لا', 'Lam': 'ل',
    'Meem': 'م', 'Noon': 'ن', 'Qaf': 'ق', 'Reh': 'ر', 'Sad': 'ص',
    'Seen': 'س', 'Sheen': 'ش', 'Tah': 'ط', 'Teh': 'ت', 'Teh_Marbuta': 'ة',
    'Thal': 'ذ', 'Theh': 'ث', 'Waw': 'و', 'Yeh': 'ي', 'Zah': 'ظ', 'Zain': 'ز'
}

def draw_styled_landmarks(image,results):
    mp_drawing.draw_landmarks(image, results.face_landmarks, mp_holistic.FACEMESH_CONTOURS,
                                 mp_drawing.DrawingSpec(color=(80,110,10), thickness=1, circle_radius=1),
                                 mp_drawing.DrawingSpec(color=(80,256,121), thickness=1, circle_radius=1))
    
    mp_drawing.draw_landmarks(image, results.pose_landmarks, mp_holistic.POSE_CONNECTIONS,
                                 mp_drawing.DrawingSpec(color=(80,22,10), thickness=2, circle_radius=4),
                                 mp_drawing.DrawingSpec(color=(80,44,121), thickness=2, circle_radius=2))

    mp_drawing.draw_landmarks(image, results.left_hand_landmarks, mp_holistic.HAND_CONNECTIONS,
                                 mp_drawing.DrawingSpec(color=(121,22,76), thickness=2, circle_radius=4),
                                 mp_drawing.DrawingSpec(color=(121,44,250), thickness=2, circle_radius=2)
                                 ) 
    mp_drawing.draw_landmarks(image, results.right_hand_landmarks, mp_holistic.HAND_CONNECTIONS,
                                 mp_drawing.DrawingSpec(color=(245,117,66), thickness=2, circle_radius=4),
                                 mp_drawing.DrawingSpec(color=(245,66,230), thickness=2, circle_radius=2)
                               ) 
    #Does not return the image rather applies the landmarks visualizations to the current image in place

# Mediapipe holistic for extracting keypoints

def mediapipe_detection(image, model):
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB) # COLOR CONVERSION BGR 2 RGB
    image.flags.writeable = False                  # Image is no longer writeable
    results = model.process(image)                 # Make prediction
    image.flags.writeable = True                   # Image is now writeable 
    image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR) # COLOR COVERSION RGB 2 BGR
    return image, results

def extract_keypoints(results):
    """Extract keypoints from mediapipe results for RNN input."""
    pose = np.array([[res.x, res.y, res.z, res.visibility] for res in results.pose_landmarks.landmark]).flatten() if results.pose_landmarks else np.zeros(132)
    face = np.array([[res.x, res.y, res.z] for res in results.face_landmarks.landmark]).flatten() if results.face_landmarks else np.zeros(1404)
    lh = np.array([[res.x, res.y, res.z] for res in results.left_hand_landmarks.landmark]).flatten() if results.left_hand_landmarks else np.zeros(63)
    rh = np.array([[res.x, res.y, res.z] for res in results.right_hand_landmarks.landmark]).flatten() if results.right_hand_landmarks else np.zeros(63)
    return np.concatenate([pose, face, lh, rh])

# Server-side variables for letter detection
letters = []
last_detected_time = time.time()
DELAY_INTERVAL = 2  # Time interval between letter detections in seconds

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

@views.route('/practiceWords')
def practiceWords():
    mode = request.args.get('mode', 'normal')
    expected_letter = request.args.get('expected_letter', None)
    return render_template("WebCam2.html", mode=mode, expected_letter=expected_letter)


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
    
@views.route('/detectWords', methods=['POST'])
def detectWords():
    global sequence, sentence, predictions, THRESHOLD
    
    try:
        # Get mode and expected letter from URL parameters
        mode = request.args.get('mode', 'normal')
        expected_letter = request.args.get('expected_letter', None)
        
        # Get image from request
        img_data = request.files['frame'].read()
        np_img = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(np_img, cv2.IMREAD_COLOR)
        
        # Process with MediaPipe
        with mp_holistic.Holistic(min_detection_confidence=0.5, min_tracking_confidence=0.5) as holistic:
            image, results = mediapipe_detection(img, holistic)
            
            # Extract keypoints
            keypoints = extract_keypoints(results)
            
            # Update sequence
            sequence.append(keypoints)
            sequence = sequence[-30:]  # Keep only last 30 frames
            
            # Make prediction when we have enough frames
            if len(sequence) == 30:
                # Prepare input for prediction
                input_data = np.expand_dims(sequence, axis=0)
                
                # Make prediction
                res = rnn_model.predict(input_data, verbose=0)[0]
                predicted_action_idx = np.argmax(res)
                predictions.append(predicted_action_idx)
                
                # Increase prediction stability by requiring more consistent predictions
                
                # Require more consistent predictions and higher confidence
                if np.unique(predictions[-10:])[0] == np.argmax(res): 

                    if res[np.argmax(res)] > THRESHOLD: 
                        if len(sentence) > 0: 
                            if actions[np.argmax(res)] != sentence[-1]:
                                sentence.append(actions[np.argmax(res)])
                        else:
                            sentence.append(actions[np.argmax(res)])
                    
                if len(sentence) > 5:
                    sentence = sentence[-5:]
                    
                    # If in learning mode and expected_letter is provided
                    if mode == 'learn' and expected_letter:
                        latest_prediction = sentence[-3] if sentence else None
                        # Compare the word ID with the detected word
                        is_correct = latest_prediction == expected_letter
                        
                        return jsonify({
                            'status': 'success',
                            'letters': sentence,
                            'confidence': float(res[predicted_action_idx]),
                            'is_correct': is_correct,
                            'expected': expected_letter,
                            'predicted': latest_prediction,
                            'prediction_count': len(predictions),
                            'word_id': actions[predicted_action_idx]  # Add the word ID to the response
                        })
                
                # Default success response
                return jsonify({
                    'status': 'success',
                    'letters': sentence,
                    'confidence': float(res[predicted_action_idx]),
                    'prediction_count': len(predictions),
                    'word_id': actions[predicted_action_idx]  # Add the word ID to the response
                })
            
            # Still collecting frames
            return jsonify({
                'status': 'collecting',
                'letters': sentence,
                'frames_collected': len(sequence)
            })
            
    except Exception as e:
        print(f"Error in detectWords: {str(e)}")
        return jsonify({
            'status': 'error',
            'error': str(e),
            'letters': sentence
        }), 500