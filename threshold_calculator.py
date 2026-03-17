"""
Threshold Calculator for Personalized Drowsiness Detection
Calculates personalized EAR/MAR thresholds from calibration data
"""

import numpy as np
from datetime import datetime


def remove_outliers(data, percentile_low=10, percentile_high=90):
    """Remove outliers using percentile method"""
    if len(data) < 5:
        return data
    
    data_array = np.array(data)
    low = np.percentile(data_array, percentile_low)
    high = np.percentile(data_array, percentile_high)
    
    filtered = data_array[(data_array >= low) & (data_array <= high)]
    return filtered.tolist()


def calculate_personalized_thresholds(collected_data, default_thresholds):
    """
    Calculate personalized thresholds from calibration data
    
    Args:
        collected_data: Dict with 'normal', 'closed', 'yawn' phases
        default_thresholds: Fallback values if calculation fails
    
    Returns:
        (profile_dict, error_message)
    """
    try:
        # Extract data
        normal_ear = collected_data['normal']['ear']
        closed_ear = collected_data['closed']['ear']
        yawn_mar = collected_data['yawn']['mar']
        normal_mar = collected_data['normal']['mar']
        
        # Validate minimum data
        if len(normal_ear) < 20:
            return None, "Insufficient normal state data (need 20+ frames)"
        if len(closed_ear) < 15:
            return None, "Insufficient closed eyes data (need 15+ frames)"
        if len(yawn_mar) < 20:
            return None, "Insufficient yawn data (need 20+ frames)"
        
        # Remove outliers
        normal_ear_clean = remove_outliers(normal_ear)
        closed_ear_clean = remove_outliers(closed_ear)
        yawn_mar_clean = remove_outliers(yawn_mar)
        normal_mar_clean = remove_outliers(normal_mar)
        
        # Calculate statistics
        normal_ear_mean = np.mean(normal_ear_clean)
        normal_ear_std = np.std(normal_ear_clean)
        closed_ear_mean = np.mean(closed_ear_clean)
        closed_ear_std = np.std(closed_ear_clean)
        
        normal_mar_mean = np.mean(normal_mar_clean)
        yawn_mar_mean = np.mean(yawn_mar_clean)
        yawn_mar_std = np.std(yawn_mar_clean)
        
        # Calculate personalized thresholds
        # EAR threshold: slightly above closed eye mean
        ear_threshold = closed_ear_mean + 0.02
        
        # Blink detection: slightly below normal
        blink_ear_threshold = normal_ear_mean - 0.02
        
        # MAR threshold: 85% of yawn MAR to catch early yawns
        mar_threshold = yawn_mar_mean * 0.85
        
        # Ensure thresholds are reasonable
        ear_threshold = max(0.15, min(0.30, ear_threshold))
        blink_ear_threshold = max(0.18, min(0.28, blink_ear_threshold))
        mar_threshold = max(0.30, min(0.50, mar_threshold))
        
        # Determine calibration quality
        if closed_ear_mean < normal_ear_mean and yawn_mar_mean > normal_mar_mean:
            ear_separation = normal_ear_mean - closed_ear_mean
            mar_separation = yawn_mar_mean - normal_mar_mean
            
            if ear_separation > 0.10 and mar_separation > 0.15:
                quality = "excellent"
            elif ear_separation > 0.07 and mar_separation > 0.10:
                quality = "good"
            else:
                quality = "fair"
        else:
            quality = "poor"
        
        # Build profile
        profile = {
            'user_id': None,  # Will be set by caller
            'name': None,  # Will be set by caller
            'calibrated_at': datetime.now().isoformat(),
            'thresholds': {
                'ear_threshold': round(float(ear_threshold), 3),
                'mar_threshold': round(float(mar_threshold), 3),
                'blink_ear_threshold': round(float(blink_ear_threshold), 3),
                'ear_alert_frames': default_thresholds.get('ear_alert_frames', 10),
                'blink_alert_count': default_thresholds.get('blink_alert_count', 12),
                'yawn_alert_count': default_thresholds.get('yawn_alert_count', 2)
            },
            'calibration_data': {
                'normal': {
                    'ear_mean': round(float(normal_ear_mean), 3),
                    'ear_std': round(float(normal_ear_std), 3),
                    'mar_mean': round(float(normal_mar_mean), 3),
                    'frames': len(normal_ear)
                },
                'closed': {
                    'ear_mean': round(float(closed_ear_mean), 3),
                    'ear_std': round(float(closed_ear_std), 3),
                    'frames': len(closed_ear)
                },
                'yawn': {
                    'mar_mean': round(float(yawn_mar_mean), 3),
                    'mar_std': round(float(yawn_mar_std), 3),
                    'frames': len(yawn_mar)
                }
            },
            'calibration_quality': quality
        }
        
        return profile, None
        
    except Exception as e:
        return None, f"Calculation error: {str(e)}"


def validate_profile(profile):
    """
    Validate a calibration profile for sanity
    
    Returns:
        (is_valid, error_message)
    """
    try:
        # Check required fields
        if 'thresholds' not in profile:
            return False, "Missing thresholds"
        
        if 'calibration_data' not in profile:
            return False, "Missing calibration data"
        
        thresholds = profile['thresholds']
        cal_data = profile['calibration_data']
        
        # Validate threshold values
        ear_threshold = thresholds.get('ear_threshold', 0)
        mar_threshold = thresholds.get('mar_threshold', 0)
        
        if ear_threshold < 0.10 or ear_threshold > 0.35:
            return False, f"EAR threshold out of range: {ear_threshold}"
        
        if mar_threshold < 0.25 or mar_threshold > 0.60:
            return False, f"MAR threshold out of range: {mar_threshold}"
        
        # Validate data sanity
        if 'normal' in cal_data and 'closed' in cal_data:
            normal_ear = cal_data['normal'].get('ear_mean', 0)
            closed_ear = cal_data['closed'].get('ear_mean', 0)
            
            if closed_ear >= normal_ear:
                return False, "Closed EAR should be less than normal EAR"
        
        if 'normal' in cal_data and 'yawn' in cal_data:
            normal_mar = cal_data['normal'].get('mar_mean', 0)
            yawn_mar = cal_data['yawn'].get('mar_mean', 0)
            
            if yawn_mar <= normal_mar:
                return False, "Yawn MAR should be greater than normal MAR"
        
        return True, None
        
    except Exception as e:
        return False, f"Validation error: {str(e)}"


def compare_with_generic(profile, generic_thresholds):
    """
    Compare personalized thresholds with generic ones
    
    Returns:
        comparison_dict with differences and recommendations
    """
    try:
        personalized = profile['thresholds']
        
        comparison = {
            'ear_threshold': {
                'generic': generic_thresholds['ear_threshold'],
                'personalized': personalized['ear_threshold'],
                'diff': round(personalized['ear_threshold'] - generic_thresholds['ear_threshold'], 3),
                'percent_change': round(
                    ((personalized['ear_threshold'] - generic_thresholds['ear_threshold']) / 
                     generic_thresholds['ear_threshold'] * 100), 1
                )
            },
            'mar_threshold': {
                'generic': generic_thresholds['mar_threshold'],
                'personalized': personalized['mar_threshold'],
                'diff': round(personalized['mar_threshold'] - generic_thresholds['mar_threshold'], 3),
                'percent_change': round(
                    ((personalized['mar_threshold'] - generic_thresholds['mar_threshold']) / 
                     generic_thresholds['mar_threshold'] * 100), 1
                )
            }
        }
        
        # Generate recommendation
        ear_change = abs(comparison['ear_threshold']['percent_change'])
        mar_change = abs(comparison['mar_threshold']['percent_change'])
        
        if ear_change > 15 or mar_change > 15:
            recommendation = "Significant difference detected. Personalized model strongly recommended."
        elif ear_change > 5 or mar_change > 5:
            recommendation = "Moderate difference. Personalized model should improve accuracy."
        else:
            recommendation = "Small difference. Either model should work well."
        
        comparison['recommendation'] = recommendation
        
        return comparison
        
    except Exception as e:
        return {'error': str(e)}
