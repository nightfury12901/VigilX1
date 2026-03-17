import React, { useState } from 'react';
import { Routes, Route, useNavigate, useLocation, Link } from 'react-router-dom';
import DeviceTab from './DeviceTab';
import MobileCamTab from './MobileCamTab';
import DashcamTab from './DashcamTab';
import CalibrationModal from '../CalibrationModal';
import ProfileSelector from '../ProfileSelector';
import '../../styles/Private.css';

const PrivateDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('device');
  const [showCalibration, setShowCalibration] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    navigate(`/private/${tab}`);
  };

  const handleCalibrationComplete = (userId) => {
    setHasProfile(true);
    setShowCalibration(false);
    // Small delay then reload to pick up new profile
    setTimeout(() => window.location.reload(), 500);
  };

  React.useEffect(() => {
    if (location.pathname === '/private' || location.pathname === '/private/') {
      navigate('/private/device', { replace: true });
      setActiveTab('device');
    } else {
      const pathParts = location.pathname.split('/');
      const currentTab = pathParts[pathParts.length - 1];
      if (['device', 'mobile', 'dashcam'].includes(currentTab)) {
        setActiveTab(currentTab);
      }
    }
  }, [location.pathname, navigate]);

  return (
    <div className="private-container">
      <div className="private-header">
        <div className="header-content">
          <div className="header-top">
            <Link to="/" style={{ textDecoration: 'none' }}>
              <h1 className="dashboard-title">VIGILX</h1>
            </Link>
            <span className="mode-badge-private">Private</span>
            <div className="header-spacer"></div>

            {/* Profile Selector */}
            <ProfileSelector
              onProfileChange={(userId) => setHasProfile(!!userId)}
            />

            {/* Calibrate Button */}
            <button
              className="calibrate-btn"
              onClick={() => setShowCalibration(true)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="14.31" y1="8" x2="20.05" y2="17.94"></line>
                <line x1="9.69" y1="8" x2="21.17" y2="8"></line>
                <line x1="7.38" y1="12" x2="13.12" y2="2.06"></line>
                <line x1="9.69" y1="16" x2="3.95" y2="6.06"></line>
                <line x1="14.31" y1="16" x2="2.83" y2="16"></line>
                <line x1="16.62" y1="12" x2="10.88" y2="21.94"></line>
              </svg>
              {hasProfile ? 'Recalibrate' : 'Calibrate'}
            </button>
          </div>
          <p className="dashboard-subtitle">Personal Driver Monitoring</p>
        </div>
      </div>

      <div className="private-content">
        <div className="tab-navigation">
          <button
            className={`tab-button ${activeTab === 'device' ? 'active' : ''}`}
            onClick={() => handleTabChange('device')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
            Device
          </button>
          <button
            className={`tab-button ${activeTab === 'mobile' ? 'active' : ''}`}
            onClick={() => handleTabChange('mobile')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
              <line x1="12" y1="18" x2="12.01" y2="18"></line>
            </svg>
            Mobile Cam
          </button>
          <button
            className={`tab-button ${activeTab === 'dashcam' ? 'active' : ''}`}
            onClick={() => handleTabChange('dashcam')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 7l-7 5 7 5V7z"></path>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
            </svg>
            Dashcam
          </button>
        </div>

        <div className="tab-content">
          <Routes>
            <Route path="device" element={<DeviceTab />} />
            <Route path="mobile" element={<MobileCamTab />} />
            <Route path="dashcam" element={<DashcamTab />} />
          </Routes>
        </div>
      </div>

      {/* Calibration Modal */}
      {showCalibration && (
        <CalibrationModal
          onClose={() => setShowCalibration(false)}
          onComplete={handleCalibrationComplete}
        />
      )}
    </div>
  );
};

export default PrivateDashboard;
