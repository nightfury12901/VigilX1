/**
 * SMS Notification Utility for VIGILX
 * Handles communication with backend SMS service
 */

// If the app is served on a different port than the backend, point directly to the backend
const API_BASE_URL = process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000`;

// Rate limiting tracking (per source)
const lastSentTime = {};
const RATE_LIMIT_MS = 60000; // 1 minute between SMS per source

/**
 * Check if backend is available
 * @returns {Promise<boolean>}
 */
export const checkBackendHealth = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/health`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        return data.status === 'ok';
    } catch (error) {
        console.warn('[SMS] Backend not available:', error.message);
        return false;
    }
};

/**
 * Check if rate limit allows sending SMS
 * @param {string} source - Detection source identifier
 * @returns {boolean}
 */
const canSendSms = (source) => {
    const key = source || 'default';
    const now = Date.now();
    const lastSent = lastSentTime[key] || 0;

    return (now - lastSent) >= RATE_LIMIT_MS;
};

/**
 * Record SMS send time for rate limiting
 * @param {string} source - Detection source identifier
 */
const recordSmsSent = (source) => {
    const key = source || 'default';
    lastSentTime[key] = Date.now();
};

/**
 * Get remaining cooldown time in seconds
 * @param {string} source - Detection source identifier
 * @returns {number} Seconds until next SMS can be sent
 */
export const getCooldownRemaining = (source) => {
    const key = source || 'default';
    const now = Date.now();
    const lastSent = lastSentTime[key] || 0;
    const elapsed = now - lastSent;

    if (elapsed >= RATE_LIMIT_MS) return 0;
    return Math.ceil((RATE_LIMIT_MS - elapsed) / 1000);
};

/**
 * Send SMS alert for drowsiness detection
 * @param {Object} options
 * @param {string} options.phoneNumber - Recipient phone number (E.164 format)
 * @param {string} options.alertType - Type of alert
 * @param {string} options.timestamp - Alert timestamp
 * @param {string} options.source - Detection source (Dashcam/MobileCam/Device)
 * @param {string} options.dashboardType - Dashboard type (Commercial/Private)
 * @param {string} options.message - Optional custom message
 * @param {Function} options.onSuccess - Success callback
 * @param {Function} options.onError - Error callback
 * @returns {Promise<Object>}
 */
export const sendSmsAlert = async ({
    phoneNumber,
    alertType = 'drowsiness',
    timestamp,
    source,
    dashboardType,
    message,
    onSuccess,
    onError
}) => {
    // Rate limit check
    if (!canSendSms(source)) {
        const remaining = getCooldownRemaining(source);
        const error = {
            success: false,
            error: `Rate limited. Please wait ${remaining} seconds.`,
            code: 'FRONTEND_RATE_LIMITED'
        };
        onError?.(error);
        return error;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/send-sms`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                phoneNumber,
                alertType,
                timestamp: timestamp || new Date().toISOString(),
                source,
                dashboardType,
                message
            })
        });

        const data = await response.json();

        if (data.success) {
            recordSmsSent(source);
            onSuccess?.(data);
            return data;
        } else {
            onError?.(data);
            return data;
        }
    } catch (error) {
        const errorResult = {
            success: false,
            error: 'Failed to connect to SMS server. Please check if backend is running.',
            code: 'NETWORK_ERROR'
        };
        onError?.(errorResult);
        return errorResult;
    }
};

/**
 * Send test SMS to verify configuration
 * @param {string} phoneNumber - Recipient phone number
 * @returns {Promise<Object>}
 */
export const sendTestSms = async (phoneNumber) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/test-sms`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                phoneNumber,
                alertType: 'test'
            })
        });

        return await response.json();
    } catch (error) {
        return {
            success: false,
            error: 'Failed to connect to SMS server',
            code: 'NETWORK_ERROR'
        };
    }
};

/**
 * Validate phone number format (E.164)
 * @param {string} phoneNumber
 * @returns {boolean}
 */
export const isValidPhoneNumber = (phoneNumber) => {
    if (!phoneNumber) return false;
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber.trim());
};

export default {
    sendSmsAlert,
    sendTestSms,
    checkBackendHealth,
    isValidPhoneNumber,
    getCooldownRemaining
};
