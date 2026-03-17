import React, { useState } from 'react';
import useSmsConfig from '../../hooks/useSmsConfig';
import useCameraFeed from '../../hooks/useCameraFeed';
import { sendTestSms, isValidPhoneNumber } from '../../utils/smsNotification';

const MobileCamTab = () => {
  // Camera feed hook for DroidCam
  const camera = useCameraFeed('droidcam');
  const [logs, setLogs] = useState([
    { id: 1, timestamp: '2026-01-29 11:20:35', status: 'Drowsiness Detected', smsSent: false },
    { id: 2, timestamp: '2026-01-29 10:55:18', status: 'Drowsiness Detected', smsSent: false },
    { id: 3, timestamp: '2026-01-29 10:28:42', status: 'Drowsiness Detected', smsSent: false },
  ]);
  const [isSendingTest, setIsSendingTest] = useState(false);

  // SMS Configuration Hook
  const smsConfig = useSmsConfig('private_mobilecam');

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
              <h3>Mobile Camera Feed</h3>
              <div className={`status-indicator ${camera.isConnected ? 'connected' : 'disconnected'}`}>
                <span className="status-dot"></span>
                {camera.isConnecting ? 'Connecting...' : (camera.isConnected ? 'Connected' : 'Disconnected')}
              </div>
            </div>
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
                  Connect Mobile
                </>
              )}
            </button>
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
                  {/* MJPEG Live Stream from Flask - DroidCam */}
                  <img
                    className="video-feed-player"
                    src={camera.streamUrl}
                    alt="DroidCam Live Feed"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </>
              ) : (
                <div className="video-placeholder-content">
                  <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                    <line x1="12" y1="18" x2="12.01" y2="18"></line>
                  </svg>
                  <h4>Mobile Camera Feed</h4>
                  <p>Scan QR code to connect your mobile</p>
                </div>
              )}
            </div>
          </div>

          {/* ============================================
              CONFIGURATION SECTIONS - Below Video
              ============================================ */}

          {/* QR Code Connection Section */}
          <div className="connection-info">
            <div className="qr-section">
              <div className="qr-image-container">
                <img
                  src={`${process.env.PUBLIC_URL}/qr-code.jpg.png`}
                  alt="QR Code"
                  className="qr-code-image"
                  onError={(e) => {
                    console.error('Image failed to load');
                    e.target.style.display = 'none';
                  }}
                />
              </div>
              <span className="qr-instruction">Scan with your mobile device to connect</span>
            </div>

            <div className="connection-steps">
              <h4>Connection Steps:</h4>
              <ol>
                <li>Open the mobile app</li>
                <li>Scan the QR code</li>
                <li>Grant camera permissions</li>
                <li>Start monitoring</li>
              </ol>
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
              <span className="info-label">Connection Type</span>
              <span className="info-value">Mobile Camera</span>
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

export default MobileCamTab;
