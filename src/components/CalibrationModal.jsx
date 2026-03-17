import React, { useState, useEffect, useRef, useCallback } from 'react';
import '../styles/CalibrationModal.css';

const CalibrationModal = ({ onClose, onComplete }) => {
    const [step, setStep] = useState(0); // 0=Welcome, 1=Normal, 2=Closed, 3=Yawn, 4=Results
    const [userName, setUserName] = useState('');
    const [userId, setUserId] = useState(null);
    const [progress, setProgress] = useState({ current: 0, target: 30 });
    const [feedback, setFeedback] = useState('');
    const [isValid, setIsValid] = useState(true);
    const [profile, setProfile] = useState(null);
    const [isCapturing, setIsCapturing] = useState(false);

    // Use refs for values needed in intervals (avoids stale closure bugs)
    const sessionIdRef = useRef(null);
    const captureIntervalRef = useRef(null);

    const phases = ['normal', 'closed', 'yawn'];
    const phaseInfo = {
        normal: { name: 'Normal State', icon: '👁️', instruction: 'Look at the camera naturally. Keep your eyes open and relaxed.', target: 30 },
        closed: { name: 'Eyes Closed', icon: '😴', instruction: 'Close your eyes and keep them closed.', target: 25 },
        yawn: { name: 'Yawning', icon: '🥱', instruction: 'Yawn 3-5 times (force yawn if needed).', target: 40 }
    };

    const stopCapture = useCallback(() => {
        if (captureIntervalRef.current) {
            clearInterval(captureIntervalRef.current);
            captureIntervalRef.current = null;
        }
        setIsCapturing(false);
    }, []);

    const startPhaseCapture = useCallback((phase, sid) => {
        // Stop any existing capture first
        if (captureIntervalRef.current) {
            clearInterval(captureIntervalRef.current);
        }

        const activeSessionId = sid || sessionIdRef.current;
        if (!activeSessionId) {
            console.error('No session ID available for capture');
            setFeedback('⚠ Error: No session ID');
            return;
        }

        console.log(`[Calibration] Starting capture for phase: ${phase}, session: ${activeSessionId}`);
        setIsCapturing(true);

        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/calibration/${activeSessionId}/capture`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phase })
                });
                const data = await res.json();

                if (data.success) {
                    if (data.valid) {
                        setFeedback('✓ ' + data.feedback);
                        setIsValid(true);
                        setProgress(data.progress);

                        if (data.progress.complete) {
                            clearInterval(interval);
                            captureIntervalRef.current = null;
                            setIsCapturing(false);
                            setFeedback('✅ Phase Complete! Click "Next Phase" to continue.');
                        }
                    } else {
                        setFeedback('⚠ ' + data.feedback);
                        setIsValid(false);
                    }
                } else {
                    setFeedback('⚠ ' + (data.error || 'Capture failed'));
                    setIsValid(false);
                }
            } catch (err) {
                console.error('Capture error:', err);
                setFeedback('⚠ Connection error - retrying...');
                setIsValid(false);
            }
        }, 500); // 500ms interval = 2 captures/sec (less aggressive than 300ms)

        captureIntervalRef.current = interval;
    }, []);

    const startCalibration = async () => {
        if (!userName.trim()) {
            alert('Please enter your name');
            return;
        }

        try {
            setFeedback('Starting calibration...');
            const res = await fetch('/api/calibration/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: userName })
            });
            const data = await res.json();

            if (data.success) {
                // Store in ref FIRST (synchronous, immediate)
                sessionIdRef.current = data.session_id;
                setUserId(data.user_id);
                setStep(1);
                setFeedback('Capturing frames... look at the camera');

                // Now start capture with the session ID passed directly
                startPhaseCapture('normal', data.session_id);
            } else {
                alert('Calibration failed: ' + (data.error || 'Unknown error'));
            }
        } catch (err) {
            alert('Failed to start calibration: ' + err.message);
        }
    };

    const nextPhase = () => {
        stopCapture();
        const currentPhaseIndex = step - 1;
        const nextPhaseIndex = currentPhaseIndex + 1;

        if (nextPhaseIndex < phases.length) {
            setStep(step + 1);
            setProgress({ current: 0, target: phaseInfo[phases[nextPhaseIndex]].target });
            setFeedback('Capturing frames...');
            // Pass sessionId directly from ref
            startPhaseCapture(phases[nextPhaseIndex], sessionIdRef.current);
        } else {
            // All phases complete - process results
            processResults();
        }
    };

    const processResults = async () => {
        setFeedback('Processing calibration data...');
        try {
            const res = await fetch(`/api/calibration/${sessionIdRef.current}/process`, {
                method: 'POST'
            });
            const data = await res.json();

            if (data.success) {
                setProfile(data.profile);
                setStep(4); // Show results
                setFeedback('');
            } else {
                alert('Processing failed: ' + (data.error || 'Unknown error'));
            }
        } catch (err) {
            alert('Processing failed: ' + err.message);
        }
    };

    const acceptProfile = async () => {
        try {
            const res = await fetch(`/api/calibration/${sessionIdRef.current}/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profile })
            });
            const data = await res.json();

            if (data.success) {
                // Activate profile
                await fetch(`/api/users/${userId}/activate`, { method: 'POST' });
                alert('✅ Profile saved and activated!');
                onComplete && onComplete(userId);
                onClose();
            } else {
                alert('Save failed: ' + (data.error || 'Unknown error'));
            }
        } catch (err) {
            alert('Save failed: ' + err.message);
        }
    };

    const cancelCalibration = async () => {
        stopCapture();
        if (sessionIdRef.current) {
            try {
                await fetch(`/api/calibration/${sessionIdRef.current}/cancel`, { method: 'POST' });
            } catch (e) { /* ignore */ }
        }
        onClose();
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopCapture();
        };
    }, [stopCapture]);

    return (
        <div className="calibration-modal-overlay" onClick={cancelCalibration}>
            <div className="calibration-modal" onClick={(e) => e.stopPropagation()}>
                {/* Step 0: Welcome */}
                {step === 0 && (
                    <div className="cal-step">
                        <h2>📊 Calibration Wizard</h2>
                        <p>Create your personalized drowsiness detection profile (~ 3 minutes)</p>

                        <input
                            type="text"
                            className="cal-input"
                            placeholder="Your Name"
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && startCalibration()}
                        />

                        <div className="cal-info-box">
                            <h4>📋 You'll complete 3 phases:</h4>
                            <ul>
                                <li><strong>Normal State:</strong> Look at camera naturally (30 frames)</li>
                                <li><strong>Eyes Closed:</strong> Close and keep closed (25 frames)</li>
                                <li><strong>Yawning:</strong> Yawn 3-5 times (40 frames)</li>
                            </ul>
                        </div>

                        <div className="cal-actions">
                            <button className="cal-btn cal-btn-secondary" onClick={cancelCalibration}>Cancel</button>
                            <button className="cal-btn cal-btn-primary" onClick={startCalibration}>Start Calibration →</button>
                        </div>
                    </div>
                )}

                {/* Steps 1-3: Calibration Phases */}
                {step >= 1 && step <= 3 && (
                    <div className="cal-step">
                        <div className="cal-phase-header">
                            <span className="cal-phase-number">Phase {step} of 3</span>
                        </div>
                        <h2>{phaseInfo[phases[step - 1]].icon} {phaseInfo[phases[step - 1]].name}</h2>

                        <div className="cal-instruction">
                            {phaseInfo[phases[step - 1]].instruction}
                        </div>

                        <img className="cal-preview" src="/api/feed" alt="Calibration Preview" />

                        <div className="cal-progress-bar">
                            <div
                                className="cal-progress-fill"
                                style={{ width: `${Math.max((progress.current / progress.target) * 100, 8)}%` }}
                            >
                                {progress.current} / {progress.target}
                            </div>
                        </div>

                        <div className={`cal-feedback ${isValid ? 'valid' : 'invalid'}`}>
                            {feedback || (isCapturing ? '⏳ Capturing frames...' : 'Waiting...')}
                        </div>

                        <div className="cal-actions">
                            <button className="cal-btn cal-btn-danger" onClick={cancelCalibration}>✖ Cancel</button>
                            {progress.current >= progress.target && (
                                <button className="cal-btn cal-btn-success" onClick={nextPhase}>
                                    {step < 3 ? 'Next Phase →' : 'Process Results →'}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Step 4: Results */}
                {step === 4 && profile && (
                    <div className="cal-step">
                        <h2>🎉 Calibration Complete!</h2>

                        <div className="cal-quality">
                            Quality: <span className={`badge badge-${profile.calibration_quality}`}>
                                {profile.calibration_quality}
                            </span>
                        </div>

                        <div className="cal-results">
                            <div className="result-card">
                                <h4>Your Thresholds</h4>
                                <p>EAR: {profile.thresholds.ear_threshold.toFixed(3)}</p>
                                <p>MAR: {profile.thresholds.mar_threshold.toFixed(3)}</p>
                            </div>
                            <div className="result-card">
                                <h4>Calibration Data</h4>
                                <p>Normal EAR: {profile.calibration_data.normal.ear_mean.toFixed(3)}</p>
                                <p>Closed EAR: {profile.calibration_data.closed.ear_mean.toFixed(3)}</p>
                            </div>
                        </div>

                        <div className="cal-actions">
                            <button className="cal-btn cal-btn-danger" onClick={cancelCalibration}>✖ Reject</button>
                            <button className="cal-btn cal-btn-success" onClick={acceptProfile}>✓ Accept & Save</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CalibrationModal;
