import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import logo from '../assets/slu.png';
import {
  FiMapPin, FiBook, FiUsers, FiShield
} from 'react-icons/fi';
import '../styles/LandingPage.css';

// Short, responsive Navbar with hamburger menu
function Navbar({ scrollToRef, aboutRef, journeyRef, navigate }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="navbar">
      <div className="navbar-container">
        <Link to="/" className="logo-link">
          <img src={logo} alt="Saint Louis University" className="logo" />
        </Link>
        <nav className={menuOpen ? "nav-menu open" : "nav-menu"}>
          <ul>
            <li>
              <a onClick={() => { scrollToRef(aboutRef); setMenuOpen(false); }}>About</a>
            </li>
            <li>
              <a onClick={() => { scrollToRef(journeyRef); setMenuOpen(false); }}>Journey</a>
            </li>
            <li>
              <button onClick={() => { navigate('/login'); setMenuOpen(false); }} className="btn-login">
                Login
              </button>
            </li>
          </ul>
        </nav>
       
      </div>
    </header>
  );
}

const LandingPage = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(1);

  // Refs for scrolling
  const introRef = useRef(null);
  const aboutRef = useRef(null);
  const journeyRef = useRef(null);

  // Intersection Observer for fade-ins
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
      });
    }, { threshold: 0.3 });

    document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Scroll to section with offset
  const scrollToRef = (ref) => {
    const navbarHeight = 70;
    const elementPosition = ref.current.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - navbarHeight;
    window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
  };

  return (
    <div className="landing-page">
      {/* Navbar */}
      <Navbar
        scrollToRef={scrollToRef}
        aboutRef={aboutRef}
        journeyRef={journeyRef}
        navigate={navigate}
      />

      {/* Introduction with embedded presentation */}
      <section ref={introRef} id="introduction" className="introduction-section">
        <div className="intro-content fade-in">
          <h1>International Master of Arts in Teaching for Excellence (iMATE)</h1>
          <h2>Saint Louis University</h2>
          <p>
            The iMATE program at SLU prepares talented individuals to become exceptional educators in the United States through a unique blend of coursework, mentorship, and community support.
          </p>
        </div>
        <div className="presentation-container fade-in">
          <div className="presentation-frame" style={{ maxWidth: 960, margin: "auto" }}>
            <iframe
              src="https://docs.google.com/presentation/d/e/2PACX-1vRE9aN3WVTQ_rNobcH0o_L4XeV7PBwny2uu2c5XbObpMXf5ii3CvdmdN_A07fnbZA/embed?start=true&loop=true&delayms=4000"
              frameBorder="0"
              width="100%"
              height="480"
              allowFullScreen
              title="iMATE Program Introduction"
              loading="lazy"
              style={{ minHeight: 320, maxWidth: "100%" }}
            ></iframe>
            <div style={{ marginTop: 12, textAlign: "center" }}>
              <a
                href="https://docs.google.com/presentation/d/e/2PACX-1vRE9aN3WVTQ_rNobcH0o_L4XeV7PBwny2uu2c5XbObpMXf5ii3CvdmdN_A07fnbZA/pub?start=true&loop=true&delayms=4000"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                View Presentation in New Tab
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* What We Do (from iMATE Recruitment Presentation) */}
      <section ref={aboutRef} id="about" className="about-section">
        <div className="about-header fade-in">
          <h2>What We Do</h2>
          <p className="section-subtitle">
            iMATE guides you from application to graduation with comprehensive support, coursework, and mentorship.
          </p>
        </div>
        <div className="about-grid fade-in">
          <div className="about-card">
            <div className="card-icon"><FiMapPin /></div>
            <h3>Application Guidance</h3>
            <p>
              Personalized support through the online application, interviews, and placement with SLU's School of Education and partner schools.
            </p>
          </div>
          <div className="about-card">
            <div className="card-icon"><FiBook /></div>
            <h3>Graduate Coursework</h3>
            <p>
              Master of Arts in Teaching: rigorous courses, practicum, seminars, and capstone projects for future educators.
            </p>
          </div>
          <div className="about-card">
            <div className="card-icon"><FiUsers /></div>
            <h3>Mentorship & Support</h3>
            <p>
              Instructional coach, on-site mentor, ongoing orientation, and a dedicated support group every step of the way.
            </p>
          </div>
          <div className="about-card">
            <div className="card-icon"><FiShield /></div>
            <h3>Full Coverage</h3>
            <p>
              Tuition, fees, and health insurance are fully covered for all iMATE participants.
            </p>
          </div>
        </div>
      </section>

      {/* Your Relocation Journey */}
      <section ref={journeyRef} id="journey" className="courses-section">
        <h2 className="fade-in">Your Relocation Journey</h2>
        <p className="section-subtitle fade-in">
          Step-by-step support for your transition to St. Louis and the iMATE program.
        </p>
        <div className="flow-map fade-in">
          <div className={`flow-step ${activeStep === 1 ? 'active' : ''}`} onClick={() => setActiveStep(1)}>
            <div className="step-number">1</div>
            <div className="step-content">
              <h3>Pre-Arrival Preparation</h3>
              <p>Get ready for your move</p>
              {activeStep === 1 && (
                <div className="step-details">
                  <ul>
                    <li>Receive SLU placement and housing assignment</li>
                    <li>Prepare documents, clothing, and essentials</li>
                    <li>Review pre-arrival checklists and guides</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
          <div className="flow-connector"></div>
          <div className={`flow-step ${activeStep === 2 ? 'active' : ''}`} onClick={() => setActiveStep(2)}>
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>Arrival & Temporary Housing</h3>
              <p>Settle into your assigned Airbnb</p>
              {activeStep === 2 && (
                <div className="step-details">
                  <ul>
                    <li>Move into your furnished Airbnb</li>
                    <li>Attend orientation sessions</li>
                    <li>Learn about community guidelines and living arrangements</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
          <div className="flow-connector"></div>
          <div className={`flow-step ${activeStep === 3 ? 'active' : ''}`} onClick={() => setActiveStep(3)}>
            <div className="step-number">3</div>
            <div className="step-content">
              <h3>Shopping & Settling In</h3>
              <p>Get what you need and make your space home</p>
              {activeStep === 3 && (
                <div className="step-details">
                  <ul>
                    <li>Group shopping trips for food and supplies</li>
                    <li>Set up your study space and get familiar with your neighborhood</li>
                    <li>Acquaint yourself with household appliances and routines</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
          <div className="flow-connector"></div>
          <div className={`flow-step ${activeStep === 4 ? 'active' : ''}`} onClick={() => setActiveStep(4)}>
            <div className="step-number">4</div>
            <div className="step-content">
              <h3>Transportation & Getting Around</h3>
              <p>Navigate St. Louis with confidence</p>
              {activeStep === 4 && (
                <div className="step-details">
                  <ul>
                    <li>Use your free SLU Metro pass for buses and trains</li>
                    <li>Explore SLU shuttle routes and ride-sharing options</li>
                    <li>Learn to plan trips using the Transit app</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
          <div className="flow-connector"></div>
          <div className={`flow-step ${activeStep === 5 ? 'active' : ''}`} onClick={() => setActiveStep(5)}>
            <div className="step-number">5</div>
            <div className="step-content">
              <h3>Community Integration & Support</h3>
              <p>Thrive in your new environment</p>
              {activeStep === 5 && (
                <div className="step-details">
                  <ul>
                    <li>Connect with your mentor and support group</li>
                    <li>Access ongoing orientation, workshops, and events</li>
                    <li>Build your network and thrive in St. Louis</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <img src={logo} alt="SLU Logo" className="footer-logo" />
            <div className="footer-tagline">
              <h3>iMATE Program</h3>
              <p>Master of Arts in Teaching for Excellence</p>
            </div>
          </div>
          <div className="footer-links">
            <div className="footer-column">
              <h4>Contact Us</h4>
              <p>Mei-Ling Tung</p>
              <p>meiling.tung@slu.edu</p>
              <p>314-977-1974</p>
            </div>
            <div className="footer-column">
              <h4>Quick Links</h4>
              <ul>
                <li><a href="#about">What We Do</a></li>
                <li><a href="#journey">Journey</a></li>
              </ul>
            </div>
            <div className="footer-column">
              <h4>Resources</h4>
              <ul>
                <li><a href="#">International Student Office</a></li>
                <li><a href="#">Visa Information</a></li>
                <li><a href="#">Housing Resources</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2025 Saint Louis University. All Rights Reserved.</p>
          <div className="social-icons">
            <a href="#https://www.facebook.com/SaintLouisU/" aria-label="Facebook"><span>Facebook</span></a>
            <a href="#https://x.com/SLU_Official?ref_src=twsrc%5Egoogle%7Ctwcamp%5Eserp%7Ctwgr%5Eauthor" aria-label="Twitter"><span>Twitter</span></a>
            <a href="#https://www.linkedin.com/school/saint-louis-university/posts/?feedView=all" aria-label="LinkedIn"><span>LinkedIn</span></a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
