import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faPhone, faEnvelope, faChevronLeft, faChevronRight, faGlobe } from '@fortawesome/free-solid-svg-icons';
import { faWhatsapp, faInstagram, faFacebookF, faYoutube } from '@fortawesome/free-brands-svg-icons';
import axios from 'axios';
import './HotelSidebar.css';

const AD_API_CONFIG = {
  baseUrl: 'https://api.nearprop.com',
  apiPrefix: 'api/v1',
};

const DEFAULT_AD_IMAGE = '/src/assets/staticad.png';

const STATIC_FALLBACK_AD = {
  title: "Real Estate Opportunities",
  description: "Looking for exclusive property deals? Contact us for the best real estate investments.",
  bannerImageUrl: "/src/assets/staticad.png",
  phoneNumber: "+919155105666",
  whatsappNumber: "919155105666",
  emailAddress: "mail.nearprop@gmail.com",
  websiteUrl: "https://nearprop.com",
  instagramUrl: "https://instagram.com/nearprop",
  facebookUrl: "https://facebook.com/nearprop",
  youtubeUrl: "https://youtube.com/nearprop",
};

const HotelSidebar = ({ propertyId, propertyTitle, owner, propertydata }) => {
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [formError, setFormError] = useState(null);
  const [advertisements, setAdvertisements] = useState([]);
  const [adsLoading, setAdsLoading] = useState(true);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [isAdHovered, setIsAdHovered] = useState(false);
  const adSectionRef = useRef(null);

  const getToken = () => {
    try {
      const authData = localStorage.getItem('authData');
      if (!authData) return null;
      const parsedData = JSON.parse(authData);
      return { token: parsedData.token || null, userId: parsedData.userId || null };
    } catch (err) {
      console.error('Error parsing authData:', err.message);
      return null;
    }
  };

  // Track advertisement clicks
  const trackAdClick = async (adId, clickType) => {
    try {
      const token = getToken()?.token;
      await axios.post(
        `${AD_API_CONFIG.baseUrl}/${AD_API_CONFIG.apiPrefix}/advertisements/${adId}/click/${clickType}`,
        {},
        {
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );
      console.log(`Click tracked: ${clickType} for ad ${adId}`);
    } catch (err) {
      console.error(`Error tracking ${clickType} click:`, err.message);
    }
  };

  // Fetch advertisements
  const fetchAdvertisements = async () => {
    try {
      setAdsLoading(true);
      const token = getToken()?.token;
      const districtName = (propertydata?.districtName || 'Ujjain').replace(/[^a-zA-Z\s]/g, '');
      const response = await axios.get(
        `${AD_API_CONFIG.baseUrl}/${AD_API_CONFIG.apiPrefix}/advertisements`,
        {
          params: {
            page: 0,
            size: 10,
            sortBy: "createdAt",
            direction: "DESC",
            targetLocation: districtName,
            type: 'hotel',
          },
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );
      let ads = response.data.content || response.data;
      const filteredAds = ads.filter(ad => ad.targetLocation?.toLowerCase() === districtName.toLowerCase());
      if (filteredAds.length === 0) {
        console.warn(`No hotel advertisements found for district: ${districtName}`);
        setAdvertisements([STATIC_FALLBACK_AD]);
      } else {
        setAdvertisements(filteredAds);
      }
    } catch (err) {
      console.error('Advertisement fetch error:', err.message);
      setAdvertisements([STATIC_FALLBACK_AD]);
    } finally {
      setAdsLoading(false);
    }
  };

  useEffect(() => {
    if (propertydata?.districtName) {
      fetchAdvertisements();
    }
  }, [propertydata?.districtName]);

  useEffect(() => {
    if (advertisements && advertisements.length > 1 && !isAdHovered) {
      const interval = setInterval(() => {
        setCurrentAdIndex((prevIndex) => (prevIndex + 1) % advertisements.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [advertisements, isAdHovered]);

  const handlePrevAd = () => {
    setCurrentAdIndex((prevIndex) => (prevIndex - 1 + advertisements.length) % advertisements.length);
  };

  const handleNextAd = () => {
    setCurrentAdIndex((prevIndex) => (prevIndex + 1) % advertisements.length);
  };

  const handleDotClick = (index) => {
    setCurrentAdIndex(index);
  };

  const handleContactSubmit = (e) => {
    e.preventDefault();
    const errors = {};
    if (!contactForm.name.trim()) errors.name = 'Name is required';
    if (!contactForm.email.trim()) errors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(contactForm.email)) errors.email = 'Invalid email format';
    if (!contactForm.message.trim()) errors.message = 'Message is required';

    if (Object.keys(errors).length > 0) {
      setFormError(errors);
      return;
    }

    console.log('Contact form submitted:', contactForm);
    setContactForm({ name: '', email: '', message: '' });
    setFormError(null);
    alert('Message sent successfully!');
  };
       
  const handleAdContactClick = (ad, clickType, url) => {
    if (ad.id) {
      trackAdClick(ad.id, clickType);
    }
    window.open(url, clickType === 'phone' ? '_self' : '_blank');
  };

  console.log("dgvdhbvdjh",owner);
  
  const normalizedOwner = {
    name: owner?.name || 'Unknown Agent', 
    phone: owner?.phone || 'N/A',
    whatsapp: owner?.whatsapp || 'N/A',
    avatar: owner?.avatar || propertydata?.imageUrls?.[0] || '/placeholder.jpg',
  };

  return (
    <div className="sidebar">
      <div className="quick-info">
        <h2>Quick Info</h2>
        <div className="quick-info-grid">
          <div>
            <strong>Price:</strong> <span>₹{propertydata?.price?.toLocaleString() || 'N/A'}/{propertydata?.type === 'Hotel' ? 'night' : 'event'}</span>
          </div>
          <div>
            <strong>Type:</strong> <span>{propertydata?.type || 'N/A'}</span>
          </div>
          {/* <div>
            <strong>{propertydata?.type === 'Hotel' ? 'Rooms' : 'Capacity'}:</strong> <span>{propertydata?.area || 'N/A'} {propertydata?.landAreaPostfix}</span>
          </div> */}
          <div>
            <strong>Status:</strong> <span>{propertydata?.status || 'N/A'}</span>
          </div>
        </div>
      </div>

      <div className="sidebar-ad" ref={adSectionRef} onMouseEnter={() => setIsAdHovered(true)} onMouseLeave={() => setIsAdHovered(false)}>
        <h3>Explore More Hotels</h3>
        {adsLoading ? (
          <div className="spinner text-center">
            <div className="spinner-icon"></div>
          </div>
        ) : advertisements.length > 0 ? (
          <div className="ad-slider">
            <div className="ad-slide" style={{ transform: `translateX(-${currentAdIndex * 100}%)` }}>
              {advertisements.map((ad, index) => (
                <div key={index} className="ad-slide-item">
                  <h5 className="ad-title">{ad.title || 'Hotel Advertisement'}</h5>
                  <img
                    src={ad.bannerImageUrl || DEFAULT_AD_IMAGE}
                    alt={ad.title || 'Hotel Advertisement'}
                    className="ad-image"
                    onError={(e) => { e.target.src = DEFAULT_AD_IMAGE; }}
                  />
                  <p className="ad-description">{ad.description || 'No description available'}</p>
                  <div className="ad-contact-icons">
                    {ad.phoneNumber && ad.phoneNumber !== 'N/A' && (
                      <a 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          handleAdContactClick(ad, 'phone', `tel:${ad.phoneNumber}`);
                        }}
                        className="call" 
                        title="Call"
                      >
                        <FontAwesomeIcon icon={faPhone} />
                      </a>
                    )}
                    {ad.emailAddress && ad.emailAddress !== 'N/A' && (
                      <a 
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          window.location.href = `mailto:${ad.emailAddress}?subject=Inquiry about ${ad.title || 'Advertisement'}`;
                        }}
                        className="mail" 
                        title="Email"
                      >
                        <FontAwesomeIcon icon={faEnvelope} />
                      </a>
                    )}
                    {ad.whatsappNumber && ad.whatsappNumber !== 'N/A' && (
                      <a 
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handleAdContactClick(ad, 'whatsapp', `https://wa.me/${ad.whatsappNumber}`);
                        }}
                        className="whatsapp" 
                        title="WhatsApp"
                      >
                        <FontAwesomeIcon icon={faWhatsapp} />
                      </a>
                    )}
                    {ad.instagramUrl && (
                      <a 
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handleAdContactClick(ad, 'instagram', ad.instagramUrl);
                        }}
                        className="instagram" 
                        title="Instagram"
                      >
                        <FontAwesomeIcon icon={faInstagram} />
                      </a>
                    )}
                    {ad.facebookUrl && (
                      <a 
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handleAdContactClick(ad, 'facebook', ad.facebookUrl);
                        }}
                        className="facebook" 
                        title="Facebook"
                      >
                        <FontAwesomeIcon icon={faFacebookF} />
                      </a>
                    )}
                    {ad.youtubeUrl && (
                      <a 
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handleAdContactClick(ad, 'youtube', ad.youtubeUrl);
                        }}
                        className="youtube" 
                        title="YouTube"
                      >
                        <FontAwesomeIcon icon={faYoutube} />
                      </a>
                    )}
                    {ad.websiteUrl && (
                      <a 
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handleAdContactClick(ad, 'website', ad.websiteUrl);
                        }}
                        className="website" 
                        title="Website"
                      >
                        <FontAwesomeIcon icon={faGlobe} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {advertisements.length > 1 && (
              <>
                <button className="ad-nav-button left" onClick={handlePrevAd} aria-label="Previous Ad">
                  <FontAwesomeIcon icon={faChevronLeft} />
                </button>
                <button className="ad-nav-button right" onClick={handleNextAd} aria-label="Next Ad">
                  <FontAwesomeIcon icon={faChevronRight} />
                </button>
                <div className="ad-dots">
                  {advertisements.map((_, index) => (
                    <span
                      key={index}
                      className={`ad-dot ${index === currentAdIndex ? 'active' : ''}`}
                      onClick={() => handleDotClick(index)}
                      role="button"
                      tabIndex={0}
                      aria-label={`Go to ad ${index + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <p>No hotel advertisements available for this district.</p>
        )}
      </div>

      <div className="agent-info">
        <img 
          src='https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRFCzxivJXCZk0Kk8HsHujTO3Olx0ngytPrWw&s' 
          alt="Agent or Hotel" 
          className="agent-photo" 
          onError={(e) => { e.target.src = '/placeholder.jpg'; }} 
        />
        <div className="agent-details">
          <div><strong>{owner.name.name}</strong></div>
          <div>{owner?.role || 'Agent'}</div>
          <div className="agent-contact">
            <a href={`tel:${owner.phone}`} className="ad-contact-button call">
              <FontAwesomeIcon icon={faPhone} className="me-1" /> Call
            </a>
            <a href={`https://wa.me/${owner.whatsapp}`} target="_blank" rel="noopener noreferrer" className="ad-contact-button whatsapp">
              <FontAwesomeIcon icon={faWhatsapp} className="me-1" /> WhatsApp
            </a>
          </div>
        </div>
      </div>

      <div className="contact-container">
        <h3>Contact Agent</h3>
        <form className="contact-form" onSubmit={handleContactSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input 
              type="text" 
              value={contactForm.name} 
              onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} 
              placeholder="Your Name" 
            />
            {formError?.name && <span className="error-text">{formError.name}</span>}
          </div>
          <div className="form-group">
            <label>Email</label>
            <input 
              type="email" 
              value={contactForm.email} 
              onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} 
              placeholder="Your Email" 
            />
            {formError?.email && <span className="error-text">{formError.email}</span>}
          </div>
          <div className="form-group">
            <label>Message</label>
            <textarea 
              value={contactForm.message} 
              onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })} 
              placeholder="Your Message"
            ></textarea>
            {formError?.message && <span className="error-text">{formError.message}</span>}
          </div>
          <button type="submit" className="submit-btn">
            Send Message
          </button>
        </form>
      </div> 
    </div>
  );
};

export default HotelSidebar;