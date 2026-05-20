import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComments, faTimes } from '@fortawesome/free-solid-svg-icons';
import './FloatingChat.css';

const FloatingChat = ({ isGuest, isBasicPlan, onOpenChat }) => {
  const [isMinimized, setIsMinimized] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const navigate = useNavigate();

  const handleChatClick = () => {
    const authData = localStorage.getItem('authData');
    
    if (!authData) {
      // Show toast instead of alert
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        navigate('/login');
      }, 3000); // Toast 3 seconds dikhega, phir login page par redirect
    } else {
      // If logged in, navigate to chat page
      navigate('/chat');
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <div className="floating-chat-button" onClick={handleChatClick}>
        <FontAwesomeIcon icon={faComments} className="chat-icon" />
        <span className="chat-badge">💬</span>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div className="chat-toast">
          <div className="chat-toast-content">
            <p>Please login to use chat feature</p>
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingChat;