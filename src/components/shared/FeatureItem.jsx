import React from 'react';
import './FeatureItem.css';

/**
 * FeatureItem - Animated feature list item with icon and text
 * Used in placeholder states to showcase system capabilities
 * 
 * @param {ReactNode} icon - Icon component to display
 * @param {string} text - Feature description text
 * @param {number} delay - Animation delay in seconds for stagger effect
 */
function FeatureItem({ icon, text, delay = 0 }) {
    return (
        <div
            className="feature-item"
            style={{ animationDelay: `${delay}s` }}
        >
            <div className="feature-icon">
                {icon}
            </div>
            <span className="feature-text">{text}</span>
        </div>
    );
}

export default FeatureItem;
