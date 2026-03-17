import React from 'react';
import './StatCard.css';

/**
 * StatCard - Enhanced device statistics card with hover effects
 * 
 * @param {string} variant - Card variant: 'primary' | 'status' | 'alerts' | 'metric' | 'uptime'
 * @param {ReactNode} icon - Icon component
 * @param {string} label - Card label (uppercase)
 * @param {ReactNode} value - Main value to display
 * @param {ReactNode} meta - Optional metadata/secondary info
 * @param {ReactNode} children - Additional content
 */
function StatCard({ variant = 'default', icon, label, value, meta, children }) {
    return (
        <div className={`stat-card stat-card-${variant}`}>
            {icon && <div className="card-icon">{icon}</div>}
            {label && <div className="card-label">{label}</div>}
            {value && <div className="card-value">{value}</div>}
            {meta && <div className="card-meta">{meta}</div>}
            {children}
        </div>
    );
}

export default StatCard;
