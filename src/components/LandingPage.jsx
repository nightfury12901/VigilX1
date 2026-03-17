import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import LivesSavedCounter from './LivesSavedCounter';
import '../styles/LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.1 }
    }
  };

  const scaleIn = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } }
  };

  return (
    <div className="landing-container">
      {/* Sticky Navbar */}
      <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
        <Link to="/" className="navbar-logo">
          <h1 className="nav-brand">VIGILX</h1>
        </Link>
        <div className="nav-links">
          <button className="nav-link" onClick={() => scrollToSection('features')}>Features</button>
          <button className="nav-link" onClick={() => scrollToSection('how-it-works')}>How it works</button>
          <button className="nav-link" onClick={() => scrollToSection('why-vigilx')}>Why VIGILX</button>
          <button className="nav-link" onClick={() => scrollToSection('impact')}>Impact</button>
          <button className="nav-link" onClick={() => scrollToSection('choose-mode')}>Modes</button>
        </div>
        <button className="nav-cta" onClick={() => scrollToSection('choose-mode')}>
          Get Started
        </button>
      </nav>

      {/* Hero Section with Video Background */}
      <section className="hero-section">
        <div className="hero-video-container">
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="hero-video"
            poster={`${process.env.PUBLIC_URL}/assets/images/highway3.jpg`}
            onError={(e) => console.error('❌ Video error:', e.target.error)}
          >
            <source src={`${process.env.PUBLIC_URL}/assets/video/highway.mp4`} type="video/mp4" />
          </video>
          <div className="hero-overlay"></div>
        </div>

        <motion.div
          className="hero-content"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <motion.h1 className="hero-headline" variants={fadeInUp}>
            150,000 lives lost to driver fatigue, every year.
          </motion.h1>
          <motion.p className="hero-subheadline" variants={fadeInUp}>
            VIGILX is an affordable, offline drowsiness-detection system for any vehicle, built for Indian roads.
          </motion.p>
          <motion.div className="hero-cta-buttons" variants={fadeInUp}>
            <button className="cta-button primary" onClick={() => scrollToSection('choose-mode')}>
              Get Started
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
            <button className="cta-button secondary" onClick={() => scrollToSection('features')}>
              See Features
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <polyline points="19 12 12 19 5 12"></polyline>
              </svg>
            </button>
          </motion.div>

          {/* Proof Chips */}
          <motion.div className="proof-chips" variants={fadeInUp}>
            <div className="proof-chip">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              0.2s latency
            </div>
            <div className="proof-chip">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="1" y1="1" x2="23" y2="23"></line>
                <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
                <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
                <line x1="12" y1="20" x2="12.01" y2="20"></line>
              </svg>
              Works offline (no Wi-Fi)
            </div>
            <div className="proof-chip">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              60-second install
            </div>
            <div className="proof-chip">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23"></line>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
              Affordable: ₹399–₹599
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Lives Saved Counter Section */}
      <LivesSavedCounter />

      {/* Features Section */}
      <motion.section
        id="features"
        className="section features-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={staggerContainer}
      >
        <motion.h2 className="section-title" variants={fadeInUp}>Features</motion.h2>
        <div className="features-grid">
          <motion.div className="feature-card" variants={scaleIn}>
            <div className="feature-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
                <rect x="9" y="9" width="6" height="6"></rect>
                <line x1="9" y1="1" x2="9" y2="4"></line>
                <line x1="15" y1="1" x2="15" y2="4"></line>
                <line x1="9" y1="20" x2="9" y2="23"></line>
                <line x1="15" y1="20" x2="15" y2="23"></line>
              </svg>
            </div>
            <h3>Offline on-device AI (TinyML)</h3>
            <p>All processing happens on the device — no cloud, no delay</p>
          </motion.div>
          <motion.div className="feature-card" variants={scaleIn}>
            <div className="feature-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
            </div>
            <h3>Audio + haptic alerts</h3>
            <p>Loud buzzer and vibration alerts that wake you up instantly</p>
          </motion.div>
          <motion.div className="feature-card" variants={scaleIn}>
            <div className="feature-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
              </svg>
            </div>
            <h3>Plug-and-play setup</h3>
            <p>Mount, power, and go — no tools or installation needed</p>
          </motion.div>
        </div>
      </motion.section>

      {/* Problem Section */}
      <motion.section
        className="section problem-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={fadeInUp}
      >
        <div className="problem-content">
          <div className="problem-image-container">
            <img
              src="/assets/images/sleepingondash.jpg"
              alt="Driver fatigue is dangerous"
              className="problem-image"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div className="problem-image-fallback"></div>
          </div>
          <div className="problem-text">
            <h2>Driver fatigue kills more than drunk driving.</h2>
            <p>Every 18 minutes, someone on Indian roads dies due to a preventable fatigue-related accident. Most drivers don't realize they're drowsy until it's too late.</p>
          </div>
        </div>
      </motion.section>

      {/* How It Works */}
      <motion.section
        id="how-it-works"
        className="section how-it-works-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={staggerContainer}
      >
        <motion.h2 className="section-title" variants={fadeInUp}>How It Works</motion.h2>
        <div className="steps-container">
          <motion.div className="step-card" variants={scaleIn}>
            <div className="step-number">1</div>
            <h4>Mount on dashboard</h4>
            <p>Secure the device facing the driver</p>
          </motion.div>
          <div className="step-connector"></div>
          <motion.div className="step-card" variants={scaleIn}>
            <div className="step-number">2</div>
            <h4>Plug into power</h4>
            <p>Connect via USB or 12V adapter</p>
          </motion.div>
          <div className="step-connector"></div>
          <motion.div className="step-card" variants={scaleIn}>
            <div className="step-number">3</div>
            <h4>Get alerts instantly</h4>
            <p>Receive warnings when drowsiness detected</p>
          </motion.div>
        </div>
      </motion.section>

      {/* Why VIGILX */}
      <motion.section
        id="why-vigilx"
        className="section why-vigilx-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={staggerContainer}
      >
        <motion.h2 className="section-title" variants={fadeInUp}>Why VIGILX</motion.h2>
        <div className="why-grid">
          <motion.div className="why-card" variants={scaleIn}>
            <div className="why-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23"></line>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
            </div>
            <h4>Affordable</h4>
            <p>Starting at ₹399 — accessible to every driver in India</p>
          </motion.div>
          <motion.div className="why-card" variants={scaleIn}>
            <div className="why-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
              </svg>
            </div>
            <h4>Plug & Play</h4>
            <p>No installation needed — ready in 60 seconds flat</p>
          </motion.div>
          <motion.div className="why-card" variants={scaleIn}>
            <div className="why-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="1" y1="1" x2="23" y2="23"></line>
                <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
                <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
                <line x1="12" y1="20" x2="12.01" y2="20"></line>
              </svg>
            </div>
            <h4>No Internet Required</h4>
            <p>Works offline in highways, hills, and remote areas</p>
          </motion.div>
          <motion.div className="why-card" variants={scaleIn}>
            <div className="why-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                <polyline points="2 17 12 22 22 17"></polyline>
                <polyline points="2 12 12 17 22 12"></polyline>
              </svg>
            </div>
            <h4>Innovation-First</h4>
            <p>TinyML + edge AI for real-time 0.2s detection</p>
          </motion.div>
        </div>
      </motion.section>

      {/* Impact Section */}
      <motion.section
        id="impact"
        className="section impact-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={staggerContainer}
      >
        <motion.h2 className="section-title" variants={fadeInUp}>The Impact</motion.h2>
        <div className="impact-stats">
          <motion.div className="stat-card" variants={scaleIn}>
            <span className="stat-number">1,50,000</span>
            <span className="stat-label">Preventable deaths annually</span>
          </motion.div>
          <motion.div className="stat-card" variants={scaleIn}>
            <span className="stat-number">30%</span>
            <span className="stat-label">Fatal road accidents linked to fatigue</span>
          </motion.div>
          <motion.div className="stat-card" variants={scaleIn}>
            <span className="stat-number">₹1.08L Cr</span>
            <span className="stat-label">Accident cost impact on economy</span>
          </motion.div>
        </div>
      </motion.section>

      {/* Choose Your Mode */}
      <motion.section
        id="choose-mode"
        className="section modes-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={staggerContainer}
        style={{ position: 'relative', overflow: 'hidden' }}
      >
        {/* Background Video - Grayscale */}
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="modes-video"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 0,
            pointerEvents: 'none',
            filter: 'grayscale(100%) brightness(0.6)',
          }}
        >
          <source src={`${process.env.PUBLIC_URL}/assets/video/montage.mp4`} type="video/mp4" />
        </video>
        {/* Light overlay for text readability - no color tint */}
        <div
          className="modes-overlay"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1,
            background: 'rgba(0, 0, 0, 0.2)',
            pointerEvents: 'none',
          }}
        />
        {/* Content */}
        <div style={{ position: 'relative', zIndex: 10 }}>
          <motion.h2 className="section-title" variants={fadeInUp}>Choose Your Mode</motion.h2>
          <div className="mode-cards">
            <motion.div
              className="mode-card"
              variants={scaleIn}
              onClick={() => navigate('/commercial')}
            >
              <div className="mode-header">
                <div className="mode-icon">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="1" y="3" width="15" height="13"></rect>
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                    <circle cx="5.5" cy="18.5" r="2.5"></circle>
                    <circle cx="18.5" cy="18.5" r="2.5"></circle>
                  </svg>
                </div>
                <span className="mode-tag">For Business</span>
              </div>
              <h3>Commercial</h3>
              <p className="mode-included">Alerts + Trip history + Reports</p>
              <p className="mode-description">Fleet management with advanced monitoring and analytics</p>
              <p className="mode-best-for">Best for fleet owners, logistics, ride-hailing partners.</p>
              <ul className="mode-features">
                <li>Multiple vehicle tracking</li>
                <li>Driver behavior analytics</li>
                <li>Centralized dashboard</li>
                <li>Detailed reports</li>
              </ul>
              <button className="mode-cta">
                Get Started
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </button>
            </motion.div>

            <motion.div
              className="mode-card"
              variants={scaleIn}
              onClick={() => navigate('/private')}
            >
              <div className="mode-header">
                <div className="mode-icon">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </div>
                <span className="mode-tag">For Personal</span>
              </div>
              <h3>Private</h3>
              <p className="mode-included">Alerts + Trip history</p>
              <p className="mode-description">Simple monitoring solution for individual drivers</p>
              <p className="mode-best-for">Best for daily commuters and long-distance travelers.</p>
              <ul className="mode-features">
                <li>Quick setup</li>
                <li>Personal alerts</li>
                <li>Easy to use</li>
                <li>Trip history</li>
              </ul>
              <button className="mode-cta">
                Get Started
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </button>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Final CTA */}
      <motion.section
        className="section final-cta-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.5 }}
        variants={fadeInUp}
      >
        <h2>Ready to make every journey safer?</h2>
        <p>Join thousands of drivers who are staying alert on Indian roads.</p>
        <button className="cta-button primary large" onClick={() => scrollToSection('choose-mode')}>
          Get Started Now
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </button>
      </motion.section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <h3>VIGILX</h3>
            <p>Keeping Indian roads safer, one driver at a time.</p>
          </div>
          <div className="footer-links">
            <div className="footer-column">
              <h4>Product</h4>
              <button onClick={() => scrollToSection('features')}>Features</button>
              <button onClick={() => scrollToSection('how-it-works')}>How it works</button>
            </div>
            <div className="footer-column">
              <h4>Use Cases</h4>
              <button onClick={() => navigate('/commercial')}>Commercial</button>
              <button onClick={() => navigate('/private')}>Private</button>
            </div>
            <div className="footer-column">
              <h4>Company</h4>
              <button onClick={() => scrollToSection('why-vigilx')}>About</button>
              <button onClick={() => scrollToSection('impact')}>Impact</button>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2026 VIGILX. Built for Indian roads.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
