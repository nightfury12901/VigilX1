import React, { useState } from 'react';
import useSmsConfig from '../../hooks/useSmsConfig';
import useESP32Connection from '../../hooks/useESP32Connection';
import { sendSmsAlert, sendTestSms, isValidPhoneNumber } from '../../utils/smsNotification';
import { FeatureItem, StatusCard, DrowsinessMeter } from '../shared';

const DeviceTab = () => {
  const [logs, setLogs] = useState([
    { id: 1, timestamp: '2026-01-29 10:15:23', status: 'Drowsiness Detected', smsSent: false },
    { id: 2, timestamp: '2026-01-29 09:45:12', status: 'Drowsiness Detected', smsSent: false },
    { id: 3, timestamp: '2026-01-29 09:20:45', status: 'Drowsiness Detected', smsSent: false },
    { id: 4, timestamp: '2026-01-29 08:55:30', status: 'Drowsiness Detected', smsSent: false },
    { id: 5, timestamp: '2026-01-29 08:12:18', status: 'Drowsiness Detected', smsSent: false },
    { id: 6, timestamp: '2026-01-29 07:45:55', status: 'Drowsiness Detected', smsSent: false },
    { id: 7, timestamp: '2026-01-29 07:10:32', status: 'Drowsiness Detected', smsSent: false },
  ]);
  const [isSendingTest, setIsSendingTest] = useState(false);

  // SMS Configuration Hook
  const smsConfig = useSmsConfig('commercial_device');

  // ESP32-CAM Connection Hook
  const esp32 = useESP32Connection();

  const handleConnect = async () => {
    await esp32.toggleConnection();
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
              <h3>ESP32-CAM Device</h3>
              <div className={`status-indicator ${esp32.isConnected ? 'connected' : 'disconnected'}`}>
                <span className="status-dot"></span>
                {esp32.isConnecting ? 'Connecting...' : (esp32.isConnected ? 'Connected' : 'Disconnected')}
              </div>
            </div>
            <button
              className="connect-btn"
              onClick={handleConnect}
              disabled={esp32.isConnecting}
            >
              {esp32.isConnected ? (
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
                  Connect Device
                </>
              )}
            </button>
          </div>

          {/* ============================================
              VIDEO FEED PLACEHOLDER - Hero Element
              ============================================ */}
          <div className="video-feed-container">
            <div className="video-feed-placeholder">
              {esp32.isConnected ? (
                <>
                  {/* Live MJPEG Stream from Flask Server */}
                  <img
                    className="video-feed-player"
                    src={esp32.streamUrl}
                    alt="ESP32-CAM Live Feed"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />

                  {/* Top Overlay - Status Badge & Metric Pills */}
                  <div className="video-overlay-top">
                    <div className="video-live-indicator">
                      <div className="live-dot"></div>
                      <span>LIVE</span>
                    </div>
                    {esp32.latestDetection && (
                      <>
                        <div className={`metric-pill ${esp32.latestDetection.ear > 0.25 ? 'pill-normal' : 'pill-alert'}`}>
                          <span className="pill-label">EAR:</span>
                          <span className="pill-value">{esp32.latestDetection.ear.toFixed(3)}</span>
                        </div>
                        <div className={`metric-pill ${esp32.latestDetection.mar < 0.6 ? 'pill-normal' : 'pill-alert'}`}>
                          <span className="pill-label">MAR:</span>
                          <span className="pill-value">{esp32.latestDetection.mar.toFixed(3)}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Bottom Overlay - Counters & Source Badge */}
                  {esp32.latestDetection && (
                    <div className="video-overlay-bottom">
                      <div className="counter-badge">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        <span>{esp32.latestDetection.blinks || 0}/30s</span>
                      </div>
                      <div className="counter-badge">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"></circle>
                          <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                          <line x1="9" y1="9" x2="9.01" y2="9"></line>
                          <line x1="15" y1="9" x2="15.01" y2="9"></line>
                        </svg>
                        <span>{esp32.latestDetection.yawns || 0}/60s</span>
                      </div>
                      <div className="source-badge">ESP32-CAM</div>
                    </div>
                  )}

                  {/* Drowsiness Meter - Right Sidebar */}
                  {esp32.latestDetection && (
                    <DrowsinessMeter
                      percentage={Math.round((1 - esp32.latestDetection.ear) * 100)}
                      status={esp32.latestDetection.status || 'ACTIVE'}
                    />
                  )}
                </>
              ) : esp32.isConnecting ? (
                <div className="esp32-placeholder connecting">
                  <div className="loading-spinner"></div>
                  <h4>Connecting to ESP32-CAM...</h4>
                  <p className="placeholder-subtitle">Establishing link to 192.168.4.1:80</p>
                  <div className="connection-progress">
                    <div className="progress-bar">
                      <div className="progress-fill"></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="esp32-placeholder">
                  {/* Animated Camera Icon */}
                  <div className="camera-icon-wrapper">
                    <svg className="camera-icon animate-pulse" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                      <circle cx="12" cy="13" r="4"></circle>
                    </svg>
                  </div>

                  {/* Main Heading */}
                  <h2 className="tech-heading">Real-Time Drowsiness Detection</h2>
                  <p className="tech-subheading">Powered by ESP32-CAM + TensorFlow Lite</p>

                  {/* Feature Checklist */}
                  <div className="features-grid">
                    <FeatureItem
                      icon={
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      }
                      text="Eye Closure Detection (EAR < 0.25)"
                      delay={0.1}
                    />
                    <FeatureItem
                      icon={
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"></circle>
                          <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                          <line x1="9" y1="9" x2="9.01" y2="9"></line>
                          <line x1="15" y1="9" x2="15.01" y2="9"></line>
                        </svg>
                      }
                      text="Yawn Detection (MAR > 0.40)"
                      delay={0.2}
                    />
                    <FeatureItem
                      icon={
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                        </svg>
                      }
                      text="Blink Rate Monitoring (12/30s alert)"
                      delay={0.3}
                    />
                    <FeatureItem
                      icon={
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                        </svg>
                      }
                      text="XIAO ESP32C3 Hardware Alerts"
                      delay={0.4}
                    />
                  </div>

                  {/* Device Specifications */}
                  <div className="device-specs">
                    <div className="spec-item">
                      <span className="spec-icon">📡</span>
                      <div className="spec-content">
                        <span className="spec-label">Device IP</span>
                        <span className="spec-value">192.168.4.1</span>
                      </div>
                    </div>
                    <div className="spec-item">
                      <span className="spec-icon">📷</span>
                      <div className="spec-content">
                        <span className="spec-label">Camera</span>
                        <span className="spec-value">OV7670 640×480</span>
                      </div>
                    </div>
                    <div className="spec-item">
                      <span className="spec-icon">⚡</span>
                      <div className="spec-content">
                        <span className="spec-label">Protocol</span>
                        <span className="spec-value">HTTP/MJPEG</span>
                      </div>
                    </div>
                  </div>

                  {/* Troubleshooting Guide */}
                  <details className="troubleshooting-section">
                    <summary>Connection Troubleshooting Guide</summary>
                    <ol className="troubleshooting-steps">
                      <li>Ensure ESP32-CAM is powered on and LED is blinking</li>
                      <li>Connect to device WiFi network (SSID: ESP32-CAM)</li>
                      <li>Verify device IP address is 192.168.4.1</li>
                      <li>Check Flask server is running on port 5001</li>
                      <li>Try restarting the device if connection fails</li>
                    </ol>
                  </details>

                  {/* Error Message */}
                  {esp32.error && (
                    <div className="error-message">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                      </svg>
                      {esp32.error}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ============================================
              CONFIGURATION SECTIONS - Below Video
              ============================================ */}

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
                    disabled={!smsConfig.backendAvailable || isSendingTest || !smsConfig.primaryPhone}
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
              <span className="info-label">Device ID</span>
              <span className="info-value">ESP32-CAM-001</span>
            </div>
            <div className="info-item">
              <span className="info-label">Status</span>
              <span className="info-value">{esp32.isConnected ? 'Active' : 'Offline'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Total Alerts</span>
              <span className="info-value">{esp32.detectionStats.drowsy_frames || logs.length}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Blinks (30s)</span>
              <span className="info-value">{esp32.detectionStats.blinks_30s || 0}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Yawns (60s)</span>
              <span className="info-value">{esp32.detectionStats.yawns_60s || 0}</span>
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

export default DeviceTab;
