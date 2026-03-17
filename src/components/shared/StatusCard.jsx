import React from 'react';
import './StatusCard.css';

/**
 * StatusCard - Three-state connection status display
 * States: disconnected (gray), connecting (yellow), connected (green)
 * 
 * @param {string} state - Connection state: 'disconnected' | 'connecting' | 'connected'
 * @param {string} variant - Card variant: 'default' | 'mobile' | 'webcam'
 * @param {ReactNode} children - Additional content to display
 */
function StatusCard({ state = 'disconnected', variant = 'default', children }) {
    const getStatusColor = () => {
        if (state === 'connected') return 'var(--status-success)';
        if (state === 'connecting') return 'var(--status-warning)';
        return 'var(--status-offline)';
    };

    const getStatusLabel = () => {
        if (state === 'connected') return 'Connected';
        if (state === 'connecting') return 'Connecting...';
        return 'Disconnected';
    };

    return (
        <div className={`status-card status-card-${variant}`}>
            <div className="status-header">
                <div
                    className={`status-indicator status-${state}`}
                    style={{ '--status-color': getStatusColor() }}
                >
                    <span className="status-dot"></span>
                    <span className="status-label">{getStatusLabel()}</span>
                </div>
            </div>

            {children && (
                <div className="status-content">
                    {children}
                </div>
            )}
        </div>
    );
}

export default StatusCard;
