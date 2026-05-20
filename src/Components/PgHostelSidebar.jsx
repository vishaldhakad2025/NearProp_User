// PgHostelSidebar.jsx

import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useNavigate } from 'react-router-dom';
import { faPhone, faEnvelope, faMessage, faChevronLeft, faTimes, faGlobe } from '@fortawesome/free-solid-svg-icons';
import { faWhatsapp, faInstagram, faFacebookF, faYoutube } from '@fortawesome/free-brands-svg-icons';
import axios from 'axios';

const API_CONFIG = {
  baseUrl: 'https://api.nearprop.com',
  apiPrefix: 'api',
};

const DEFAULT_AVATAR = '/assets/default-avatar.png';
const DEFAULT_AD_IMAGE = '/assets/default-ad.png';

const PgHostelSidebar = ({ propertyId = "", propertyTitle = "", propertydata, owner, isGuest = false }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('tour');
  const [visitForm, setVisitForm] = useState({
    propertyId: propertyId,
    scheduledTime: "",
    notes: "",
  });
  const [visitError, setVisitError] = useState(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);

  // Updated getToken function with double-stringify fix and better debugging
  const getToken = () => {
    try {
      const authData = localStorage.getItem('authData');
      if (!authData) return null;

      let parsedData;
      try {
        parsedData = JSON.parse(authData);
      } catch (e) {
        console.error('Failed to parse authData:', e);
        return null;
      }

      // Fix for double JSON.stringify issue
      if (typeof parsedData === 'string') {
        try {
          parsedData = JSON.parse(parsedData);
        } catch (e) {
          console.error('Double parse failed:', e);
          return null;
        }
      }

      if (!parsedData || !parsedData.token) return null;

      const token = parsedData.token;

      // Verify token expiration
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) {
          localStorage.removeItem('authData');
          return null;
        }
      } catch (e) {
        console.error('Invalid JWT token:', e);
        return null;
      }

      return token;
    } catch (err) {
      console.error('Token validation error:', err);
      return null;
    }
  };

  const token = isGuest ? null : getToken();

  // Normalize owner data
  const normalizedOwner = {
    name: owner?.name || 'Unknown Agent',
    phone: owner?.phone || 'N/A',
    whatsapp: owner?.whatsapp || 'N/A',
    avatar: owner?.avatar && typeof owner.avatar === 'string' && owner.avatar.trim() !== '' ? owner.avatar : DEFAULT_AVATAR,
  };

  // Handle schedule visit
  const handleScheduleVisit = async (e) => {
    e.preventDefault();
    if (isGuest || !token) {
      setVisitError('Please log in to schedule a visit.');
      return;
    }
    try {
      const response = await axios.post(
        `${API_CONFIG.baseUrl}/${API_CONFIG.apiPrefix}/visits`,
        {
          propertyId: visitForm.propertyId,
          scheduledTime: visitForm.scheduledTime,
          notes: visitForm.notes,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      setVisitError(null);
      setVisitForm({ propertyId: visitForm.propertyId, scheduledTime: "", notes: "" });
      setShowSuccessDialog(true);
    } catch (err) {
      console.error('Error scheduling visit:', err);
      setVisitError('Failed to schedule visit. Please try again later.');
    }
  };

  // Handle chat open - Find existing chat or create new
  const handleOpenChat = async () => {
    if (isGuest || !token) {
      setVisitError('Please log in to start a chat.');
      return;
    }

    setChatLoading(true);
    setVisitError(null);

    try {
      // Fetch all chat rooms
      const response = await axios.get(
        `${API_CONFIG.baseUrl}/${API_CONFIG.apiPrefix}/chat-rooms`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const chatRooms = response.data || [];
      
      // Try to find existing chat room matching this property
      const propertyNumericId = propertydata?.ids;
      
      const existingChat = chatRooms.find(chat => 
        chat.property && chat.property.id === propertyNumericId
      );

      if (existingChat) {
        navigate('/chat', { 
          state: { 
            chatRoomId: existingChat.id,
            propertyId: propertyNumericId,
            propertyTitle: propertyTitle || existingChat.property.title 
          } 
        });
      } else {
        navigate('/chat', { 
          state: { 
            propertyId: propertyNumericId,
            propertyTitle: propertyTitle 
          } 
        });
      }
    } catch (err) {
      console.error('Error fetching chat rooms:', err);
      navigate('/chat', { 
        state: { 
          propertyId: propertydata?.ids || propertyId,
          propertyTitle: propertyTitle 
        } 
      });
    } finally {
      setChatLoading(false);
    }
  };

  const minDateTime = new Date().toISOString().slice(0, 16);
  
  // Check for basic plan
  const planName = (propertydata?.subscriptionPlanName || "").toString().trim().toLowerCase();
  const isBasicPlan = planName.startsWith("basic");

  return (
    <div>
      <style jsx>{`
        .sidebar-container {
          width: 100%;
          max-width: 580px;
          background: #ffffff;
          border-radius: 2px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
          padding: 16px;
        }
        .success-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        .success-modal {
          background: #fff;
          border-radius: 12px;
          width: 90%;
          max-width: 400px;
          padding: 24px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }
        .action-buttons-row {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 16px;
        }
        .message-call-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }
        .action-button {
          flex: 1;
          padding: 12px;
          border-radius: 8px;
          color: white;
          font-weight: 500;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 0.9rem;
          border: none;
          cursor: pointer;
          position: relative;
        }
        .action-button.message {
          background: #3b82f6;
        }
        .action-button.message:hover {
          background: #2563eb;
        }
        .action-button.call {
          background: #22c55e;
        }
        .action-button.call:hover {
          background: #16a34a;
        }
        .action-button.whatsapp {
          background: #25D366;
        }
        .action-button.whatsapp:hover {
          background: #1da851;
        }
        .action-button:disabled {
          background: #d1d5db;
          color: #6b7280;
          cursor: not-allowed;
        }
        .action-button.loading {
          opacity: 0.7;
          cursor: wait;
        }
        .spinner {
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          width: 16px;
          height: 16px;
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .tab-button-container {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }
        .long-tab-button {
          flex: 1;
          padding: 12px;
          border-radius: 8px;
          background: #e5e7eb;
          color: #1f2937;
          font-weight: 500;
          transition: all 0.2s;
          border: none;
          cursor: pointer;
        }
        .long-tab-button.active {
          background: #3b82f6;
          color: white;
        }
        .agent-info {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 16px;
        }
        .avatar-img {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          object-fit: cover;
        }
        .agent-name {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
        }
      `}</style>

      <div className="sidebar-container">
        <div className="agent-info">
          <div>
            <div className="agent-name">{normalizedOwner.name}</div>
          </div>
        </div>

        <div className="action-buttons-row">
          <div className="message-call-row">
            {/* Send Message Button */}
            <button
              onClick={handleOpenChat}
              className={`action-button message ${chatLoading ? 'loading' : ''}`}
              disabled={isGuest || !token || chatLoading}
              style={{flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "10px"}}
            >
              {chatLoading ? (
                <>
                  <div className="spinner"></div>
                  Loading...
                </>
              ) : (
                'Message'
              )}
            </button>

            {/* Call & WhatsApp - Hide if Basic Plan */}
            {!isBasicPlan && (
              <>
                <button
                  onClick={() => window.location.href = `tel:${normalizedOwner.phone}`}
                  className="action-button call"
                  disabled={normalizedOwner.phone === "N/A"}
                  style={{flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px"}}
                >
                  <FontAwesomeIcon icon={faPhone} />
                  Call
                </button>

                <button
                  onClick={() => window.open(`https://wa.me/${normalizedOwner.phone}?text=Hello%20there!`, "_blank")}
                  className="action-button whatsapp"
                  disabled={normalizedOwner.whatsapp === "N/A"}
                  style={{flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px"}}
                >
                  <FontAwesomeIcon icon={faWhatsapp} />
                  WhatsApp
                </button>
              </>
            )}
          </div>
        </div>

        <div className="tab-button-container">
          <button
            className={`long-tab-button ${activeTab === 'tour' ? 'active' : ''}`}
            onClick={() => setActiveTab('tour')}
          >
            Schedule a Tour
          </button>
          <button
            className={`long-tab-button ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            My Visits
          </button>
        </div>

        {activeTab === 'tour' && (
          <form onSubmit={handleScheduleVisit} style={{padding: '1rem', background: '#f9fafb', borderRadius: '8px'}}>
            <div style={{marginBottom: '1rem'}}>
              <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: '500'}}>Select Date & Time</label>
              <input
                type="datetime-local"
                value={visitForm.scheduledTime}
                onChange={(e) => setVisitForm({ ...visitForm, scheduledTime: e.target.value })}
                required
                min={minDateTime}
                style={{width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db'}}
                disabled={isGuest || !token}
              />
            </div>
            <div style={{marginBottom: '1rem'}}>
              <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: '500'}}>Additional Notes</label>
              <textarea
                placeholder="Enter your notes"
                value={visitForm.notes}
                onChange={(e) => setVisitForm({ ...visitForm, notes: e.target.value })}
                style={{width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', minHeight: '80px'}}
                disabled={isGuest || !token}
              />
            </div>
            <button
              type="submit"
              style={{width: '100%', padding: '0.75rem', background: '#3b82f6', color: 'white', borderRadius: '6px', border: 'none', fontWeight: '500', cursor: 'pointer'}}
              disabled={isGuest || !token}
            >
              Submit Tour Request
            </button>
            {visitError && <p style={{color: '#ef4444', marginTop: '0.5rem', fontSize: '0.875rem'}}>{visitError}</p>}
          </form>
        )}

        {activeTab === 'info' && (
          <div style={{padding: '1rem', background: '#f9fafb', borderRadius: '8px', textAlign: 'center'}}>
            <p style={{color: '#6b7280'}}>Your scheduled visits will appear here</p>
          </div>
        )}

        {showSuccessDialog && (
          <div className="success-modal-overlay" onClick={() => setShowSuccessDialog(false)}>
            <div className="success-modal" onClick={(e) => e.stopPropagation()}>
              <h2 style={{marginBottom: '1rem', fontSize: '1.5rem', fontWeight: '600'}}>Success!</h2>
              <p style={{color: '#22c55e', marginBottom: '1rem'}}>Your visit has been scheduled successfully!</p>
              <button
                onClick={() => setShowSuccessDialog(false)}
                style={{width: '100%', padding: '0.75rem', background: '#3b82f6', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer'}}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PgHostelSidebar;