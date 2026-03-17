/**
 * Custom Hook for SMS Configuration
 * Manages SMS settings with localStorage persistence
 * and syncs phone numbers to the Flask backend for automatic detection alerts.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { checkBackendHealth, isValidPhoneNumber } from '../utils/smsNotification';

const STORAGE_KEY_PREFIX = 'vigilx_sms_config_';
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * Push currently configured phone numbers to Flask so the detection loop
 * can use them when sending automatic drowsiness alerts.
 * Called debounced whenever the user changes phone numbers or toggles SMS.
 */
const syncToBackend = async (enabled, primaryPhone, secondaryPhone) => {
    try {
        const phones = [];
        if (enabled) {
            if (primaryPhone && isValidPhoneNumber(primaryPhone)) phones.push(primaryPhone.trim());
            if (secondaryPhone && isValidPhoneNumber(secondaryPhone)) phones.push(secondaryPhone.trim());
        }
        await fetch(`${API_BASE_URL}/api/sms/configure`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phones, enabled })
        });
    } catch (_) {
        // Silent – backend may not be running yet; the user sees the badge state
    }
};

/**
 * Custom hook for managing SMS configuration
 * @param {string} source - Unique identifier for the detection source
 * @returns {Object} SMS configuration state and functions
 */
const useSmsConfig = (source) => {
    const storageKey = `${STORAGE_KEY_PREFIX}${source}`;

    // Initialize state from localStorage
    const [config, setConfig] = useState(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) return JSON.parse(saved);
        } catch (error) {
            console.warn('[useSmsConfig] Failed to load from localStorage:', error);
        }
        return {
            enabled: false,
            primaryPhone: '',
            secondaryPhone: '',
            alertThreshold: 1,
            lastSmsSent: null,
            detectionCount: 0
        };
    });

    // Backend availability state
    const [backendAvailable, setBackendAvailable] = useState(true);
    const [isCheckingBackend, setIsCheckingBackend] = useState(false);

    // Toast/notification state
    const [toast, setToast] = useState(null);

    // Ref for debounce timer
    const syncTimer = useRef(null);

    // Save to localStorage when config changes
    useEffect(() => {
        try {
            localStorage.setItem(storageKey, JSON.stringify(config));
        } catch (error) {
            console.warn('[useSmsConfig] Failed to save to localStorage:', error);
        }
    }, [config, storageKey]);

    // Debounced sync to Flask backend whenever relevant fields change
    useEffect(() => {
        if (syncTimer.current) clearTimeout(syncTimer.current);
        syncTimer.current = setTimeout(() => {
            syncToBackend(config.enabled, config.primaryPhone, config.secondaryPhone);
        }, 800); // wait 800ms after last change before syncing
        return () => clearTimeout(syncTimer.current);
    }, [config.enabled, config.primaryPhone, config.secondaryPhone]);

    // Check backend health on mount and periodically
    useEffect(() => {
        const checkHealth = async () => {
            setIsCheckingBackend(true);
            const isAvailable = await checkBackendHealth();
            setBackendAvailable(isAvailable);
            setIsCheckingBackend(false);
        };

        checkHealth();
        const interval = setInterval(checkHealth, 30000);
        return () => clearInterval(interval);
    }, []);

    // Update config field
    const updateConfig = useCallback((field, value) => {
        setConfig(prev => ({ ...prev, [field]: value }));
    }, []);

    // Toggle SMS enabled (also immediately syncs to Flask)
    const toggleEnabled = useCallback(() => {
        setConfig(prev => ({ ...prev, enabled: !prev.enabled }));
    }, []);

    // Validate phone numbers
    const validateConfig = useCallback(() => {
        const errors = [];
        if (config.enabled) {
            if (!config.primaryPhone) {
                errors.push('Primary phone number is required');
            } else if (!isValidPhoneNumber(config.primaryPhone)) {
                errors.push('Primary phone number format is invalid. Use +[country code][number]');
            }
            if (config.secondaryPhone && !isValidPhoneNumber(config.secondaryPhone)) {
                errors.push('Secondary phone number format is invalid');
            }
        }
        return { isValid: errors.length === 0, errors };
    }, [config]);

    // Increment detection count and check if should send SMS
    const recordDetection = useCallback(() => {
        const newCount = config.detectionCount + 1;
        setConfig(prev => ({ ...prev, detectionCount: newCount }));
        return newCount >= config.alertThreshold;
    }, [config.detectionCount, config.alertThreshold]);

    // Reset detection count (after SMS sent or alert cleared)
    const resetDetectionCount = useCallback(() => {
        setConfig(prev => ({ ...prev, detectionCount: 0 }));
    }, []);

    // Record SMS sent timestamp
    const recordSmsSent = useCallback(() => {
        setConfig(prev => ({
            ...prev,
            lastSmsSent: new Date().toISOString(),
            detectionCount: 0
        }));
    }, []);

    // Show toast notification
    const showToast = useCallback((message, type = 'info', duration = 4000) => {
        setToast({ message, type });
        setTimeout(() => setToast(null), duration);
    }, []);

    // Clear toast
    const clearToast = useCallback(() => {
        setToast(null);
    }, []);

    return {
        // State
        config,
        backendAvailable,
        isCheckingBackend,
        toast,

        // Functions
        updateConfig,
        toggleEnabled,
        validateConfig,
        recordDetection,
        resetDetectionCount,
        recordSmsSent,
        showToast,
        clearToast,

        // Convenience getters
        isEnabled: config.enabled,
        primaryPhone: config.primaryPhone,
        secondaryPhone: config.secondaryPhone,
        alertThreshold: config.alertThreshold,
        lastSmsSent: config.lastSmsSent
    };
};

export default useSmsConfig;
