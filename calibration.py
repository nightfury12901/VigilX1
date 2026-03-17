"""
Calibration Module for Personalized Drowsiness Detection
Handles multi-phase data collection and frame validation
"""

import cv2
import numpy as np
import os
import time
import uuid
from datetime import datetime
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

class CalibrationSession:
    """Manages a calibration session for a user"""
    
    PHASES = {
        'normal': {
            'name': 'Normal/Alert State',
            'instruction': 'Look at the camera naturally. Keep your eyes open and relaxed.',
            'duration': 15,
            'target_frames': 30,
            'icon': '👁️'
        },
        'closed': {
            'name': 'Eyes Closed',
            'instruction': 'Close your eyes and keep them closed.',
            'duration': 10,
            'target_frames': 25,
            'icon': '😴'
        },
        'yawn': {
            'name': 'Yawning',
            'instruction': 'Yawn 3-5 times (force yawn if needed).',
            'duration': 15,
            'target_frames': 40,
            'icon': '🥱'
        }
    }
    
    def __init__(self, user_name, session_dir, face_model_path):
        self.user_id = f"user_{uuid.uuid4().hex[:8]}"
        self.user_name = user_name
        self.session_id = f"session_{uuid.uuid4().hex[:8]}"
        self.session_dir = os.path.join(session_dir, self.session_id)
        self.face_model_path = face_model_path
        
        # Create session directories
        os.makedirs(self.session_dir, exist_ok=True)
        for phase in self.PHASES.keys():
            os.makedirs(os.path.join(self.session_dir, phase), exist_ok=True)
        
        # Initialize MediaPipe
        self.landmarker = None
        self._init_landmarker()
        
        # Data storage
        self.collected_data = {
            'normal': {'ear': [], 'mar': [], 'frames': 0},
            'closed': {'ear': [], 'mar': [], 'frames': 0},
            'yawn': {'ear': [], 'mar': [], 'frames': 0}
        }
        
        # Landmark indices
        self.LEFT_EYE = [33, 160, 158, 133, 153, 144]
        self.RIGHT_EYE = [362, 385, 387, 263, 373, 380]
        self.MOUTH_POINTS = {
            'top': 13, 'bottom': 14,
            'left_top': 82, 'left_bottom': 87,
            'right_top': 312, 'right_bottom': 317,
            'left_corner': 61, 'right_corner': 291
        }
    
    def _init_landmarker(self):
        """Initialize MediaPipe face landmarker"""
        try:
            options = vision.FaceLandmarkerOptions(
                base_options=python.BaseOptions(model_asset_path=self.face_model_path),
                running_mode=vision.RunningMode.IMAGE,
                num_faces=1,
                min_face_detection_confidence=0.5,
                min_face_presence_confidence=0.5,
                min_tracking_confidence=0.5
            )
            self.landmarker = vision.FaceLandmarker.create_from_options(options)
            print("[Calibration] Landmarker initialized")
        except Exception as e:
            print(f"[Calibration] Landmarker error: {e}")
            self.landmarker = None
    
    def calculate_ear(self, eye_landmarks):
        """Calculate Eye Aspect Ratio"""
        A = np.linalg.norm(eye_landmarks[1] - eye_landmarks[5])
        B = np.linalg.norm(eye_landmarks[2] - eye_landmarks[4])
        C = np.linalg.norm(eye_landmarks[0] - eye_landmarks[3])
        return (A + B) / (2.0 * C + 1e-6)
    
    def calculate_mar(self, mouth_dict):
        """Calculate Mouth Aspect Ratio"""
        v_center = np.linalg.norm(mouth_dict['top'] - mouth_dict['bottom'])
        v_left = np.linalg.norm(mouth_dict['left_top'] - mouth_dict['left_bottom'])
        v_right = np.linalg.norm(mouth_dict['right_top'] - mouth_dict['right_bottom'])
        horizontal = np.linalg.norm(mouth_dict['left_corner'] - mouth_dict['right_corner'])
        return ((v_center + v_left + v_right) / 3.0) / (horizontal + 1e-6)
    
    def validate_frame(self, frame):
        """
        Validate frame quality
        Returns: (is_valid, feedback_message, features_dict)
        """
        if frame is None:
            return False, "No frame", None
        
        h, w = frame.shape[:2]
        
        # Check brightness
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        brightness = np.mean(gray)
        if brightness < 40:
            return False, "Too dark - improve lighting", None
        if brightness > 220:
            return False, "Too bright - reduce lighting", None
        
        # Detect face and landmarks
        if not self.landmarker:
            return False, "Landmarker not initialized", None
        
        try:
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
            result = self.landmarker.detect(mp_image)
            
            if not result.face_landmarks or len(result.face_landmarks) == 0:
                return False, "No face detected", None
            
            face = result.face_landmarks[0]
            
            # Check if face is centered (within 30% of center)
            nose_tip = face[1]  # Nose tip landmark
            face_center_x = nose_tip.x
            face_center_y = nose_tip.y
            
            if abs(face_center_x - 0.5) > 0.3 or abs(face_center_y - 0.5) > 0.3:
                return False, "Please center your face", None
            
            # Extract landmarks
            left_eye = np.array([[face[i].x * w, face[i].y * h] for i in self.LEFT_EYE])
            right_eye = np.array([[face[i].x * w, face[i].y * h] for i in self.RIGHT_EYE])
            mouth_dict = {k: np.array([face[v].x * w, face[v].y * h]) 
                         for k, v in self.MOUTH_POINTS.items()}
            
            # Calculate features
            left_ear = self.calculate_ear(left_eye)
            right_ear = self.calculate_ear(right_eye)
            avg_ear = (left_ear + right_ear) / 2.0
            mar = self.calculate_mar(mouth_dict)
            
            features = {
                'ear': avg_ear,
                'mar': mar,
                'left_eye': left_eye,
                'right_eye': right_eye,
                'mouth': mouth_dict
            }
            
            return True, "✓ Good frame", features
            
        except Exception as e:
            return False, f"Processing error: {e}", None
    
    def add_frame_data(self, phase, features):
        """Add validated frame data to collection"""
        if phase not in self.collected_data:
            return False
        
        self.collected_data[phase]['ear'].append(features['ear'])
        self.collected_data[phase]['mar'].append(features['mar'])
        self.collected_data[phase]['frames'] += 1
        
        return True
    
    def get_phase_progress(self, phase):
        """Get progress for a specific phase"""
        if phase not in self.PHASES:
            return 0, 0
        
        target = self.PHASES[phase]['target_frames']
        current = self.collected_data[phase]['frames']
        return current, target
    
    def is_phase_complete(self, phase):
        """Check if phase has enough frames"""
        current, target = self.get_phase_progress(phase)
        return current >= target
    
    def get_collected_data(self):
        """Get all collected data"""
        return self.collected_data
    
    def cleanup(self):
        """Clean up temporary files"""
        try:
            import shutil
            if os.path.exists(self.session_dir):
                shutil.rmtree(self.session_dir)
                print(f"[Calibration] Cleaned up session: {self.session_id}")
        except Exception as e:
            print(f"[Calibration] Cleanup error: {e}")


def get_phase_info(phase_key):
    """Get information about a calibration phase"""
    return CalibrationSession.PHASES.get(phase_key, None)


def get_all_phases():
    """Get list of all calibration phases"""
    return list(CalibrationSession.PHASES.keys())
