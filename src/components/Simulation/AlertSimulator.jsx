/**
 * AlertSimulator Component for VIGILX
 * Allows manual simulation of drowsiness alerts with SMS notifications
 */
import React, { useState, useEffect } from 'react';
import '../../styles/Simulator.css';

const AlertSimulator = ({ dashboardType = 'commercial' }) => {
    const [contacts, setContacts] = useState([]);
    const [newContact, setNewContact] = useState({ name: '', phone_number: '' });
    const [simulating, setSimulating] = useState(false);
    const [simulationResult, setSimulationResult] = useState(null);
    const [confidence, setConfidence] = useState(95);
    const [loading, setLoading] = useState(true);
    const [testingSms, setTestingSms] = useState(null);

    const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';

    useEffect(() => {
        fetchContacts();
    }, [dashboardType]);

    const fetchContacts = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${backendUrl}/api/contacts?dashboard_type=${dashboardType}`);
            const data = await response.json();
            if (data.success) {
                setContacts(data.contacts);
            }
        } catch (error) {
            console.error('Failed to fetch contacts:', error);
        } finally {
            setLoading(false);
        }
    };

    const addContact = async () => {
        if (!newContact.name.trim()) {
            alert('Please enter a contact name');
            return;
        }
        if (!newContact.phone_number.trim()) {
            alert('Please enter a phone number');
            return;
        }
        if (!/^\+[1-9]\d{9,14}$/.test(newContact.phone_number)) {
            alert('Invalid phone format. Use +CountryCode format (e.g., +919876543210)');
            return;
        }

        try {
            const response = await fetch(`${backendUrl}/api/contacts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newContact,
                    dashboard_type: dashboardType,
                    enabled: true,
                    priority: 1
                })
            });

            const data = await response.json();
            if (data.success) {
                setNewContact({ name: '', phone_number: '' });
                fetchContacts();
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (error) {
            alert(`Failed to add contact: ${error.message}`);
        }
    };

    const deleteContact = async (id) => {
        if (!window.confirm('Delete this emergency contact?')) return;

        try {
            const response = await fetch(`${backendUrl}/api/contacts/${id}`, {
                method: 'DELETE'
            });

            const data = await response.json();
            if (data.success) {
                fetchContacts();
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (error) {
            alert(`Failed to delete: ${error.message}`);
        }
    };

    const testSMS = async (phoneNumber) => {
        setTestingSms(phoneNumber);
        try {
            const response = await fetch(`${backendUrl}/api/sms/test`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone_number: phoneNumber })
            });

            const data = await response.json();
            if (data.success) {
                alert(`✅ Test SMS sent successfully to ${phoneNumber}!`);
            } else {
                alert(`❌ Failed to send SMS: ${data.error}`);
            }
        } catch (error) {
            alert(`❌ Error: ${error.message}`);
        } finally {
            setTestingSms(null);
        }
    };

    const simulateAlert = async () => {
        const enabledContacts = contacts.filter(c => c.enabled);

        if (enabledContacts.length === 0) {
            alert('Please add at least one emergency contact first!');
            return;
        }

        setSimulating(true);
        setSimulationResult(null);

        try {
            const response = await fetch(`${backendUrl}/api/simulation/trigger`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    device_name: `${dashboardType.charAt(0).toUpperCase() + dashboardType.slice(1)} Web Simulator`,
                    dashboard_type: dashboardType,
                    detection_source: 'web-simulation',
                    confidence_score: confidence / 100,
                    send_sms: true,
                    phone_numbers: enabledContacts.map(c => c.phone_number)
                })
            });

            const data = await response.json();

            if (data.success) {
                const successCount = data.smsResults.filter(r => r.success).length;
                setSimulationResult({
                    success: true,
                    alertId: data.alertId,
                    smsSent: successCount,
                    totalContacts: data.smsResults.length,
                    smsResults: data.smsResults
                });
            } else {
                setSimulationResult({ success: false, error: data.error });
            }
        } catch (error) {
            setSimulationResult({ success: false, error: error.message });
        } finally {
            setSimulating(false);
        }
    };

    return (
        <div className="alert-simulator">
            <div className="simulator-header">
                <h3>🔬 Drowsiness Alert Simulator</h3>
                <p>Test SMS alerts without hardware - Real SMS will be sent!</p>
            </div>

            {/* Add Emergency Contact */}
            <div className="add-contact-section">
                <h4>Add Emergency Contact</h4>
                <div className="contact-form">
                    <input
                        type="text"
                        placeholder="Contact Name"
                        value={newContact.name}
                        onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                    />
                    <input
                        type="tel"
                        placeholder="+919876543210"
                        value={newContact.phone_number}
                        onChange={(e) => setNewContact({ ...newContact, phone_number: e.target.value })}
                    />
                    <button onClick={addContact} className="add-btn">+ Add</button>
                </div>
            </div>

            {/* Emergency Contacts List */}
            <div className="contacts-section">
                <h4>Emergency Contacts ({contacts.length})</h4>
                {loading ? (
                    <p className="loading-text">Loading contacts...</p>
                ) : contacts.length === 0 ? (
                    <p className="no-contacts">No emergency contacts added yet. Add a contact above to enable simulation.</p>
                ) : (
                    <div className="contacts-list">
                        {contacts.map(contact => (
                            <div key={contact.id} className="contact-card">
                                <div className="contact-info">
                                    <span className="contact-name">{contact.name}</span>
                                    <span className="contact-number">{contact.phone_number}</span>
                                </div>
                                <div className="contact-actions">
                                    <button
                                        onClick={() => testSMS(contact.phone_number)}
                                        className="test-btn"
                                        disabled={testingSms === contact.phone_number}
                                    >
                                        {testingSms === contact.phone_number ? '...' : '📱 Test'}
                                    </button>
                                    <button
                                        onClick={() => deleteContact(contact.id)}
                                        className="delete-btn"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Simulation Controls */}
            <div className="simulation-controls">
                <h4>Simulate Drowsiness Detection</h4>
                <div className="confidence-slider">
                    <label>Confidence Level: <strong>{confidence}%</strong></label>
                    <input
                        type="range"
                        min="70"
                        max="100"
                        value={confidence}
                        onChange={(e) => setConfidence(parseInt(e.target.value))}
                    />
                </div>
                <button
                    onClick={simulateAlert}
                    disabled={simulating || contacts.length === 0}
                    className="simulate-btn"
                >
                    {simulating ? (
                        <>
                            <span className="spinner"></span>
                            Sending Alert...
                        </>
                    ) : (
                        '🚨 SIMULATE DROWSINESS ALERT'
                    )}
                </button>
                {contacts.length === 0 && (
                    <p className="hint-text">Add at least one contact to enable simulation</p>
                )}
            </div>

            {/* Simulation Result */}
            {simulationResult && (
                <div className={`simulation-result ${simulationResult.success ? 'success' : 'error'}`}>
                    {simulationResult.success ? (
                        <>
                            <h4>✅ Alert Simulated Successfully!</h4>
                            <p>Alert ID: <code>{simulationResult.alertId}</code></p>
                            <p>SMS sent to {simulationResult.smsSent} of {simulationResult.totalContacts} contacts</p>
                            {simulationResult.smsResults && (
                                <div className="sms-details">
                                    {simulationResult.smsResults.map((r, i) => (
                                        <div key={i} className={`sms-item ${r.success ? 'sent' : 'failed'}`}>
                                            {r.success ? '✅' : '❌'} {r.phoneNumber}
                                        </div>
                                    ))}
                                </div>
                            )}
                            <p className="check-phone">📱 Check your phone for SMS notification!</p>
                        </>
                    ) : (
                        <>
                            <h4>❌ Simulation Failed</h4>
                            <p>{simulationResult.error}</p>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default AlertSimulator;
