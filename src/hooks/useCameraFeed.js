import { useState, useEffect, useCallback } from 'react';

/**
 * Universal camera hook for all feed types
 * Supports: webcam, droidcam, esp32cam
 */
const useCameraFeed = (cameraType = 'webcam') => {
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState(null);
    const [detectionStats, setDetectionStats] = useState({
        total_frames: 0,
        ear_alerts: 0,
        blink_alerts: 0,
        yawn_alerts: 0,
        total_blinks: 0,
        total_yawns: 0
    });
    const [latestStatus, setLatestStatus] = useState({
        ear: 0.0,
        mar: 0.0,
        blinks_30s: 0,
        yawns_60s: 0,
        alert_type: null
    });

    const [statusInterval, setStatusInterval] = useState(null);

    const API_BASE = '/api';

    // Connect to camera source
    const connect = useCallback(async () => {
        setIsConnecting(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE}/connect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ source: cameraType })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setIsConnected(true);

                // Start detection automatically
                await fetch(`${API_BASE}/start_detection`, { method: 'POST' });

                // Start polling status
                const interval = setInterval(async () => {
                    try {
                        const statusRes = await fetch(`${API_BASE}/status`);
                        const statusData = await statusRes.json();

                        if (statusData.stats) {
                            setDetectionStats(statusData.stats);
                        }
                        if (statusData.latest) {
                            setLatestStatus(statusData.latest);
                        }
                    } catch (err) {
                        console.error('Status fetch error:', err);
                    }
                }, 1000); // Update every second for smooth UI

                setStatusInterval(interval);
                return { success: true };
            } else {
                throw new Error(data.message || 'Connection failed');
            }
        } catch (err) {
            setError(err.message);
            setIsConnected(false);
            return { success: false, error: err.message };
        } finally {
            setIsConnecting(false);
        }
    }, [cameraType]);

    // Disconnect from camera
    const disconnect = useCallback(async () => {
        try {
            // Stop detection
            await fetch(`${API_BASE}/stop_detection`, { method: 'POST' });

            // Clear interval
            if (statusInterval) {
                clearInterval(statusInterval);
                setStatusInterval(null);
            }

            setIsConnected(false);
            setDetectionStats({
                total_frames: 0,
                ear_alerts: 0,
                blink_alerts: 0,
                yawn_alerts: 0,
                total_blinks: 0,
                total_yawns: 0
            });
            setLatestStatus({
                ear: 0.0,
                mar: 0.0,
                blinks_30s: 0,
                yawns_60s: 0,
                alert_type: null
            });

            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }, [statusInterval]);

    // Toggle connection
    const toggleConnection = useCallback(async () => {
        if (isConnected) {
            return await disconnect();
        } else {
            return await connect();
        }
    }, [isConnected, connect, disconnect]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (statusInterval) {
                clearInterval(statusInterval);
            }
        };
    }, [statusInterval]);

    // Stream URL logic
    // DroidCam: connect directly to phone (Python/Flask can't access it, but browser can)
    // Others: go through Flask backend for processing
    const getStreamUrl = () => {
        if (!isConnected) return null;
        if (cameraType === 'droidcam') {
            // Direct connection to DroidCam - bypasses Flask
            return 'http://10.129.211.206:4747/video';
        }
        return `${API_BASE}/feed/${cameraType}`;
    };

    return {
        isConnected,
        isConnecting,
        error,
        detectionStats,
        latestStatus,
        connect,
        disconnect,
        toggleConnection,
        streamUrl: getStreamUrl(),
    };
};

export default useCameraFeed;
