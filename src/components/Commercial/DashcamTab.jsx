import React, { useState, useEffect, useRef } from 'react';
import useSmsConfig from '../../hooks/useSmsConfig';
import useCameraFeed from '../../hooks/useCameraFeed';
import { sendSmsAlert, sendTestSms, isValidPhoneNumber } from '../../utils/smsNotification';
import AlertSimulator from '../Simulation/AlertSimulator';

const DashcamTab = () => {
  // Camera feed hook for webcam
  const camera = useCameraFeed('webcam');
  const [showSimulator, setShowSimulator] = useState(false);
  const [logs, setLogs] = useState([]);
  const logPollRef = useRef(null);

  // Poll the Flask backend for real-time detection logs
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const resp = await fetch('http://localhost:5000/api/logs');
        if (resp.ok) {
          const data = await resp.json();
          // data is array of {level, message, timestamp} from Flask
          setLogs(data.map((entry, idx) => ({
            id: idx,
            timestamp: entry.timestamp || new Date().toLocaleString(),
            status: entry.message || 'Detection Event',
            level: entry.level || 'INFO',
            smsSent: entry.level === 'SMS',
          })));
        }
      } catch (e) {
        // silently fail if backend not yet up
      }
    };
    fetchLogs();
    logPollRef.current = setInterval(fetchLogs, 5000);
    return () => clearInterval(logPollRef.current);
  }, []);
  const [isSendingTest, setIsSendingTest] = useState(false);

  // SMS Configuration Hook
  const smsConfig = useSmsConfig('commercial_dashcam');

  const handleConnect = async () => {
    await camera.toggleConnection();
  };

  const handleTestSms = async () => {
    if (!isValidPhoneNumber(smsConfig.primaryPhone)) {
      smsConfig.showToast('Please enter a valid phone number (+country code)', 'error');
      return;
    }

    setIsSendingTest(true);
    const result = await sendTestSms(smsConfig.primaryPhone);
    setIsSendingTest(false);

    if (result.success) {
      smsConfig.showToast('Test SMS sent successfully!', 'success');
      smsConfig.recordSmsSent();
    } else {
      smsConfig.showToast(result.error || 'Failed to send test SMS', 'error');
    }
  };

  // Simulated drowsiness detection trigger (would be called by actual detection logic)
  const handleDrowsinessDetected = async () => {
    const timestamp = new Date().toISOString();
    const newLog = {
      id: logs.length + 1,
      timestamp: new Date().toLocaleString(),
      status: 'Drowsiness Detected',
      smsSent: false
    };

    // Check if SMS should be sent based on threshold
    if (smsConfig.isEnabled && smsConfig.recordDetection()) {
      const result = await sendSmsAlert({
        phoneNumber: smsConfig.primaryPhone,
        alertType: 'drowsiness',
        timestamp,
        source: 'Dashcam',
        dashboardType: 'Commercial',
        onSuccess: () => {
          newLog.smsSent = true;
          smsConfig.recordSmsSent();
          smsConfig.showToast('Alert SMS sent!', 'success');
        },
        onError: (err) => {
          smsConfig.showToast(err.error || 'SMS failed', 'error');
        }
      });

      // Send to secondary phone if configured
      if (result.success && smsConfig.secondaryPhone && isValidPhoneNumber(smsConfig.secondaryPhone)) {
        await sendSmsAlert({
          phoneNumber: smsConfig.secondaryPhone,
          alertType: 'drowsiness',
          timestamp,
          source: 'Dashcam',
          dashboardType: 'Commercial'
        });
      }
    }

    setLogs([newLog, ...logs]);
  };

  return (
    <div className="device-tab">
      {/* Toast Notification */}
      {smsConfig.toast && (
        <div className={`sms-toast sms-toast-${smsConfig.toast.type}`}>
          <span>{smsConfig.toast.message}</span>
          <button onClick={smsConfig.clearToast} className="toast-close">×</button>
        </div>
      )}

      {/* Header with Status and Connection Controls */}
      <div className="device-header">
        <div className="device-status-card">
          <div className="status-row">
            <div className="status-info">
              <h3>Dashcam Feed</h3>
              <div className={`status-indicator ${camera.isConnected ? 'connected' : 'disconnected'}`}>
                <span className="status-dot"></span>
                {camera.isConnecting ? 'Connecting...' : (camera.isConnected ? 'Connected' : 'Disconnected')}
              </div>
            </div>
            <div className="action-buttons">
              <button className="connect-btn" onClick={handleConnect} disabled={camera.isConnecting}>
                {camera.isConnected ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                    Disconnect
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Connect Dashcam
                  </>
                )}
              </button>
              <button
                className="connect-btn"
                onClick={() => setShowSimulator(!showSimulator)}
                style={{ background: showSimulator ? 'linear-gradient(135deg, #8B1538, #DB2777)' : undefined }}
              >
                🔬 {showSimulator ? 'Hide Simulator' : 'Alert Simulator'}
              </button>
            </div>
          </div>

          {/* ============================================
              VIDEO FEED PLACEHOLDER - Hero Element
              ============================================ */}
          <div className="video-feed-container">
            <div className="video-feed-placeholder">
              {camera.isConnected ? (
                <>
                  <div className="video-live-indicator">
                    <div className="live-dot"></div>
                    <span>LIVE</span>
                  </div>
                  {/* MJPEG Live Stream from Flask - Webcam */}
                  <img
                    className="video-feed-player"
                    src={camera.streamUrl}
                    alt="Webcam Live Feed"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </>
              ) : (
                <div className="video-placeholder-content">
                  <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <polygon points="23 7 16 12 23 17 23 7"></polygon>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                  </svg>
                  <h4>Dashcam Feed</h4>
                  <p>Connect dashcam to start monitoring</p>
                </div>
              )}
            </div>
          </div>

          {/* Alert Simulator */}
          {showSimulator && <AlertSimulator dashboardType="commercial" />}

          {/* ============================================
              CONFIGURATION SECTIONS - Below Video
              ============================================ */}

          {/* Dashcam Configuration */}
          <div className="dashcam-config">
            <div className="config-section">
              <h4>Dashcam Configuration</h4>
              <div className="config-options">
                <div className="config-item">
                  <span className="config-label">IP Address:</span>
                  <input
                    type="text"
                    className="config-input"
                    placeholder="192.168.1.100"
                    disabled={camera.isConnected}
                  />
                </div>
                <div className="config-item">
                  <span className="config-label">Port:</span>
                  <input
                    type="text"
                    className="config-input"
                    placeholder="8080"
                    disabled={camera.isConnected}
                  />
                </div>
                <div className="config-item">
                  <span className="config-label">Stream URL:</span>
                  <input
                    type="text"
                    className="config-input"
                    placeholder="/stream"
                    disabled={camera.isConnected}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SMS Configuration Section */}
          <div className="sms-config">
            <div className="config-section">
              <div className="sms-header">
                <h4>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                  SMS Alerts
                </h4>
                <div className="sms-status-badge">
                  {smsConfig.backendAvailable ? (
                    <span className="status-online">● Online</span>
                  ) : (
                    <span className="status-offline">● Backend Offline</span>
                  )}
                </div>
              </div>

              <div className="config-options">
                <div className="config-item toggle-item">
                  <span className="config-label">Enable SMS Alerts:</span>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={smsConfig.isEnabled}
                      onChange={smsConfig.toggleEnabled}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="config-item">
                  <span className="config-label">Primary Phone:</span>
                  <input
                    type="tel"
                    className={`config-input ${smsConfig.primaryPhone && !isValidPhoneNumber(smsConfig.primaryPhone) ? 'input-error' : ''}`}
                    placeholder="+1234567890"
                    value={smsConfig.primaryPhone}
                    onChange={(e) => smsConfig.updateConfig('primaryPhone', e.target.value)}
                  />
                </div>

                <div className="config-item">
                  <span className="config-label">Secondary Phone:</span>
                  <input
                    type="tel"
                    className="config-input"
                    placeholder="+1234567890 (optional)"
                    value={smsConfig.secondaryPhone}
                    onChange={(e) => smsConfig.updateConfig('secondaryPhone', e.target.value)}
                  />
                </div>

                <div className="config-item">
                  <span className="config-label">Alert Threshold:</span>
                  <select
                    className="config-input config-select"
                    value={smsConfig.alertThreshold}
                    onChange={(e) => smsConfig.updateConfig('alertThreshold', parseInt(e.target.value))}
                  >
                    <option value={1}>Immediate (1st detection)</option>
                    <option value={2}>After 2 detections</option>
                    <option value={3}>After 3 detections</option>
                  </select>
                </div>

                <div className="config-item sms-actions">
                  <button
                    className="test-sms-btn"
                    onClick={handleTestSms}
                    disabled={isSendingTest || !smsConfig.primaryPhone}
                  >
                    {isSendingTest ? (
                      <>
                        <span className="spinner"></span>
                        Sending...
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="22" y1="2" x2="11" y2="13"></line>
                          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                        Test SMS
                      </>
                    )}
                  </button>
                  {smsConfig.lastSmsSent && (
                    <span className="last-sms-time">
                      Last sent: {new Date(smsConfig.lastSmsSent).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Device Info Stats */}
          <div className="device-info">
            <div className="info-item">
              <span className="info-label">Connection Type</span>
              <span className="info-value">Dashcam</span>
            </div>
            <div className="info-item">
              <span className="info-label">Status</span>
              <span className="info-value">{camera.isConnected ? 'Active' : 'Offline'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Total Alerts</span>
              <span className="info-value">{logs.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detection Log Section */}
      <div className="logs-section">
        <div className="section-header">
          <h3>Drowsiness Detection Log</h3>
          <div className="header-actions">
            <span className="log-count">{logs.length} alerts today</span>
            <button className="icon-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10"></polyline>
                <polyline points="1 20 1 14 7 14"></polyline>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
            </button>
          </div>
        </div>

        <div className="logs-container">
          {logs.length > 0 ? (
            <div className="logs-list">
              {logs.map((log) => (
                <div key={log.id} className="log-item">
                  <div className="log-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                      <line x1="12" y1="9" x2="12" y2="13"></line>
                      <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                  </div>
                  <div className="log-details">
                    <p className="log-status">{log.status}</p>
                    <span className="log-timestamp">{log.timestamp}</span>
                  </div>
                  {log.smsSent && (
                    <div className="log-sms-badge" title="SMS Alert Sent">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                      </svg>
                    </div>
                  )}
                  <div className="log-badge">Alert</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="logs-empty">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
              <p>No alerts recorded</p>
              <span>Drowsiness detections will appear here with timestamps</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashcamTab;
