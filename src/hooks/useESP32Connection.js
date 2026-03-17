import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for managing ESP32-CAM connection and detection status
 * Handles connection state, retry logic, and status polling
 */
const useESP32Connection = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState(null);
    const [detectionStats, setDetectionStats] = useState({
        total_frames: 0,
        drowsy_frames: 0,
        alert_frames: 0,
        blinks_30s: 0,
        yawns_60s: 0,
        consecutive_drowsy: 0
    });
    const [latestDetection, setLatestDetection] = useState({
        ear: 0.0,
        mar: 0.0,
        status: 'Disconnected',
        alert_type: null
    });

    const statusPollInterval = useRef(null);
    const retryCount = useRef(0);
    const maxRetries = 3;

    const ESP32_API_BASE = '/api'; // Use React proxy to Flask backend

    /**
     * Fetch current detection status from Flask server
     */
    const fetchStatus = useCallback(async () => {
        try {
            const response = await fetch(`${ESP32_API_BASE}/status`);
            if (response.ok) {
                const data = await response.json();
                setDetectionStats(data.stats || {});
                setLatestDetection(data.latest || {});
            }
        } catch (err) {
            console.error('Error fetching status:', err);
            // Don't set error here, just log it
        }
    }, []);

    /**
     * Start polling detection status every 2 seconds
     */
    const startStatusPolling = useCallback(() => {
        if (statusPollInterval.current) {
            clearInterval(statusPollInterval.current);
        }

        statusPollInterval.current = setInterval(() => {
            fetchStatus();
        }, 2000);

        // Fetch immediately
        fetchStatus();
    }, [fetchStatus]);

    /**
     * Stop polling detection status
     */
    const stopStatusPolling = useCallback(() => {
        if (statusPollInterval.current) {
            clearInterval(statusPollInterval.current);
            statusPollInterval.current = null;
        }
    }, []);

    /**
     * Connect to ESP32-CAM device
     */
    const connect = useCallback(async () => {
        setIsConnecting(true);
        setError(null);

        try {
            const response = await fetch(`${ESP32_API_BASE}/connect`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    source: 'esp32cam',
                    action: 'connect'
                }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setIsConnected(true);
                setError(null);
                retryCount.current = 0;
                startStatusPolling();
                return { success: true };
            } else {
                throw new Error(data.error || 'Failed to connect to ESP32-CAM');
            }
        } catch (err) {
            const errorMessage = err.message || 'Unable to connect to ESP32-CAM at 192.168.4.1';
            setError(errorMessage);
            setIsConnected(false);

            // Retry logic with exponential backoff
            if (retryCount.current < maxRetries) {
                retryCount.current += 1;
                const retryDelay = Math.pow(2, retryCount.current) * 1000; // 2s, 4s, 8s

                setTimeout(() => {
                    if (!isConnected) {
                        connect();
                    }
                }, retryDelay);
            }

            return { success: false, error: errorMessage };
        } finally {
            setIsConnecting(false);
        }
    }, [isConnected, startStatusPolling]);

    /**
     * Disconnect from ESP32-CAM device
     */
    const disconnect = useCallback(async () => {
        try {
            await fetch(`${ESP32_API_BASE}/connect`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    source: 'esp32cam',
                    action: 'disconnect'
                }),
            });

            setIsConnected(false);
            setError(null);
            retryCount.current = 0;
            stopStatusPolling();

            // Reset stats
            setDetectionStats({
                total_frames: 0,
                drowsy_frames: 0,
                alert_frames: 0,
                blinks_30s: 0,
                yawns_60s: 0,
                consecutive_drowsy: 0
            });
            setLatestDetection({
                ear: 0.0,
                mar: 0.0,
                status: 'Disconnected',
                alert_type: null
            });

            return { success: true };
        } catch (err) {
            console.error('Error disconnecting:', err);
            return { success: false, error: err.message };
        }
    }, [stopStatusPolling]);

    /**
     * Toggle connection state
     */
    const toggleConnection = useCallback(async () => {
        if (isConnected) {
            return await disconnect();
        } else {
            return await connect();
        }
    }, [isConnected, connect, disconnect]);

    /**
     * Check if Flask server is available
     */
    const checkServerHealth = useCallback(async () => {
        try {
            const response = await fetch(`${ESP32_API_BASE}/health`);
            if (response.ok) {
                const data = await response.json();
                return {
                    available: true,
                    esp32_connected: data.esp32_connected,
                    detector_ready: data.detector_ready
                };
            }
            return { available: false };
        } catch (err) {
            return { available: false };
        }
    }, []);

    /**
     * Cleanup on unmount
     */
    useEffect(() => {
        return () => {
            stopStatusPolling();
        };
    }, [stopStatusPolling]);

    return {
        // State
        isConnected,
        isConnecting,
        error,
        detectionStats,
        latestDetection,

        // Actions
        connect,
        disconnect,
        toggleConnection,
        checkServerHealth,

        // Utilities
        streamUrl: isConnected ? `${ESP32_API_BASE}/feed` : null,
    };
};

export default useESP32Connection;
