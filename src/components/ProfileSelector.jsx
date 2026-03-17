import React, { useState, useEffect, useCallback } from 'react';

const ProfileSelector = ({ onProfileChange }) => {
    const [profiles, setProfiles] = useState([]);
    const [activeProfile, setActiveProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);
    const [activatingId, setActivatingId] = useState(null);

    const fetchProfiles = useCallback(async () => {
        try {
            const res = await fetch('/api/users');
            const data = await res.json();
            if (data.success) {
                setProfiles(data.users || []);
            }
        } catch (err) {
            console.error('Failed to fetch profiles:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Check current active profile from status
    const checkActiveProfile = useCallback(async () => {
        try {
            const res = await fetch('/api/status');
            const data = await res.json();
            if (data.active_profile) {
                setActiveProfile(data.active_profile.user_id);
            }
        } catch (err) {
            // Ignore - not critical
        }
    }, []);

    useEffect(() => {
        fetchProfiles();
        checkActiveProfile();
    }, [fetchProfiles, checkActiveProfile]);

    const activateProfile = async (userId) => {
        setActivatingId(userId);
        try {
            const res = await fetch(`/api/users/${userId}/activate`, { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                setActiveProfile(userId);
                onProfileChange && onProfileChange(userId);
            }
        } catch (err) {
            console.error('Activation failed:', err);
        } finally {
            setActivatingId(null);
        }
    };

    const deactivateProfile = async () => {
        // Switch back to default thresholds
        try {
            await fetch('/api/users/default/activate', { method: 'POST' });
            setActiveProfile(null);
            onProfileChange && onProfileChange(null);
        } catch (err) {
            console.error('Deactivation failed:', err);
        }
    };

    const deleteProfile = async (userId, e) => {
        e.stopPropagation();
        if (!window.confirm('Delete this calibration profile?')) return;
        try {
            const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                setProfiles(prev => prev.filter(p => p.user_id !== userId));
                if (activeProfile === userId) {
                    setActiveProfile(null);
                    deactivateProfile();
                }
            }
        } catch (err) {
            console.error('Delete failed:', err);
        }
    };

    const getQualityColor = (quality) => {
        switch (quality) {
            case 'excellent': return '#10b981';
            case 'good': return '#3b82f6';
            case 'fair': return '#f59e0b';
            case 'poor': return '#ef4444';
            default: return '#8B5A6F';
        }
    };

    const formatDate = (dateStr) => {
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch {
            return 'Unknown';
        }
    };

    if (isLoading) return null;

    const activeProfileData = profiles.find(p => p.user_id === activeProfile);

    return (
        <div className="profile-selector">
            {/* Active Profile Indicator / Toggle */}
            <button
                className="profile-toggle"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="profile-toggle-content">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    <span className="profile-toggle-label">
                        {activeProfileData
                            ? `${activeProfileData.name}`
                            : 'Default Profile'
                        }
                    </span>
                    {activeProfileData && (
                        <span
                            className="profile-quality-dot"
                            style={{ background: getQualityColor(activeProfileData.calibration_quality) }}
                            title={`Quality: ${activeProfileData.calibration_quality}`}
                        ></span>
                    )}
                </div>
                <svg
                    className={`profile-toggle-arrow ${isExpanded ? 'expanded' : ''}`}
                    width="14" height="14" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2"
                >
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </button>

            {/* Expanded Profile List */}
            {isExpanded && (
                <div className="profile-dropdown">
                    {/* Default profile option */}
                    <div
                        className={`profile-card ${!activeProfile ? 'active' : ''}`}
                        onClick={() => { deactivateProfile(); setIsExpanded(false); }}
                    >
                        <div className="profile-card-icon default-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="16"></line>
                                <line x1="8" y1="12" x2="16" y2="12"></line>
                            </svg>
                        </div>
                        <div className="profile-card-info">
                            <span className="profile-card-name">Default Profile</span>
                            <span className="profile-card-detail">Generic thresholds • No calibration</span>
                        </div>
                        {!activeProfile && <span className="profile-active-badge">Active</span>}
                    </div>

                    {/* Calibrated profiles */}
                    {profiles.map(profile => (
                        <div
                            key={profile.user_id}
                            className={`profile-card ${activeProfile === profile.user_id ? 'active' : ''}`}
                            onClick={() => {
                                activateProfile(profile.user_id);
                                setIsExpanded(false);
                            }}
                        >
                            <div className="profile-card-icon">
                                <span className="profile-avatar">
                                    {profile.name.charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <div className="profile-card-info">
                                <span className="profile-card-name">{profile.name}</span>
                                <span className="profile-card-detail">
                                    <span
                                        className="quality-badge"
                                        style={{
                                            color: getQualityColor(profile.calibration_quality),
                                            background: `${getQualityColor(profile.calibration_quality)}15`
                                        }}
                                    >
                                        {profile.calibration_quality}
                                    </span>
                                    {' • '}EAR: {profile.thresholds?.ear_threshold?.toFixed(3) || '—'}
                                    {' • '}{formatDate(profile.calibrated_at)}
                                </span>
                            </div>
                            <div className="profile-card-actions">
                                {activeProfile === profile.user_id ? (
                                    <span className="profile-active-badge">Active</span>
                                ) : activatingId === profile.user_id ? (
                                    <span className="profile-activating">...</span>
                                ) : null}
                                <button
                                    className="profile-delete-btn"
                                    onClick={(e) => deleteProfile(profile.user_id, e)}
                                    title="Delete profile"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}

                    {profiles.length === 0 && (
                        <div className="profile-empty">
                            <p>No calibrated profiles yet</p>
                            <span>Click "Calibrate Profile" to create one</span>
                        </div>
                    )}

                    {/* Refresh button */}
                    <button className="profile-refresh-btn" onClick={(e) => { e.stopPropagation(); fetchProfiles(); }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="23 4 23 10 17 10"></polyline>
                            <polyline points="1 20 1 14 7 14"></polyline>
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                        </svg>
                        Refresh Profiles
                    </button>
                </div>
            )}
        </div>
    );
};

export default ProfileSelector;
