import React from 'react';
import './DrowsinessMeter.css';

/**
 * DrowsinessMeter - Vertical drowsiness percentage meter
 * Displays on video overlay to show real-time drowsiness level
 * 
 * @param {number} percentage - Drowsiness level (0-100)
 * @param {string} status - Status text (e.g., "ACTIVE", "ALERT", "DROWSY")
 */
function DrowsinessMeter({ percentage = 0, status = 'ACTIVE' }) {
    const getStatusColor = (pct) => {
        if (pct < 30) return 'var(--status-success)';
        if (pct < 70) return 'var(--status-warning)';
        return 'var(--status-error)';
    };

    const getStatusClass = (pct) => {
        if (pct < 30) return 'normal';
        if (pct < 70) return 'warning';
        return 'critical';
    };

    return (
        <div className="drowsiness-meter">
            <h4 className="meter-title">DROWSINESS</h4>
            <div className="meter-visual">
                <div className="meter-track">
                    <div
                        className={`meter-fill meter-fill-${getStatusClass(percentage)}`}
                        style={{
                            height: `${percentage}%`,
                            backgroundColor: getStatusColor(percentage)
                        }}
                    />
                </div>
                <div className="meter-markers">
                    <span className="marker marker-100">100</span>
                    <span className="marker marker-75">75</span>
                    <span className="marker marker-50">50</span>
                    <span className="marker marker-25">25</span>
                    <span className="marker marker-0">0</span>
                </div>
            </div>
            <div className="meter-percentage">{percentage}%</div>
            <div className={`meter-status meter-status-${getStatusClass(percentage)}`}>
                {status}
            </div>
        </div>
    );
}

export default DrowsinessMeter;
