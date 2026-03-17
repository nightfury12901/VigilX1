import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import CommercialDashboard from './components/Commercial/CommercialDashboard';
import PrivateDashboard from './components/Private/PrivateDashboard';
import './App.css';
import './styles/variables.css';
import './styles/animations.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/commercial/*" element={<CommercialDashboard />} />
          <Route path="/private/*" element={<PrivateDashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
