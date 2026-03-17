import React, { useState } from 'react';
import { Routes, Route, useNavigate, useLocation, Link } from 'react-router-dom';
import DeviceTab from './DeviceTab';
import MobileCamTab from './MobileCamTab';
import DashcamTab from './DashcamTab';
import CalibrationModal from '../CalibrationModal';
import ProfileSelector from '../ProfileSelector';
import '../../styles/Commercial.css';

const CommercialDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('device');
  const [showCalibration, setShowCalibration] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    navigate(`/commercial/${tab}`);
  };

  const handleCalibrationComplete = (userId) => {
    setHasProfile(true);
    setShowCalibration(false);
  };

  React.useEffect(() => {
    if (location.pathname === '/commercial' || location.pathname === '/commercial/') {
      navigate('/commercial/device', { replace: true });
      setActiveTab('device');
    } else {
      // Sync activeTab from URL path
      const pathParts = location.pathname.split('/');
      const currentTab = pathParts[pathParts.length - 1];
      if (['device', 'mobile-cam', 'dashcam'].includes(currentTab)) {
        setActiveTab(currentTab);
      }
    }
  }, [location.pathname, navigate]);

  return (
    <div className="commercial-container">
      <header className="commercial-header">
        <div className="header-content">
          <div className="header-top">
            <Link to="/" style={{ textDecoration: 'none' }}>
              <h1 className="dashboard-title">VIGILX</h1>
            </Link>
            <span className="mode-badge">Commercial</span>
          </div>
          <p className="dashboard-subtitle">Fleet Monitoring Dashboard</p>

          {/* Profile Selector */}
          <div style={{ position: 'absolute', top: '20px', right: '180px', zIndex: 100 }}>
            <ProfileSelector
              onProfileChange={(userId) => setHasProfile(!!userId)}
            />
          </div>
          <button
            className="calibrate-btn"
            onClick={() => setShowCalibration(true)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px'
            }}
          >
            📊 {hasProfile ? 'Recalibrate' : 'Calibrate Profile'}
          </button>
        </div>
      </header>

      <main className="commercial-content">
        <nav className="tab-navigation">
          <button
            className={`tab-button ${activeTab === 'device' ? 'active' : ''}`}
            onClick={() => handleTabChange('device')}
          >
            Device
          </button>
          <button
            className={`tab-button ${activeTab === 'mobile-cam' ? 'active' : ''}`}
            onClick={() => handleTabChange('mobile-cam')}
          >
            Mobile Cam
          </button>
          <button
            className={`tab-button ${activeTab === 'dashcam' ? 'active' : ''}`}
            onClick={() => handleTabChange('dashcam')}
          >
            Dashcam
          </button>
        </nav>

        <div className="tab-content">
          <Routes>
            <Route path="device" element={<DeviceTab />} />
            <Route path="mobile-cam" element={<MobileCamTab />} />
            <Route path="dashcam" element={<DashcamTab />} />
          </Routes>
        </div>
      </main>

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

export default CommercialDashboard;
