import React from "react";
import logo2 from '../assets/Nearprop 1.png';
import { Link } from "react-router-dom";
import './Footer.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFacebook, faGooglePlus, faInstagram, faLinkedin,
  faPinterest, faXTwitter, faYoutube, faGooglePlay,
  faWhatsapp
} from '@fortawesome/free-brands-svg-icons';

function Footer() {
  return (
    <footer className="footer-section">
      <div className="footer-content">
        <div className="footer-col logo-col">
          <div className="brand-header">
            <div className="text-container">
              <img src={logo2} alt="logo" className="logo-img" />
              <div className="title-container">
                <h2 className="brand-title text-light">Nearprop</h2>  
                <p className="brand-subtitle">Discover Your Next Home</p>
              </div>
            </div>
          </div>
          <p className="description">
            Discover your dream home with NearProp — your trusted partner for finding the best properties, hotels, and commercial spaces across India.
          </p>
          <div className="download-app">
            <h3 className="download-title">Download Our App</h3>
            <p className="download-desc">Get the NearProp app for a seamless property search experience!</p>
            <a href="https://play.google.com/store/apps/details?id=com.nearprop.near_prop" target="_blank" rel="noopener noreferrer" className="playstore-link">
              <FontAwesomeIcon icon={faGooglePlay} className="playstore-icon" />
              Get it on Google Play
            </a>
          </div>
        </div>

        <div className="footer-col">
          <h3>Top cities</h3>
          <ul>
            <li><a href="cityproperty?city=Begusarai">Begusarai</a></li>
            <li><a href="cityproperty?city=lakhisarai">lakhisarai</a></li>
             <li><a href="cityproperty?city=Munger">Munger</a></li>
              <li><a href="cityproperty?city=Saharsa">Saharsa</a></li>
               <li><a href="cityproperty?city=Purnia">Purnia</a></li>
          </ul>
        </div>

        <div className="footer-col">
          <h3>Useful Links</h3>
          <ul>
            <li><Link to='/'>Home</Link></li>
            <li><Link to='/properties'>Property</Link></li>
            <li><Link to='/agent'>Advisor</Link></li>
            <li><Link to='/developer'>Developer</Link></li>
            <li><Link to='/reels'>Reel</Link></li>
            <li><Link to='/franchise-request'>Want to be a Franchise</Link></li>
            <li><Link to='/termsandcondition'>Terms and Condition</Link></li>
            <li><Link to='/privacyandpolicy'>Privacy Policy</Link></li>
            <li><Link to='/RefundPolicy'>Refund Policy</Link></li>
            {/* <li><Link to='/my-franchise'>My Franchise</Link></li> */}
          </ul>
        </div>

        <div className="footer-col">
          <h3>Contact</h3>
          <p>📍 Ward No. 15, Kutumb Nagar, Etwa, Begusarai, Bihar – 851117</p>
          <p>📧 contact@nearprop.com</p>
          <p>📞 +91 91551 05666</p>

          <div className="social-icons">
            <a href="https://www.facebook.com/Nearprop"><FontAwesomeIcon icon={faFacebook} /></a>
          
            <a href="https://www.instagram.com/nearprop"><FontAwesomeIcon icon={faInstagram} /></a>
            <a href="https://whatsapp.com/channel/0029VbB066PFy72ADpApP924"><FontAwesomeIcon icon={faWhatsapp} /></a>
            {/* <a href="#"><FontAwesomeIcon icon={faPinterest} /></a>
            <a href="#"><FontAwesomeIcon icon={faXTwitter} /></a> */}
            <a href="https://youtube.com/@nearprop"><FontAwesomeIcon icon={faYoutube} /></a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        Powered by Rudraashwi Technology
      </div>
    </footer>
  );
}

export default Footer;