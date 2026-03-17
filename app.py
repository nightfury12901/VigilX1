"""
OPTIMIZED Drowsiness Detection - Best of Both Worlds
âœ… TensorFlow ML Model (accuracy from unified)
âœ… User Profile Calibration (personalization from personalized)
âœ… Twilio SMS Notifications
âœ… Fixed brightness issues
âœ… Time-based + Frame-based detection (hybrid)
"""

from flask import Flask, render_template, jsonify, request, Response
from flask_cors import CORS
import cv2
import numpy as np
import tensorflow as tf
import pickle
import time
import os
import threading
import urllib.request
from collections import deque
from datetime import datetime
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import requests
import json
import uuid
from calibration import CalibrationSession

# Optional imports
try:
    from twilio.rest import Client
    TWILIO_AVAILABLE = True
except ImportError:
    TWILIO_AVAILABLE = False
    print("[WARNING] Twilio not installed. SMS disabled.")

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# ============================================
# Configuration
# ============================================

MODELS_DIR = "models"
USER_PROFILES_DIR = "user_profiles"
CALIBRATION_DATA_DIR = "calibration_data"

# Camera Sources
CAMERA_SOURCES = {
    'webcam': {'name': 'Dashcam(WebCam)', 'url': 0, 'connected': False},
    
    'droidcam': {'name': 'DroidCam (Phone)', 'url': 'http://192.168.4.4:4747/video', 'connected': False},
    'esp32cam': {'name': 'ESP32-CAM', 'url': 'http://192.168.4.1/capture', 'connected': False}
}

# ============================================
# XIAO ESP32C3 Integration
# ============================================

XIAO_IP = os.getenv('XIAO_IP', "http://192.168.4.2")
XIAO_ENABLED = os.getenv('XIAO_ENABLED', 'true').lower() == 'true'

last_alert_time = 0
last_alert_type = None
ALERT_COOLDOWN = 10

def send_xiao_command(endpoint):
    """Send command to XIAO ESP32C3 (non-blocking)"""
    if not XIAO_ENABLED:
        return

    def _send():
        try:
            response = requests.get(f"{XIAO_IP}/{endpoint}", timeout=1)
            if response.status_code == 200:
                add_log("XIAO", f"âœ“ Sent /{endpoint} to hardware")
        except:
            pass

    threading.Thread(target=_send, daemon=True).start()

def trigger_alert(alert_type):
    """Trigger hardware alert based on type"""
    global last_alert_time, last_alert_type

    current_time = time.time()

    if alert_type == last_alert_type and current_time - last_alert_time < ALERT_COOLDOWN:
        return

    last_alert_time = current_time
    last_alert_type = alert_type

    if alert_type == 'EAR':
        send_xiao_command('alert')
        add_log("ALERT", "ðŸš¨ EYES CLOSED - Hardware alert triggered!")
        track_consecutive_alert('EAR', 'Eyes closed for too long - critical drowsiness detected!')
    elif alert_type == 'YAWN':
        send_xiao_command('warning')
        add_log("ALERT", "âš ï¸ EXCESSIVE YAWNING - Hardware warning!")
        track_consecutive_alert('YAWN', 'Excessive yawning detected - driver may be drowsy')
    elif alert_type == 'BLINK':
        send_xiao_command('warning')
        add_log("ALERT", "âš ï¸ EXCESSIVE BLINKING - Hardware warning!")
        track_consecutive_alert('BLINK', 'Excessive blinking detected - possible drowsiness')

def track_consecutive_alert(alert_type, message):
    """Track consecutive alerts and send SMS after reaching threshold"""
    global consecutive_alert_count, consecutive_alert_times

    current_time = time.time()

    # Remove old alerts outside the window
    consecutive_alert_times = [t for t in consecutive_alert_times if current_time - t < CONSECUTIVE_WINDOW]

    # Add this alert
    consecutive_alert_times.append(current_time)
    consecutive_alert_count = len(consecutive_alert_times)

    add_log("INFO", f"Consecutive alert {consecutive_alert_count}/{CONSECUTIVE_ALERTS_FOR_SMS}")

    # Send SMS when threshold reached
    if consecutive_alert_count >= CONSECUTIVE_ALERTS_FOR_SMS:
        send_sms_alert(alert_type, message)
        # Reset counter after sending
        consecutive_alert_times = []
        consecutive_alert_count = 0
        add_log("SMS", f"SMS triggered after {CONSECUTIVE_ALERTS_FOR_SMS} consecutive alerts")

def clear_alerts():
    """Clear all alerts"""
    send_xiao_command('clear')

# ============================================
# Twilio SMS Integration
# ============================================

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = "XXXXXXXXXXXXXXXXXXX"
TWILIO_PHONE_NUMBER = "XXXXXXXXXXXXXXXXXXXXXX"
# Hardcoded default recipient from user script, but can still be overridden by dashboard
ALERT_PHONE_NUMBERS = ["+919911478899"]

twilio_client = None
if TWILIO_AVAILABLE:
    try:
        twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        print("✓ Twilio SMS initialized with hardcoded credentials")
    except Exception as e:
        print(f"Twilio init failed: {e}")

last_sms_time = 0
SMS_COOLDOWN = 600  # 10 minutes

# Phone numbers configured from the dashboard UI (overrides ALERT_PHONE_NUMBERS from .env)
# Updated via POST /api/sms/configure - persists in memory for the life of the server process
dashboard_alert_phones = []  # e.g. ['+919876543210', '+14085551234']

# Consecutive alert tracking for SMS
consecutive_alert_count = 0
consecutive_alert_times = []
CONSECUTIVE_ALERTS_FOR_SMS = 3  # Send SMS after 3 consecutive alerts
CONSECUTIVE_WINDOW = 120  # 120 second window for consecutive alerts

def send_sms_alert(alert_type, message):
    """Send SMS alert via Twilio"""
    global last_sms_time

    if not twilio_client:
        return

    current_time = time.time()
    if current_time - last_sms_time < SMS_COOLDOWN:
        return

    last_sms_time = current_time

    def _send_sms():
        try:
            user_name = current_user_profile['name'] if current_user_profile else "Unknown Driver"
            timestamp = datetime.now().strftime("%H:%M:%S")
            camera_name = CAMERA_SOURCES[current_source]['name']

            sms_body = (
                f"\U0001f6a8 DROWSINESS ALERT\n"
                f"Driver: {user_name}\n"
                f"Type: {alert_type}\n"
                f"Time: {timestamp}\n"
                f"Camera: {camera_name}\n\n"
                f"{message}"
            )

            # Prefer dashboard-configured numbers; fall back to .env ALERT_PHONE_NUMBERS
            recipients = dashboard_alert_phones if dashboard_alert_phones else [
                p.strip() for p in ALERT_PHONE_NUMBERS if p.strip()
            ]

            if not recipients:
                add_log("WARNING", "No recipient phone numbers configured. Add them in the dashboard SMS settings.")
                return

            for phone_number in recipients:
                twilio_client.messages.create(
                    body=sms_body,
                    from_=TWILIO_PHONE_NUMBER,
                    to=phone_number
                )
                add_log("SMS", f"\u2714 Alert sent to {phone_number}")
        except Exception as e:
            add_log("ERROR", f"SMS failed: {e}")

    threading.Thread(target=_send_sms, daemon=True).start()

# ============================================
# Global State
# ============================================

current_source = 'webcam'
cap = None
detection_active = True
detector_ready = False
detection_logs = deque(maxlen=100)
detection_stats = {
    'total_frames': 0,
    'ear_alerts': 0,
    'blink_alerts': 0,
    'yawn_alerts': 0,
    'total_blinks': 0,
    'total_yawns': 0,
    'ml_drowsy_count': 0  # NEW: Track ML predictions
}
latest_status = {}
latest_raw_frame = None  # Shared frame for calibration (set by detection loop)
lock = threading.Lock()

# Detection state
ear_closed_frames = 0
ear_alert_active = False
mar_high_frames = 0
mar_cooldown = 0
yawn_timestamps = deque()
blink_timestamps = deque()
eye_was_closed = False
blink_alert_triggered = False
yawn_alert_triggered = False

# Models
interpreter = None
scaler = None
model_path = None
scaler_path = None
face_model_path = None

# ============================================
# USER PROFILE MANAGEMENT
# ============================================

current_user_profile = None

# OPTIMIZED Default Thresholds (balanced for accuracy)
DEFAULT_THRESHOLDS = {
    'ear_threshold': 0.23,          # Between 0.21 and 0.25 - BALANCED
    'mar_threshold': 0.30,          # Lowered for small yawn detection
    'blink_ear_threshold': 0.20,    # Lower = stricter blink detection
    'ear_alert_seconds': 0.4,       # Faster than 0.5s
    'mar_trigger_seconds': 0.3,
    'blink_alert_count': 15,        # Between 12 and 20 - BALANCED
    'yawn_alert_count': 3,          # Between 2 and 4 - BALANCED
    'ml_drowsy_threshold': 0.6      # NEW: ML model confidence threshold
}

ACTIVE_THRESHOLDS = DEFAULT_THRESHOLDS.copy()

def get_threshold(key):
    """Get active threshold value"""
    return ACTIVE_THRESHOLDS.get(key, DEFAULT_THRESHOLDS[key])

# Landmark indices
LEFT_EYE = [33, 160, 158, 133, 153, 144]
RIGHT_EYE = [362, 385, 387, 263, 373, 380]
MOUTH_POINTS = {
    'top': 13, 'bottom': 14,
    'left_top': 82, 'left_bottom': 87,
    'right_top': 312, 'right_bottom': 317,
    'left_corner': 61, 'right_corner': 291
}

# ============================================
# Logging
# ============================================

def add_log(log_type, message):
    timestamp = datetime.now().strftime("%H:%M:%S")
    log_entry = {'time': timestamp, 'type': log_type, 'message': message}
    with lock:
        detection_logs.appendleft(log_entry)
    print(f"[{timestamp}] {log_type}: {message}")

# ============================================
# Model Loading
# ============================================

def find_model_files():
    """Find model file paths"""
    global model_path, scaler_path, face_model_path

    for base in [MODELS_DIR, '.']:
        if os.path.exists(f'{base}/drowsiness_model.tflite'):
            model_path = f'{base}/drowsiness_model.tflite'
        if os.path.exists(f'{base}/scaler.pkl'):
            scaler_path = f'{base}/scaler.pkl'
        if os.path.exists(f'{base}/face_landmarker.task'):
            face_model_path = f'{base}/face_landmarker.task'

    # Download face landmarker if needed
    if not face_model_path:
        face_model_path = f'{MODELS_DIR}/face_landmarker.task'
        os.makedirs(MODELS_DIR, exist_ok=True)
        add_log("INFO", "Downloading MediaPipe model...")
        url = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'
        urllib.request.urlretrieve(url, face_model_path)
        add_log("INFO", "Downloaded face_landmarker.task")

    return face_model_path is not None

def load_ml_models():
    """Load TFLite and scaler - RESTORED"""
    global interpreter, scaler, detector_ready

    if not model_path or not scaler_path:
        add_log("WARNING", "TFLite/scaler not found - running without ML model")
        return False

    try:
        interpreter = tf.lite.Interpreter(model_path=model_path)
        interpreter.allocate_tensors()
        add_log("SUCCESS", f"âœ… TFLite model loaded: {model_path}")

        with open(scaler_path, 'rb') as f:
            scaler = pickle.load(f)
        add_log("SUCCESS", f"âœ… Scaler loaded: {scaler_path}")

        detector_ready = True
        return True
    except Exception as e:
        add_log("ERROR", f"Failed to load ML models: {e}")
        return False

# ============================================
# Feature Calculations
# ============================================

def calculate_ear(eye_landmarks):
    """Calculate Eye Aspect Ratio"""
    A = np.linalg.norm(eye_landmarks[1] - eye_landmarks[5])
    B = np.linalg.norm(eye_landmarks[2] - eye_landmarks[4])
    C = np.linalg.norm(eye_landmarks[0] - eye_landmarks[3])
    return (A + B) / (2.0 * C + 1e-6)

def calculate_mar(mouth_dict):
    """Calculate Mouth Aspect Ratio"""
    v_center = np.linalg.norm(mouth_dict['top'] - mouth_dict['bottom'])
    v_left = np.linalg.norm(mouth_dict['left_top'] - mouth_dict['left_bottom'])
    v_right = np.linalg.norm(mouth_dict['right_top'] - mouth_dict['right_bottom'])
    horizontal = np.linalg.norm(mouth_dict['left_corner'] - mouth_dict['right_corner'])
    return ((v_center + v_left + v_right) / 3.0) / (horizontal + 1e-6)

# ============================================
# Camera Functions - FIXED BRIGHTNESS
# ============================================

def connect_camera(source_key):
    global cap, current_source

    if cap is not None:
        cap.release()
        cap = None

    source = CAMERA_SOURCES[source_key]
    url = source['url']

    add_log("INFO", f"Connecting to {source['name']}...")

    try:
        if source_key == 'esp32cam':
            cap = None
            CAMERA_SOURCES[source_key]['connected'] = True
            current_source = source_key
            add_log("SUCCESS", f"ESP32-CAM mode: {url}")
            return True
        else:
            if isinstance(url, int):
                # Try DSHOW backend first on Windows for proper auto-exposure
                for backend in [cv2.CAP_DSHOW, cv2.CAP_MSMF, cv2.CAP_ANY]:
                    for i in [0, 1, 2]:
                        test_cap = cv2.VideoCapture(i, backend)
                        if test_cap.isOpened():
                            ret, _ = test_cap.read()
                            if ret:
                                cap = test_cap
                                add_log("INFO", f"Using camera index {i} with backend {backend}")
                                break
                            test_cap.release()
                    if cap:
                        break
            else:
                cap = cv2.VideoCapture(url)

            if cap and cap.isOpened():
                # ============================================
                # MAX QUALITY CAMERA SETTINGS - BRIGHTNESS FIX
                # ============================================

                # Resolution: 1080p for max quality
                cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1920)
                cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 1080)

                # If we can't get 1080p, try 720p
                actual_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                if actual_w < 1280:
                    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
                    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

                # FPS: 30fps
                cap.set(cv2.CAP_PROP_FPS, 30)

                # Buffer: 1 frame (freshest possible)
                cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

                # MJPG codec for faster transfer
                cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*'MJPG'))

                # ==========================================
                # AUTO-EXPOSURE: Let the camera handle it!
                # ==========================================
                # On DSHOW: 1 = auto, 0 = manual
                # On MSMF: 1 = auto
                # On V4L2: 3 = auto, 1 = manual
                cap.set(cv2.CAP_PROP_AUTO_EXPOSURE, 1)  # Auto mode

                # DO NOT override brightness/contrast - let auto-exposure work!
                # Only boost gain for low-light assistance
                cap.set(cv2.CAP_PROP_GAIN, 200)  # Max gain for dark scenes

                # If auto-exposure doesn't stick, set manual exposure high
                auto_exp = cap.get(cv2.CAP_PROP_AUTO_EXPOSURE)
                if auto_exp == 0 or auto_exp == 0.25:  # Manual mode stuck
                    # Try V4L2 auto-exposure value
                    cap.set(cv2.CAP_PROP_AUTO_EXPOSURE, 3)
                    # Also try setting exposure high manually
                    cap.set(cv2.CAP_PROP_EXPOSURE, -4)  # Higher = brighter (log scale)

                # Autofocus
                cap.set(cv2.CAP_PROP_AUTOFOCUS, 1)

                # White balance auto
                cap.set(cv2.CAP_PROP_AUTO_WB, 1)

                CAMERA_SOURCES[source_key]['connected'] = True
                current_source = source_key

                actual_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                actual_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                actual_fps = int(cap.get(cv2.CAP_PROP_FPS))
                actual_exp = cap.get(cv2.CAP_PROP_EXPOSURE)
                actual_autoexp = cap.get(cv2.CAP_PROP_AUTO_EXPOSURE)
                actual_bright = cap.get(cv2.CAP_PROP_BRIGHTNESS)
                actual_gain = cap.get(cv2.CAP_PROP_GAIN)

                add_log("SUCCESS", f"Connected: {actual_width}x{actual_height} @ {actual_fps}fps")
                add_log("INFO", f"Camera props: brightness={actual_bright}, gain={actual_gain}, exposure={actual_exp}, auto_exp={actual_autoexp}")
                return True
            else:
                add_log("ERROR", f"Failed to connect to {source['name']}")
                return False
    except Exception as e:
        add_log("ERROR", f"Connection error: {e}")
        return False

def get_esp32_frame():
    try:
        url = CAMERA_SOURCES['esp32cam']['url']
        resp = urllib.request.urlopen(url, timeout=2)
        img_array = np.array(bytearray(resp.read()), dtype=np.uint8)
        frame = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        return frame
    except:
        return None


# ============================================
# Calibration API Routes
# ============================================

# Active calibration sessions (in memory)
calibration_sessions = {}

@app.route('/api/calibration/start', methods=['POST'])
def api_calibration_start():
    """Start a new calibration session"""
    try:
        data = request.json
        name = data.get('name', 'User')

        session = CalibrationSession(
            user_name=name,
            session_dir=CALIBRATION_DATA_DIR,
            face_model_path=face_model_path
        )

        calibration_sessions[session.session_id] = session
        add_log("INFO", f"Calibration started for {name} (session: {session.session_id})")

        return jsonify({
            'success': True,
            'session_id': session.session_id,
            'user_id': session.user_id,
            'phases': list(CalibrationSession.PHASES.keys())
        })
    except Exception as e:
        add_log("ERROR", f"Calibration start failed: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/calibration/<session_id>/capture', methods=['POST'])
def api_calibration_capture(session_id):
    """Capture and validate a frame for calibration"""
    try:
        session = calibration_sessions.get(session_id)
        if not session:
            return jsonify({'success': False, 'error': 'Session not found'})

        data = request.json
        phase = data.get('phase', 'normal')

        # Get latest frame from detection loop (thread-safe, no race condition)
        frame = latest_raw_frame
        if frame is None:
            return jsonify({'success': True, 'valid': False, 'feedback': 'No camera frame available. Make sure detection is running.'})
        frame = frame.copy()  # Work on a copy

        # Validate frame and extract features
        is_valid, feedback, features = session.validate_frame(frame)

        if is_valid and features:
            session.add_frame_data(phase, features)

        current, target = session.get_phase_progress(phase)

        return jsonify({
            'success': True,
            'valid': is_valid,
            'feedback': feedback,
            'progress': {
                'current': current,
                'target': target,
                'complete': current >= target
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/calibration/<session_id>/process', methods=['POST'])
def api_calibration_process(session_id):
    """Process calibration data and compute personalized thresholds"""
    try:
        session = calibration_sessions.get(session_id)
        if not session:
            return jsonify({'success': False, 'error': 'Session not found'})

        data = session.get_collected_data()

        # Compute personalized thresholds from calibration data
        normal_ears = data['normal']['ear']
        closed_ears = data['closed']['ear']
        yawn_mars = data['yawn']['mar']
        normal_mars = data['normal']['mar']

        if not normal_ears or not closed_ears:
            return jsonify({'success': False, 'error': 'Insufficient calibration data'})

        import statistics

        normal_ear_mean = statistics.mean(normal_ears)
        normal_ear_std = statistics.stdev(normal_ears) if len(normal_ears) > 1 else 0
        closed_ear_mean = statistics.mean(closed_ears)
        normal_mar_mean = statistics.mean(normal_mars) if normal_mars else 0.3
        yawn_mar_mean = statistics.mean(yawn_mars) if yawn_mars else 0.6

        # Compute thresholds using robust formulas
        ear_threshold = (normal_ear_mean + closed_ear_mean) / 2.0
        ear_threshold = max(0.15, min(0.30, ear_threshold))  # Guardrails

        blink_ear_threshold = closed_ear_mean + (normal_ear_mean - closed_ear_mean) * 0.25
        blink_ear_threshold = max(0.12, min(0.25, blink_ear_threshold))

        mar_threshold = (normal_mar_mean + yawn_mar_mean) / 2.0
        mar_threshold = max(0.30, min(0.70, mar_threshold))  # Guardrails

        # Quality assessment
        ear_separation = normal_ear_mean - closed_ear_mean
        if ear_separation > 0.08:
            quality = 'excellent'
        elif ear_separation > 0.05:
            quality = 'good'
        elif ear_separation > 0.03:
            quality = 'fair'
        else:
            quality = 'poor'

        profile = {
            'user_id': session.user_id,
            'name': session.user_name,
            'calibrated_at': datetime.now().isoformat(),
            'calibration_quality': quality,
            'thresholds': {
                'ear_threshold': round(ear_threshold, 4),
                'mar_threshold': round(mar_threshold, 4),
                'blink_ear_threshold': round(blink_ear_threshold, 4),
                'ear_alert_seconds': 0.4,
                'mar_trigger_seconds': 0.3,
                'blink_alert_count': 15,
                'yawn_alert_count': 3,
                'ml_drowsy_threshold': 0.6
            },
            'calibration_data': {
                'normal': {
                    'ear_mean': round(normal_ear_mean, 4),
                    'ear_std': round(normal_ear_std, 4),
                    'mar_mean': round(normal_mar_mean, 4),
                    'frames': data['normal']['frames']
                },
                'closed': {
                    'ear_mean': round(closed_ear_mean, 4),
                    'frames': data['closed']['frames']
                },
                'yawn': {
                    'mar_mean': round(yawn_mar_mean, 4),
                    'frames': data['yawn']['frames']
                }
            }
        }

        # Store profile temporarily in session
        session._profile = profile

        add_log("SUCCESS", f"Calibration processed for {session.user_name}: quality={quality}")

        return jsonify({
            'success': True,
            'profile': profile
        })
    except Exception as e:
        add_log("ERROR", f"Calibration processing failed: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/calibration/<session_id>/save', methods=['POST'])
def api_calibration_save(session_id):
    """Save calibration profile to disk"""
    try:
        session = calibration_sessions.get(session_id)
        if not session:
            return jsonify({'success': False, 'error': 'Session not found'})

        profile = getattr(session, '_profile', None)
        if not profile:
            return jsonify({'success': False, 'error': 'No processed profile found'})

        # Save to user_profiles directory
        os.makedirs(USER_PROFILES_DIR, exist_ok=True)
        filepath = os.path.join(USER_PROFILES_DIR, f"{session.user_id}.json")
        with open(filepath, 'w') as f:
            json.dump(profile, f, indent=2)

        add_log("SUCCESS", f"Profile saved: {session.user_name} â†’ {filepath}")

        # Cleanup session
        session.cleanup()
        del calibration_sessions[session_id]

        return jsonify({'success': True, 'user_id': session.user_id})
    except Exception as e:
        add_log("ERROR", f"Profile save failed: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/calibration/<session_id>/cancel', methods=['POST'])
def api_calibration_cancel(session_id):
    """Cancel calibration session"""
    try:
        session = calibration_sessions.get(session_id)
        if session:
            session.cleanup()
            del calibration_sessions[session_id]
            add_log("INFO", "Calibration cancelled")
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

# ============================================
# User Profile Routes
# ============================================

@app.route('/api/users', methods=['GET'])
def api_list_users():
    """List all user profiles"""
    try:
        os.makedirs(USER_PROFILES_DIR, exist_ok=True)
        profiles = []
        for filename in os.listdir(USER_PROFILES_DIR):
            if filename.endswith('.json'):
                with open(os.path.join(USER_PROFILES_DIR, filename), 'r') as f:
                    profile = json.load(f)
                    profiles.append({
                        'user_id': profile['user_id'],
                        'name': profile['name'],
                        'calibrated_at': profile.get('calibrated_at', 'Unknown'),
                        'calibration_quality': profile.get('calibration_quality', 'unknown'),
                        'thresholds': profile.get('thresholds', {})
                    })
        return jsonify({'success': True, 'users': profiles})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/users/<user_id>/activate', methods=['POST'])
def api_activate_user(user_id):
    """Load user profile and activate personalized thresholds"""
    global current_user_profile, ACTIVE_THRESHOLDS

    try:
        if user_id in ('generic', 'default'):
            current_user_profile = None
            ACTIVE_THRESHOLDS = DEFAULT_THRESHOLDS.copy()
            add_log("INFO", "Switched to generic model")
            return jsonify({'success': True, 'message': 'Using generic thresholds'})

        filepath = os.path.join(USER_PROFILES_DIR, f'{user_id}.json')
        if not os.path.exists(filepath):
            return jsonify({'success': False, 'error': 'Profile not found'})

        with open(filepath, 'r') as f:
            profile = json.load(f)

        current_user_profile = profile

        # Override thresholds with user profile
        if 'thresholds' in profile:
            ACTIVE_THRESHOLDS.update(profile['thresholds'])

        add_log("SUCCESS", f"Loaded profile: {profile['name']}")

        return jsonify({
            'success': True,
            'profile': profile,
            'thresholds': ACTIVE_THRESHOLDS
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/users/<user_id>', methods=['DELETE'])
def api_delete_user(user_id):
    """Delete user profile"""
    try:
        filepath = os.path.join(USER_PROFILES_DIR, f'{user_id}.json')
        if os.path.exists(filepath):
            os.remove(filepath)
            add_log("INFO", f"Deleted profile: {user_id}")
            return jsonify({'success': True})
        return jsonify({'success': False, 'error': 'Profile not found'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

# ============================================
# Main Routes
# ============================================

@app.route('/')
def index():
    return render_template('unified_detection.html', sources=CAMERA_SOURCES)

@app.route('/api/connect', methods=['POST'])
def api_connect():
    data = request.json
    source = data.get('source', 'webcam')
    if source not in CAMERA_SOURCES:
        return jsonify({"success": False, "message": "Invalid source"})
    success = connect_camera(source)
    return jsonify({"success": success, "source": source})

@app.route('/api/start_detection', methods=['POST'])
def api_start():
    global detection_active
    detection_active = True
    add_log("INFO", "Detection started")
    return jsonify({"success": True})

@app.route('/api/stop_detection', methods=['POST'])
def api_stop():
    global detection_active
    detection_active = False
    clear_alerts()
    add_log("INFO", "Detection stopped")
    return jsonify({"success": True})

@app.route('/api/reset', methods=['POST'])
def api_reset():
    global detection_stats, ear_closed_frames, ear_alert_active
    global yawn_timestamps, blink_timestamps, blink_alert_triggered, yawn_alert_triggered
    detection_stats = {
        'total_frames': 0, 'ear_alerts': 0, 'blink_alerts': 0,
        'yawn_alerts': 0, 'total_blinks': 0, 'total_yawns': 0,
        'ml_drowsy_count': 0
    }
    ear_closed_frames = 0
    ear_alert_active = False
    blink_alert_triggered = False
    yawn_alert_triggered = False
    yawn_timestamps.clear()
    blink_timestamps.clear()
    clear_alerts()
    add_log("INFO", "Stats reset")
    return jsonify({"success": True})

@app.route('/api/status')
def api_status():
    with lock:
        profile_info = None
        if current_user_profile:
            profile_info = {
                'user_id': current_user_profile['user_id'],
                'name': current_user_profile['name']
            }

        return jsonify({
            'source': current_source,
            'source_name': CAMERA_SOURCES[current_source]['name'],
            'detection_active': detection_active,
            'detector_ready': detector_ready,
            'xiao_enabled': XIAO_ENABLED,
            'xiao_ip': XIAO_IP,
            'stats': detection_stats,
            'latest': latest_status,
            'current_profile': profile_info,
            'active_profile': profile_info,
            'active_thresholds': ACTIVE_THRESHOLDS,
            'ml_enabled': interpreter is not None,
            'twilio_enabled': twilio_client is not None
        })

@app.route('/api/logs')
def api_logs():
    with lock:
        return jsonify(list(detection_logs))

# ============================================
# Health Check (used by React checkBackendHealth)
# ============================================

@app.route('/api/health')
def api_health():
    env_phones = [p.strip() for p in ALERT_PHONE_NUMBERS if p.strip()]
    numbers_ready = bool(dashboard_alert_phones or env_phones)
    return jsonify({
        'status': 'ok',
        'twilio_enabled': twilio_client is not None,
        'twilio_phone': TWILIO_PHONE_NUMBER if twilio_client else None,
        'alert_numbers_configured': numbers_ready,
        'dashboard_phones': len(dashboard_alert_phones)
    })

# ============================================
# Twilio SMS REST Endpoints (called by React UI)
# ============================================

@app.route('/api/send-sms', methods=['POST'])
def api_send_sms():
    """Send a drowsiness SMS alert to a specific phone number (called by React frontend)"""
    if not twilio_client:
        return jsonify({'success': False, 'error': 'Twilio not configured. Check TWILIO_* env vars.'}), 503

    data = request.json or {}
    phone_number = data.get('phoneNumber', '').strip()
    alert_type = data.get('alertType', 'drowsiness').upper()
    source = data.get('source', 'Unknown')
    dashboard_type = data.get('dashboardType', 'Private')
    timestamp = data.get('timestamp', datetime.now().strftime('%H:%M:%S'))
    custom_message = data.get('message', '')

    if not phone_number:
        return jsonify({'success': False, 'error': 'phoneNumber is required'}), 400

    def _send():
        try:
            user_name = current_user_profile['name'] if current_user_profile else 'Unknown Driver'
            sms_body = (
                f"🚨 DROWSINESS ALERT\n"
                f"Driver: {user_name}\n"
                f"Type: {alert_type}\n"
                f"Source: {source} ({dashboard_type})\n"
                f"Time: {timestamp}\n"
            )
            if custom_message:
                sms_body += f"\n{custom_message}"

            twilio_client.messages.create(
                body=sms_body,
                from_=TWILIO_PHONE_NUMBER,
                to=phone_number
            )
            add_log("SMS", f"✔ Alert sent to {phone_number}")
        except Exception as e:
            add_log("ERROR", f"SMS send failed: {e}")

    threading.Thread(target=_send, daemon=True).start()
    return jsonify({'success': True, 'message': f'SMS dispatched to {phone_number}'})


@app.route('/api/test-sms', methods=['POST'])
def api_test_sms():
    """Send a test SMS to verify Twilio configuration (called by React Test SMS button)"""
    if not twilio_client:
        return jsonify({'success': False, 'error': 'Twilio not configured. Check TWILIO_* env vars in your .env file.'}), 503

    data = request.json or {}
    phone_number = data.get('phoneNumber', '').strip()

    if not phone_number:
        return jsonify({'success': False, 'error': 'phoneNumber is required'}), 400

    try:
        msg = twilio_client.messages.create(
            body=(
                "✅ VigilX Test Alert\n"
                "SMS notifications are working correctly.\n"
                "You will receive alerts here when drowsiness is detected."
            ),
            from_=TWILIO_PHONE_NUMBER,
            to=phone_number
        )
        add_log("SMS", f"✔ Test SMS sent to {phone_number} (SID: {msg.sid})")
        return jsonify({'success': True, 'message': f'Test SMS sent to {phone_number}', 'sid': msg.sid})
    except Exception as e:
        add_log("ERROR", f"Test SMS failed: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/sms/configure', methods=['GET', 'POST'])
def api_sms_configure():
    """
    GET  – return currently active recipient phone numbers
    POST – update recipient phone numbers from the dashboard UI
           Body: { "phones": ["+919876543210", "+14085551234"], "enabled": true }
    """
    global dashboard_alert_phones

    if request.method == 'GET':
        return jsonify({
            'success': True,
            'phones': dashboard_alert_phones,
            'twilio_enabled': twilio_client is not None
        })

    # POST: update from dashboard
    data = request.json or {}
    phones_raw = data.get('phones', [])
    enabled = data.get('enabled', True)

    if not enabled:
        # SMS disabled from the dashboard – clear runtime list
        dashboard_alert_phones = []
        add_log("SMS", "SMS alerts disabled via dashboard")
        return jsonify({'success': True, 'phones': [], 'message': 'SMS alerts disabled'})

    # Sanitise: keep only non-empty strings
    cleaned = [p.strip() for p in phones_raw if isinstance(p, str) and p.strip()]
    dashboard_alert_phones = cleaned

    if cleaned:
        add_log("SMS", f"✔ Alert recipients updated: {', '.join(cleaned)}")
    else:
        add_log("WARNING", "SMS configure called with empty phone list")

    return jsonify({'success': True, 'phones': dashboard_alert_phones})


@app.route('/api/feed')
def api_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

# Source-specific feed endpoints for simultaneous streaming
@app.route('/api/feed/webcam')
def api_feed_webcam():
    return Response(generate_frames_for_source('webcam'), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/api/feed/droidcam')
def api_feed_droidcam():
    """Direct proxy for DroidCam - forwards raw stream bytes (bypasses OpenCV)"""
    url = CAMERA_SOURCES['droidcam']['url']
    print(f"[DroidCam Proxy] Connecting to {url}...")
    try:
        r = requests.get(url, stream=True, timeout=10)
        print(f"[DroidCam Proxy] Connected! Content-Type: {r.headers.get('Content-Type')}")
        return Response(
            r.iter_content(chunk_size=8192),
            content_type=r.headers.get('Content-Type', 'multipart/x-mixed-replace; boundary=frame')
        )
    except Exception as e:
        print(f"[DroidCam Proxy] Connection failed: {e}")
        # Return a placeholder error frame
        def error_feed():
            frame = np.zeros((480, 640, 3), dtype=np.uint8)
            cv2.putText(frame, "DroidCam Connection Failed", (100, 220),
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
            cv2.putText(frame, f"Check: {url}", (120, 270),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (200, 200, 200), 1)
            ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 90])
            if ret:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
        return Response(error_feed(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/api/feed/esp32cam')
def api_feed_esp32cam():
    return Response(generate_frames_for_source('esp32cam'), mimetype='multipart/x-mixed-replace; boundary=frame')

# ============================================
# HYBRID Frame Generator - Best of Both Worlds
# ============================================

def generate_frames_for_source(source_key):
    """
    Generate frames for a specific camera source (supports multiple concurrent feeds)
    """
    # Create dedicated camera capture for this source
    source_cap = None
    
    # Connect to the specific source
    source_info = CAMERA_SOURCES[source_key]
    url = source_info['url']
    
    add_log("INFO", f"Starting feed for {source_info['name']}...")
    
    try:
        if source_key == 'esp32cam':
            # ESP32-CAM uses pull-based capture
            source_cap = None
        else:
            if isinstance(url, int):
                # Webcam
                for backend in [cv2.CAP_DSHOW, cv2.CAP_MSMF, cv2.CAP_ANY]:
                    for i in [0, 1, 2]:
                        test_cap = cv2.VideoCapture(i, backend)
                        if test_cap.isOpened():
                            ret, _ = test_cap.read()
                            if ret:
                                source_cap = test_cap
                                break
                            test_cap.release()
                    if source_cap:
                        break
            else:
                # DroidCam or network stream
                print(f"[Generator] Connecting to {url}...")
                source_cap = cv2.VideoCapture(url, cv2.CAP_FFMPEG)
                if not source_cap.isOpened():
                    print(f"[Generator] FFMPEG failed, trying default backend...")
                    source_cap = cv2.VideoCapture(url)
                
                # Give network stream time to initialize
                if source_cap.isOpened():
                    source_cap.set(cv2.CAP_PROP_BUFFERSIZE, 3)  # Larger buffer for network
                    time.sleep(0.5)  # Wait for stream initialization
                    print(f"[Generator] Stream opened successfully")
            
            if source_cap and source_cap.isOpened():
                # MAX QUALITY CAMERA SETTINGS
                source_cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1920)
                source_cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 1080)
                source_cap.set(cv2.CAP_PROP_FPS, 30)
                source_cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                source_cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*'MJPG'))
                source_cap.set(cv2.CAP_PROP_AUTO_EXPOSURE, 1)
                source_cap.set(cv2.CAP_PROP_GAIN, 200)
                source_cap.set(cv2.CAP_PROP_AUTOFOCUS, 1)
                source_cap.set(cv2.CAP_PROP_AUTO_WB, 1)
    except Exception as e:
        add_log("ERROR", f"Failed to initialize {source_key}: {e}")
        
    # Create MediaPipe landmarker for detection
    try:
        options = vision.FaceLandmarkerOptions(
            base_options=python.BaseOptions(model_asset_path=face_model_path),
            running_mode=vision.RunningMode.VIDEO,
            num_faces=1,
            min_face_detection_confidence=0.5,
            min_face_presence_confidence=0.5,
            min_tracking_confidence=0.5
        )
        landmarker = vision.FaceLandmarker.create_from_options(options)
    except Exception as e:
        add_log("ERROR", f"Landmarker error for {source_key}: {e}")
        landmarker = None
    
    # TFLite setup
    input_details = interpreter.get_input_details() if interpreter else None
    output_details = interpreter.get_output_details() if interpreter else None
    
    # Detection tracking for this source
    frame_count = 0
    ear_closed_frames = 0
    mar_high_frames = 0
    yawn_timestamps = deque()
    blink_timestamps = deque()
    eye_was_closed = False
    eye_close_start_time = None
    
    BLINK_WINDOW = 30
    YAWN_WINDOW = 60
    
    while True:
        frame = None
        
        # Capture frame based on source type
        if source_key == 'esp32cam':
            frame = get_esp32_frame()
        elif source_cap and source_cap.isOpened():
            ret, frame = source_cap.read()
            if not ret:
                frame = None
        
        if frame is None:
            # Return placeholder frame
            frame = np.zeros((480, 640, 3), dtype=np.uint8)
            cv2.putText(frame, f"No {source_info['name']} Feed", (150, 220),
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
            ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 90])
            if ret:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
            time.sleep(0.1)
            continue
        
        frame = cv2.flip(frame, 1)
        h, w = frame.shape[:2]
        current_time = time.time()
        frame_count += 1
        
        # Software brightness boost for dark scenes
        gray_check = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        avg_brightness = np.mean(gray_check)
        
        if avg_brightness < 80:
            lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            l = clahe.apply(l)
            lab = cv2.merge([l, a, b])
            frame = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
            
            if avg_brightness < 40:
                gamma = 1.4
                inv_gamma = 1.0 / gamma
                table = np.array([
                    ((i / 255.0) ** inv_gamma) * 255
                    for i in np.arange(0, 256)
                ]).astype('uint8')
                frame = cv2.LUT(frame, table)
        
        # Get active thresholds
        EAR_THRESHOLD = get_threshold('ear_threshold')
        MAR_THRESHOLD = get_threshold('mar_threshold')
        BLINK_EAR_THRESHOLD = get_threshold('blink_ear_threshold')
        BLINK_ALERT_COUNT = get_threshold('blink_alert_count')
        YAWN_ALERT_COUNT = get_threshold('yawn_alert_count')
        
        # Run detection if landmarker available
        if landmarker and detection_active:
            try:
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
                timestamp_ms = int(current_time * 1000)
                result = landmarker.detect_for_video(mp_image, timestamp_ms)
                
                if result.face_landmarks and len(result.face_landmarks) > 0:
                    face = result.face_landmarks[0]
                    
                    left_eye = np.array([[face[i].x * w, face[i].y * h] for i in LEFT_EYE])
                    right_eye = np.array([[face[i].x * w, face[i].y * h] for i in RIGHT_EYE])
                    mouth_dict = {k: np.array([face[v].x * w, face[v].y * h]) for k, v in MOUTH_POINTS.items()}
                    
                    left_ear = calculate_ear(left_eye)
                    right_ear = calculate_ear(right_eye)
                    avg_ear = (left_ear + right_ear) / 2.0
                    mar = calculate_mar(mouth_dict)
                    
                    # Blink detection
                    if avg_ear < BLINK_EAR_THRESHOLD:
                        if not eye_was_closed:
                            eye_was_closed = True
                            eye_close_start_time = current_time
                    else:
                        if eye_was_closed:
                            eye_close_duration = current_time - eye_close_start_time
                            if eye_close_duration < 0.3:
                                blink_timestamps.append(current_time)
                            eye_was_closed = False
                            eye_close_start_time = None
                    
                    while blink_timestamps and (current_time - blink_timestamps[0]) > BLINK_WINDOW:
                        blink_timestamps.popleft()
                    
                    blinks_in_window = len(blink_timestamps)
                    
                    # EAR detection - eyes closed too long
                    if avg_ear < EAR_THRESHOLD:
                        ear_closed_frames += 1
                        if ear_closed_frames > 15:  # ~0.5s at 30fps
                            trigger_alert('EAR')
                    else:
                        ear_closed_frames = 0
                    
                    # Blink alert - excessive blinking
                    if blinks_in_window >= BLINK_ALERT_COUNT:
                        trigger_alert('BLINK')
                    
                    # MAR detection - yawning
                    if mar > MAR_THRESHOLD:
                        mar_high_frames += 1
                        if mar_high_frames > 9:  # ~0.3s at 30fps
                            yawn_timestamps.append(current_time)
                            mar_high_frames = 0
                    else:
                        mar_high_frames = 0
                    
                    while yawn_timestamps and (current_time - yawn_timestamps[0]) > YAWN_WINDOW:
                        yawn_timestamps.popleft()
                    
                    yawns_in_window = len(yawn_timestamps)
                    
                    # Yawn alert - excessive yawning
                    if yawns_in_window >= YAWN_ALERT_COUNT:
                        trigger_alert('YAWN')
                    
            except Exception as e:
                pass  # Silent fail for detection errors
        
        # Clean feed - no overlays, full quality
        ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 95])
        if ret:
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
        
        time.sleep(0.01)  # ~30fps
    
    # Cleanup
    if source_cap:
        source_cap.release()

def generate_frames():
    global cap, detection_active, latest_status, detection_stats
    global ear_closed_frames, ear_alert_active, mar_high_frames, mar_cooldown
    global yawn_timestamps, blink_timestamps, eye_was_closed
    global blink_alert_triggered, yawn_alert_triggered, detector_ready

    # Blink tracking
    eye_close_start_time = None

    print("[Generator] Creating MediaPipe landmarker...")

    try:
        options = vision.FaceLandmarkerOptions(
            base_options=python.BaseOptions(model_asset_path=face_model_path),
            running_mode=vision.RunningMode.VIDEO,  # VIDEO mode for stability
            num_faces=1,
            min_face_detection_confidence=0.5,
            min_face_presence_confidence=0.5,
            min_tracking_confidence=0.5
        )
        landmarker = vision.FaceLandmarker.create_from_options(options)
        print("[Generator] âœ… Landmarker created (VIDEO mode)")
        add_log("INFO", "Face detector initialized (VIDEO mode)")
        detector_ready = True
    except Exception as e:
        print(f"[Generator] Landmarker error: {e}")
        landmarker = None

    # TFLite setup
    input_details = interpreter.get_input_details() if interpreter else None
    output_details = interpreter.get_output_details() if interpreter else None

    frame_count = 0
    BLINK_WINDOW = 30
    YAWN_WINDOW = 60

    # FPS tracking
    frame_times = deque(maxlen=30)
    actual_fps = 30.0

    # Time-based tracking
    mar_cooldown_until = 0
    ml_alert_consecutive = 0  # Track consecutive ML drowsy predictions

    while True:
        frame = None

        if current_source == 'esp32cam':
            frame = get_esp32_frame()
        elif cap and cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                frame = None

        if frame is None:
            frame = np.zeros((480, 640, 3), dtype=np.uint8)
            cv2.putText(frame, "No Camera Feed", (200, 220),
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
            ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 90])
            if ret:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
            time.sleep(0.1)
            continue

        frame = cv2.flip(frame, 1)
        h, w = frame.shape[:2]
        current_time = time.time()
        frame_count += 1
        detection_stats['total_frames'] = frame_count

        # ============================================
        # SOFTWARE BRIGHTNESS BOOST (for dark scenes)
        # ============================================
        # Check average brightness - if too dark, apply CLAHE enhancement
        gray_check = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        avg_brightness = np.mean(gray_check)

        if avg_brightness < 80:  # Frame is dark
            # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
            lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            l = clahe.apply(l)
            lab = cv2.merge([l, a, b])
            frame = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)

            # Additional gamma correction for very dark frames
            if avg_brightness < 40:
                gamma = 1.4  # Moderate brighten
                inv_gamma = 1.0 / gamma
                table = np.array([
                    ((i / 255.0) ** inv_gamma) * 255
                    for i in np.arange(0, 256)
                ]).astype('uint8')
                frame = cv2.LUT(frame, table)

        # Store raw frame for calibration (before any overlays)
        global latest_raw_frame
        latest_raw_frame = frame.copy()

        # Calculate FPS
        frame_times.append(current_time)
        if len(frame_times) >= 2:
            time_span = frame_times[-1] - frame_times[0]
            if time_span > 0:
                actual_fps = (len(frame_times) - 1) / time_span

        status = {
            'has_face': False, 'ear': 0.0, 'mar': 0.0,
            'alert_type': None, 'ml_prediction': 0.0,
            'blinks_30s': 0, 'yawns_60s': 0
        }

        # Get active thresholds
        EAR_THRESHOLD = get_threshold('ear_threshold')
        MAR_THRESHOLD = get_threshold('mar_threshold')
        BLINK_EAR_THRESHOLD = get_threshold('blink_ear_threshold')
        EAR_ALERT_SECONDS = get_threshold('ear_alert_seconds')
        BLINK_ALERT_COUNT = get_threshold('blink_alert_count')
        YAWN_ALERT_COUNT = get_threshold('yawn_alert_count')
        ML_THRESHOLD = get_threshold('ml_drowsy_threshold')

        if landmarker and detection_active:
            try:
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
                timestamp_ms = int(current_time * 1000)
                result = landmarker.detect_for_video(mp_image, timestamp_ms)

                if result.face_landmarks and len(result.face_landmarks) > 0:
                    status['has_face'] = True
                    face = result.face_landmarks[0]

                    left_eye = np.array([[face[i].x * w, face[i].y * h] for i in LEFT_EYE])
                    right_eye = np.array([[face[i].x * w, face[i].y * h] for i in RIGHT_EYE])
                    mouth_dict = {k: np.array([face[v].x * w, face[v].y * h]) for k, v in MOUTH_POINTS.items()}

                    left_ear = calculate_ear(left_eye)
                    right_ear = calculate_ear(right_eye)
                    avg_ear = (left_ear + right_ear) / 2.0
                    ear_diff = abs(left_ear - right_ear)
                    mar = calculate_mar(mouth_dict)

                    status['ear'] = float(avg_ear)
                    status['mar'] = float(mar)

                    # ============================================
                    # HYBRID APPROACH: ML + Rule-Based
                    # ============================================

                    # 1. ML Model Prediction (if available)
                    ml_drowsy = False
                    if interpreter and scaler:
                        try:
                            features = np.array([[avg_ear, left_ear, right_ear, ear_diff, mar]], dtype=np.float32)
                            features_scaled = scaler.transform(features).astype(np.float32)
                            expected_shape = input_details[0]['shape']
                            features_reshaped = features_scaled.reshape(expected_shape)
                            interpreter.set_tensor(input_details[0]['index'], features_reshaped)
                            interpreter.invoke()
                            prediction = interpreter.get_tensor(output_details[0]['index'])[0][0]
                            status['ml_prediction'] = float(prediction)

                            # ML drowsiness detection
                            if prediction > ML_THRESHOLD:
                                ml_alert_consecutive += 1
                                if ml_alert_consecutive >= 5:  # 5 consecutive frames
                                    ml_drowsy = True
                                    detection_stats['ml_drowsy_count'] += 1
                            else:
                                ml_alert_consecutive = 0
                        except Exception as e:
                            if frame_count < 5:
                                print(f"[ML Error] {e}")

                    # 2. Blink Detection (duration-based)
                    if avg_ear < BLINK_EAR_THRESHOLD:
                        if not eye_was_closed:
                            eye_was_closed = True
                            eye_close_start_time = current_time
                    else:
                        if eye_was_closed:
                            eye_close_duration = current_time - eye_close_start_time
                            # Only count rapid blinks (< 0.3s)
                            if eye_close_duration < 0.3:
                                blink_timestamps.append(current_time)
                                detection_stats['total_blinks'] += 1
                            eye_was_closed = False
                            eye_close_start_time = None

                    while blink_timestamps and (current_time - blink_timestamps[0]) > BLINK_WINDOW:
                        blink_timestamps.popleft()

                    blinks_in_window = len(blink_timestamps)
                    status['blinks_30s'] = blinks_in_window

                    if blinks_in_window >= BLINK_ALERT_COUNT:
                        status['alert_type'] = 'BLINK'
                        if not blink_alert_triggered:
                            trigger_alert('BLINK')
                            detection_stats['blink_alerts'] += 1
                            blink_alert_triggered = True
                    else:
                        blink_alert_triggered = False

                    # 3. EAR Detection (time-based)
                    if avg_ear < EAR_THRESHOLD:
                        ear_closed_frames += 1
                        ear_closed_duration = ear_closed_frames / max(actual_fps, 1.0)
                        if ear_closed_duration >= EAR_ALERT_SECONDS:
                            status['alert_type'] = 'EAR'
                            if not ear_alert_active:
                                ear_alert_active = True
                                detection_stats['ear_alerts'] += 1
                                add_log("ALERT", f"Eyes closed for {ear_closed_duration:.1f}s!")
                                trigger_alert('EAR')
                    else:
                        ear_closed_frames = 0
                        if ear_alert_active:
                            ear_alert_active = False
                            if not (blinks_in_window >= BLINK_ALERT_COUNT or len(yawn_timestamps) >= YAWN_ALERT_COUNT or ml_drowsy):
                                clear_alerts()

                    # 4. MAR Detection (time-based)
                    if mar > MAR_THRESHOLD:
                        mar_high_frames += 1
                        mar_high_duration = mar_high_frames / max(actual_fps, 1.0)
                        if mar_high_duration >= 0.3 and current_time >= mar_cooldown_until:
                            yawn_timestamps.append(current_time)
                            detection_stats['total_yawns'] += 1
                            mar_cooldown_until = current_time + 0.5
                            add_log("INFO", "Yawn detected")
                    else:
                        mar_high_frames = 0

                    while yawn_timestamps and (current_time - yawn_timestamps[0]) > YAWN_WINDOW:
                        yawn_timestamps.popleft()

                    yawns_in_window = len(yawn_timestamps)
                    status['yawns_60s'] = yawns_in_window

                    if yawns_in_window >= YAWN_ALERT_COUNT and not status['alert_type']:
                        status['alert_type'] = 'YAWN'
                        if not yawn_alert_triggered:
                            trigger_alert('YAWN')
                            detection_stats['yawn_alerts'] += 1
                            yawn_alert_triggered = True
                    else:
                        if yawns_in_window < YAWN_ALERT_COUNT:
                            yawn_alert_triggered = False

                    # 5. ML Drowsy Override (if consecutive)
                    if ml_drowsy and not status['alert_type']:
                        status['alert_type'] = 'ML_DROWSY'
                        add_log("ALERT", f"ML Model: Drowsiness detected (conf: {status['ml_prediction']:.2f})")

                    # Detection logic runs but no landmarks drawn on frame

            except Exception as e:
                if frame_count < 5:
                    print(f"[Detection Error] {e}")

        with lock:
            latest_status = status.copy()

        # Clean feed - no overlays, detection data sent via API only

        # Encode with MAX quality
        ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 95])
        if ret:
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')

        time.sleep(0.01)  # ~30fps

# ============================================
# Main
# ============================================

if __name__ == '__main__':
    print("\n" + "="*60)
    print("OPTIMIZED DROWSINESS DETECTION - BEST OF BOTH WORLDS")
    print("="*60)
    print("\nFeatures:")
    print("  âœ… TensorFlow ML Model + MediaPipe")
    print("  âœ… User Profile Calibration")
    print("  âœ… Twilio SMS Notifications")
    print("  âœ… Hardware Alerts (XIAO ESP32C3)")
    print("  âœ… Hybrid Detection (ML + Rule-Based)")
    print("  âœ… Brightness Fixed (AUTO_EXPOSURE enabled)")
    print("\nOpen: http://localhost:5000")
    print("="*60 + "\n")

    os.makedirs(MODELS_DIR, exist_ok=True)
    os.makedirs(USER_PROFILES_DIR, exist_ok=True)
    os.makedirs(CALIBRATION_DATA_DIR, exist_ok=True)

    find_model_files()
    load_ml_models()
    connect_camera('webcam')

    app.run(debug=False, host='0.0.0.0', port=5000, threaded=True)