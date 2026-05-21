import React, { useMemo, useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPhone, faEnvelope, faMessage, faChevronLeft, faTimes, faGlobe } from '@fortawesome/free-solid-svg-icons';
import { faWhatsapp, faInstagram, faFacebookF, faYoutube, faTwitter, faLinkedinIn } from '@fortawesome/free-brands-svg-icons';
import axios from 'axios';
import { Client } from '@stomp/stompjs';
import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

// API configuration for backend and WebSocket
const API_CONFIG = {
  baseUrl: 'https://api.nearprop.com',
  apiPrefix: 'api',
  wsUrl: 'wss://api.nearprop.com/api/ws',
};

// Fallback owner data
const FALLBACK_OWNER = {
  name: "Michelle Ramirez",
  phone: "+919155105666",
  whatsapp: "+919155105666",
  avatar: "/assets/default-avatar.png",
};

// Default images
const DEFAULT_AVATAR = '/assets/default-avatar.png';
const DEFAULT_AD_IMAGE = '/assets/default-ad.png';

// WebSocket client variables
let stompClient = null;
let currentSubscription = null;

const Sidebar = ({
  propertyId = "",
  propertyTitle = "",
  propertydata,
  owner = FALLBACK_OWNER,
  isGuest = false,
}) => {
  // State management
  const [activeTab, setActiveTab] = useState('tour');
  const [advertisements, setAdvertisements] = useState([]);
  const [adsLoading, setAdsLoading] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState({});
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const filteredRooms = useMemo(() => {
    const query = chatSearchQuery.trim().toLowerCase();
    if (!query) return rooms;
    return rooms.filter((room) => {
      const searchable = [
        room.name,
        room.senderName,
        room.title,
        room.district,
        room.owner?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return searchable.includes(query);
    });
  }, [rooms, chatSearchQuery]);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [visitForm, setVisitForm] = useState({
    propertyId: propertyId || "17",
    scheduledTime: "",
    notes: "",
  });
  const [visits, setVisits] = useState([]);
  const [visitError, setVisitError] = useState(null);
  const [visitSuccess, setVisitSuccess] = useState(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [isFetchingVisits, setIsFetchingVisits] = useState(false);
  const [visitPage, setVisitPage] = useState(0);

  // Authentication data
  const token = isGuest ? null : (localStorage.getItem('authData') ? JSON.parse(localStorage.getItem('authData')).token : null);
  const userId = isGuest ? null : (localStorage.getItem('authData') ? JSON.parse(localStorage.getItem('authData')).userId : null);
  const userRole = isGuest ? null : localStorage.getItem('userRole');
  const userName = isGuest ? 'Guest' : (localStorage.getItem('authData') ? JSON.parse(localStorage.getItem('authData')).name : `User ${userId}`);
  const messagesEndRef = useRef(null);

  const planName = (propertydata?.subscriptionPlanName || "").toString().trim().toLowerCase();
  const isBasicPlan = planName.startsWith("basic");



  // Normalize owner data
  const normalizedOwner = {
    name: owner?.name || FALLBACK_OWNER.name,
    phone: owner?.phone || FALLBACK_OWNER.phone,
    whatsapp: owner?.whatsapp || FALLBACK_OWNER.whatsapp,
    avatar: owner?.avatar && typeof owner.avatar === 'string' && owner.avatar.trim() !== '' ? owner.avatar : DEFAULT_AVATAR,
  };

  // Sanitize district name
  const districtName = (propertydata?.districtName || 'Ujjain').replace(/[^a-zA-Z\s]/g, '');
  console.log('District Name:', districtName);

  // Scroll to bottom of chat messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeRoom]);

  // Fetch advertisements dynamically
  const fetchAdvertisements = async (page = 0, size = 10, sortBy = "createdAt", direction = "DESC") => {
    setAdsLoading(true);
    try {
      const response = await axios.get(
        `${API_CONFIG.baseUrl}/api/v1/advertisements`,
        {
          params: {
            page,
            size,
            sortBy,
            direction,
            targetLocation: districtName,
          },
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );
      console.log('API Ads Response:', response.data);

      let ads = [];
      if (response.data && response.data.content) {
        ads = response.data.content;
      } else if (Array.isArray(response.data)) {
        ads = response.data;
      }

      const filteredAds = ads.filter(ad =>
        ad.targetLocation?.toLowerCase() === districtName.toLowerCase()
      );
      console.log(`Filtered Ads for ${districtName}:`, filteredAds);
      setAdvertisements(filteredAds.length > 0 ? filteredAds : []);
    } catch (err) {
      console.error('Ads fetch error:', err.message);
      setAdvertisements([]);
      setVisitError('Failed to load advertisements. Please try again later.');
    } finally {
      setAdsLoading(false);
    }
  };

  // Fetch chat rooms
  const fetchRooms = async () => {
    if (isGuest) {
      setRooms([]);
      return;
    }
    try {
      setIsLoading(true);
      let endpoint;
      if (userRole === 'DEVELOPER' && propertyId) {
        endpoint = `${API_CONFIG.baseUrl}/${API_CONFIG.apiPrefix}/chat/property/${propertyId}/rooms`;
      } else if (userRole === 'ADMIN') {
        endpoint = `${API_CONFIG.baseUrl}/${API_CONFIG.apiPrefix}/admin/chat/rooms`;
      } else {
        endpoint = `${API_CONFIG.baseUrl}/${API_CONFIG.apiPrefix}/chat/rooms`;
      }
      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const formattedRooms = response.data.map((room) => ({
        id: room.id,
        name: room.seller?.name || room.buyer?.name || room.title || `Room ${room.id}`,
        avatar: room.seller?.avatar || room.buyer?.avatar || normalizedOwner.avatar,
        propertyId: room.property?.id,
        district: room.property?.districtName || 'Unknown',
        thumbnail: room?.property?.thumbnail,
        unreadCount: room.unreadCount || 0,
        title: room.title || 'Chat Room',
        lastMessage: room.lastMessage || null,
        senderName: room.lastMessage?.sender?.name || null,
        owner: {
          name: room.seller?.name || normalizedOwner.name,
          phone: room.seller?.phone || normalizedOwner.phone,
          whatsapp: room.seller?.whatsapp || normalizedOwner.whatsapp,
          avatar: room?.property?.thumbnail || normalizedOwner.avatar,
        },
      }));
      setRooms(formattedRooms);
      const propertyRoom = formattedRooms.find((room) => room.propertyId === parseInt(propertyId));
      if (propertyRoom) {
        setActiveRoom(propertyRoom);
      }
    } catch (err) {
      console.error('Failed to fetch chat rooms:', err.message);
      setVisitError('Please log in to view chat rooms.');
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new chat room
  const createChatRoom = async () => {
    if (isGuest) {
      setVisitError('Please log in to start a chat.');
      return null;
    }
    try {
      const response = await axios.post(
        `${API_CONFIG.baseUrl}/${API_CONFIG.apiPrefix}/chat/rooms`,
        {
          propertyId: parseInt(propertyId),
          title: propertyTitle ? `Chat for ${propertyTitle}` : 'Interested in property',
          initialMessage: "Hello, I'm interested in this property. Can you provide more details?",
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const newRoom = {
        id: response.data.id,
        name: response.data.seller?.name || response.data.buyer?.name || normalizedOwner.name,
        avatar: response.data.seller?.avatar || response.data.buyer?.avatar || normalizedOwner.avatar,
        propertyId: response.data.property?.id,
        district: response.data.property?.districtName || 'Unknown',
        thumbnail: response.data.property?.thumbnail || '/assets/default-property.png',
        unreadCount: response.data.unreadCount || 0,
        title: response.data.title || 'Chat Room',
        lastMessage: response.data.lastMessage || null,
        senderName: response.data.lastMessage?.sender?.name || null,
        owner: {
          name: response.data.seller?.name || normalizedOwner.name,
          phone: response.data.seller?.phone || normalizedOwner.phone,
          whatsapp: response.data.seller?.phone || normalizedOwner.phone,
          avatar: response.data.property?.thumbnail || normalizedOwner.avatar,
        },
      };
      setRooms((prev) => [...prev, newRoom]);
      setActiveRoom(newRoom);
      return newRoom;
    } catch (err) {
      console.error('Error creating chatroom:', err);
      setVisitError('Please log in to create a chat room.');
      return null;
    }
  };

  // Fetch a specific chat room
  const fetchChatRoom = async (roomId) => {
    if (isGuest) {
      setVisitError('Please log in to view chat room details.');
      return null;
    }
    try {
      const response = await axios.get(
        `${API_CONFIG.baseUrl}/${API_CONFIG.apiPrefix}/chat/rooms/${roomId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const room = response.data;
      const formattedRoom = {
        id: room.id,
        name: room.seller?.name || room.buyer?.name || normalizedOwner.name,
        avatar: room.seller?.avatar || room.buyer?.avatar || normalizedOwner.avatar,
        propertyId: room.property?.id,
        district: room.property?.districtName || 'Unknown',
        thumbnail: room.property?.thumbnail || '/assets/default-property.png',
        unreadCount: room.unreadCount || 0,
        title: room.title || 'Chat Room',
        lastMessage: room.lastMessage || null,
        senderName: room.lastMessage?.sender?.name || null,
        owner: {
          name: room.seller?.name || normalizedOwner.name,
          phone: room.seller?.phone || normalizedOwner.phone,
          whatsapp: room.seller?.phone || normalizedOwner.phone,
          avatar: room.property?.thumbnail || normalizedOwner.avatar,
        },
      };
      setRooms((prev) => {
        const existingRoomIndex = prev.findIndex((r) => r.id === room.id);
        if (existingRoomIndex >= 0) {
          const updatedRooms = [...prev];
          updatedRooms[existingRoomIndex] = formattedRoom;
          return updatedRooms;
        }
        return [...prev, formattedRoom];
      });
      setActiveRoom(formattedRoom);
      return formattedRoom;
    } catch (err) {
      console.error('Error fetching chat room:', err);
      setVisitError('Please log in to view chat room details.');
      return null;
    }
  };

  // Fetch messages for a chat room
  const fetchMessages = async (roomId) => {
    if (isGuest) {
      setMessages((prev) => ({ ...prev, [roomId]: [] }));
      return;
    }
    try {
      setIsLoading(true);
      const response = await axios.get(
        `${API_CONFIG.baseUrl}/${API_CONFIG.apiPrefix}/chat/rooms/${roomId}/messages?page=0&size=50&includeReplies=true`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const messagesData = response.data.map((msg) => ({
        ...msg,
        type: msg.mine ? 'outgoing' : 'incoming',
        status: msg.status || 'SENT',
        createdAt: msg.createdAt || new Date().toISOString(),
      }));

      setMessages((prev) => {
        const existingMessages = prev[roomId] || [];
        const uniqueMessages = messagesData.filter(
          (newMsg) => !existingMessages.some((existingMsg) => existingMsg.id === newMsg.id)
        );
        return {
          ...prev,
          [roomId]: [...existingMessages, ...uniqueMessages],
        };
      });

      messagesData.forEach((msg) => {
        if (!msg.mine && msg.status !== 'READ') {
          markMessageAsRead(msg.id, roomId);
        }
      });
    } catch (err) {
      console.error('Failed to fetch messages for room', roomId, ':', err.message);
      setVisitError('Please log in to view messages.');
    } finally {
      setIsLoading(false);
    }
  };

  // Send a message
  const sendMessage = async () => {
    if (isGuest || isSending || !inputText.trim() || !activeRoom) return;
    setIsSending(true);
    try {
      const response = await axios.post(
        `${API_CONFIG.baseUrl}/${API_CONFIG.apiPrefix}/chat/rooms/${activeRoom.id}/messages`,
        {
          content: inputText,
          parentMessageId: null,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const newMessage = response.data;
      console.log('Message posted to REST API, will publish to WebSocket if connected', newMessage);
      // Publish via STOMP so other clients receive it in real-time
      try {
        sendMessageToSocket({
          destination: `/app/chat/${activeRoom.id}/send`,
          body: JSON.stringify({
            content: inputText,
            id: newMessage.id,
            chatRoomId: activeRoom.id,
            sender: { id: userId, name: userName },
            type: 'MESSAGE',
            status: 'SENT',
            createdAt: newMessage.createdAt || new Date().toISOString(),
          }),
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (e) {
        console.error('Failed to publish message over STOMP:', e);
      }
      setMessages((prev) => {
        const existingMessages = prev[activeRoom.id] || [];
        const isDuplicate = existingMessages.some((msg) => msg.id === newMessage.id);
        if (!isDuplicate) {
          return {
            ...prev,
            [activeRoom.id]: [
              ...existingMessages,
              {
                ...newMessage,
                type: 'outgoing',
                status: newMessage.status || 'SENT',
                sender: { id: userId, name: userName || 'Me' },
                createdAt: newMessage.createdAt || new Date().toISOString(),
              },
            ],
          };
        }
        return prev;
      });
      setInputText('');
    } catch (err) {
      console.error('Failed to send message:', err.message);
      setVisitError('Please log in to send a message.');
    } finally {
      setIsSending(false);
    }
  };

  // Mark a message as read
  const markMessageAsRead = async (messageId, roomId) => {
    if (isGuest) return;
    try {
      await axios.patch(
        `${API_CONFIG.baseUrl}/${API_CONFIG.apiPrefix}/chat/messages/${messageId}/status`,
        { status: 'READ' },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      setMessages((prev) => {
        const messages = prev[roomId] || [];
        const updatedMessages = messages.map((msg) =>
          msg.id === messageId ? { ...msg, status: 'READ' } : msg
        );
        return { ...prev, [roomId]: updatedMessages };
      });
      setRooms((prev) => prev.map((room) => (room.id === roomId ? { ...room, unreadCount: 0 } : room)));
      fetchRooms();
    } catch (err) {
      console.error('Failed to mark message as READ:', err.message);
      setVisitError('Please log in to mark messages as read.');
    }
  };

  // Schedule a visit
  const handleScheduleVisit = async (e) => {
    e.preventDefault();
    if (isGuest) {
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
      setVisitSuccess('Visit scheduled successfully!');
      setVisitError(null);
      setVisitForm({ propertyId: visitForm.propertyId, scheduledTime: "", notes: "" });
      fetchVisits();
      setShowSuccessDialog(true);
    } catch (err) {
      console.error('Error scheduling visit:', err);
      setVisitError(err.response?.status === 401 || err.response?.status === 403
        ? 'Please log in to schedule a visit.'
        : 'Failed to schedule visit. Please try again later.');
      setVisitSuccess(null);
    }
  };

  // Fetch scheduled visits
  const fetchVisits = async (page = 0) => {
    if (isGuest) {
      setVisits([]);
      setVisitError('Please log in to view visits.');
      return;
    }
    try {
      setIsFetchingVisits(true);
      const response = await axios.get(
        `${API_CONFIG.baseUrl}/${API_CONFIG.apiPrefix}/visits/my-visits?page=${page}&size=10&sortBy=scheduledTime&direction=ASC`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const visitsData = Array.isArray(response.data.content) ? response.data.content : [];
      setVisits((prev) => (page === 0 ? visitsData : [...prev, ...visitsData]));
      setVisitPage(page);
      setVisitError(null);
    } catch (err) {
      console.error('Error fetching visits:', err);
      setVisitError(err.response?.status === 401 || err.response?.status === 403
        ? 'Please log in to view visits.'
        : 'Failed to fetch visits. Please try again later.');
    } finally {
      setIsFetchingVisits(false);
    }
  };

  // Handle typing events
  const handleTyping = (e) => {
    setInputText(e.target.value);
    if (isGuest || !activeRoom) return;
    sendTypingEvent({
      destination: `/app/chat/${activeRoom.id}/typing`,
      body: JSON.stringify({
        type: 'TYPING',
        roomId: activeRoom.id,
        userId,
        userName: userName || `User ${userId}`,
      }),
      headers: { Authorization: `Bearer ${token}` },
    });
    if (typingTimeout) clearTimeout(typingTimeout);
    setTypingTimeout(
      setTimeout(() => {
        sendTypingEvent({
          destination: `/app/chat/${activeRoom.id}/typing`,
          body: JSON.stringify({
            type: 'STOP_TYPING',
            roomId: activeRoom.id,
            userId,
            userName: userName || `User ${userId}`,
          }),
          headers: { Authorization: `Bearer ${token}` },
        });
      }, 2000)
    );
  };

  // Send message on button click
  const handleSend = () => {
    sendMessage();
  };

  // Send message on Enter key
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isSending) {
      sendMessage();
    }
  };

  // Toggle chat modal
  const toggleChatModal = async () => {
    if (!isChatOpen) {
      if (isGuest) {
        setVisitError('Please log in to start a chat.');
        return;
      }
      try {
        await fetchRooms();
        const propertyRoom = rooms.find((room) => room.propertyId === parseInt(propertyId));
        if (!propertyRoom) {
          const newRoom = await createChatRoom();
          if (newRoom) {
            await fetchChatRoom(newRoom.id);
            setIsChatOpen(true);
          }
        } else {
          setActiveRoom(propertyRoom);
          await fetchChatRoom(propertyRoom.id);
          setIsChatOpen(true);
        }
      } catch (err) {
        console.error('Error in toggleChatModal:', err);
        setVisitError('Failed to open chat. Please try again later.');
      }
    } else {
      setIsChatOpen(false);
    }
  };

  // Format phone numbers for Indian format
  const formatIndianNumber = (number) => {
    if (!number) return 'N/A';
    const clean = number.toString().replace(/\D/g, '');
    if (!clean.startsWith('91') || clean.length < 12) return number;
    const country = '+91';
    const main = clean.slice(2);
    const part1 = main.slice(0, 5);
    const part2 = main.slice(5);
    return `${country} ${part1}-${part2}`;
  };

  // Function to track ad click
  const trackAdClick = async (adId, clickType) => {
    if (!adId) return;
    try {
      await axios.post(
        `${API_CONFIG.baseUrl}/api/v1/advertisements/${adId}/click/${clickType}`,
        {},
        {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );
    } catch (err) {
      console.error('Failed to track ad click:', err);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchAdvertisements();
    if (!isGuest) {
      fetchRooms();
      fetchVisits();
    }
  }, [isGuest, propertyId, districtName]);

  // WebSocket setup
  useEffect(() => {
    if (!isGuest && token && activeRoom) {
      initWebSocket(token, activeRoom.id, setIsConnected, setMessages, setTypingUsers);
      fetchMessages(activeRoom.id);
      localStorage.setItem('lastActiveRoomId', activeRoom.id);
    }
    return () => {
      closeWebSocket();
      setMessages((prev) => {
        const newMessages = { ...prev };
        delete newMessages[activeRoom?.id];
        return newMessages;
      });
    };
  }, [activeRoom, token, isGuest]);

  const ad = advertisements.length > 0 ? advertisements[0] : null;
  const minDateTime = new Date().toISOString().slice(0, 16);

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
        .chat-modal-overlay {
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
          animation: fadeIn 0.3s ease-in-out;
        }
        .chat-modal {
          background: #fff;
          border-radius: 12px;
          width: 90%;
          max-width: 900px;
          height: 80vh;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
          display: flex;
        }
        .success-modal {
          background: #fff;
          border-radius: 12px;
          width: 90%;
          max-width: 400px;
          max-height: 300px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
          display: flex;
          flex-direction: column;
          animation: slideUp 0.3s ease-in-out;
        }
        .success-modal-content {
          padding: 24px;
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 16px;
          flex: 1;
          justify-content: center;
        }
        .success-modal-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: #1f2937;
        }
        .success-modal-message {
          font-size: 1rem;
          color: #22c55e;
        }
        .success-modal-button {
          background: #3b82f6;
          color: white;
          padding: 10px 20px;
          border-radius: 8px;
          border: none;
          font-size: 0.9rem;
          cursor: pointer;
          transition: background 0.2s;
        }
        .success-modal-button:hover {
          background: #2563eb;
        }
        .whatsapp-container {
          display: flex;
          width: 100%;
          height: 100%;
        }
        .chat-sidebar {
          width: 40%;
          border-right: 1px solid #e5e7eb;
          overflow-y: auto;
          overflow-x: hidden;
          background: #f9fafb;
        }
        .chat-window {
          width: 60%;
          display: flex;
          flex-direction: column;
        }
        .chat-header {
          padding: 12px 16px;
          background: linear-gradient(135deg, #1e3a8a, #3b82f6);
          color: white;
          display: flex;
          align-items: center;
          gap: 12px;
          border-bottom: 1px solid #e5e7eb;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .chat-header img {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #fff;
        }
        .chat-header-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .chat-header-name {
          font-size: 1.25rem;
          font-weight: 600;
          line-height: 1.5;
        }
        .chat-header-district {
          font-size: 0.875rem;
          color: #e5e7eb;
        }
        .connection-status {
          font-size: 0.75rem;
          font-weight: 500;
          padding: 4px 8px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.1);
        }
        .connection-status.connected {
          color: #22c55e;
          background: rgba(34, 197, 94, 0.2);
        }
        .connection-status.disconnected {
          color: #ef4444;
          background: rgba(239, 68, 68, 0.2);
        }
        .chat-close {
          padding: 8px;
          border-radius: 50%;
          transition: background 0.2s;
          font-size: 1.25rem;
        }
        .chat-messages {
          flex: 1;
          padding: 16px;
          overflow-y: auto;
          background: #f1f5f9;
        }
        .message {
          margin-bottom: 12px;
          padding: 10px 14px;
          border-radius: 8px;
          max-width: 70%;
          display: flex;
          flex-direction: column;
        }
        .message.outgoing {
          background: #3b82f6;
          color: white;
          margin-left: auto;
        }
        .message.incoming {
          background: #e5e7eb;
          color: #1f2937;
        }
        .message-content {
          margin-bottom: 4px;
        }
        .message-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.85rem;
          color: #6b7280;
        }
        .message-status {
          margin-left: 4px;
        }
        .chat-input {
          padding: 16px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          gap: 8px;
          background: #fff;
        }
        .chat-input input {
          flex: 1;
          padding: 10px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
        }
        .chat-input button {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .chat-input button:hover {
          background: #2563eb;
        }
        .chat-item {
          padding: 12px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .chat-item:hover {
          background: #e5e7eb;
        }
        .chat-item.active {
          background: #dbeafe;
        }
        .avatar-img {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
        }
        .ad-section {
            margin-top: 16px;
            padding: 16px;
            background: #f9fafb;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            position: relative;
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          .ad-tag {
            position: absolute;
            top: 10px;
            right: 10px;
            background: #ccc;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8rem;
            color: #fff;
            font-weight: bold;
            text-transform: uppercase;
          }

          .ad-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
            height: 100%;
          }

          .ad-image-wrapper {
            width: 100%;
            height: auto;
            overflow: hidden;
            border-radius: var(--border-radius);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .ad-image {
            width: 100%;
            height: auto;
            object-fit: contain;
            transition: transform 0.3s ease;
          }

          .ad-image:hover {
            transform: scale(1.02);
          }

          .ad-content {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            height: 100%;
            padding: 8px 0;
            width: 100%;
            text-align: center;
          }

          .ad-title {
            font-size: 1.5rem;
            font-weight: 600;
            color: var(--text-dark);
            margin-bottom: 8px;
            word-break: break-word;
          }

          .ad-description {
            font-size: 0.9rem;
            color: var(--text-grey);
            line-height: 1.6;
            margin: 0;
            flex-grow: 1;
            word-break: break-word;
          }

          .ad-contact-icons {
            display: flex;
            justify-content: center;
            gap: 16px;
            margin-top: 16px;
            flex-wrap: wrap;
          }

          .ad-contact-icons a {
            font-size: 1.5rem;
            transition: color 0.3s ease;
          }

          .ad-contact-icons a.call {
            color: #22c55e;
          }

          .ad-contact-icons a.call:hover {
            color: #16a34a;
          }

          .ad-contact-icons a.mail {
            color: #3b82f6;
          }

          .ad-contact-icons a.mail:hover {
            color: #2563eb;
          }

          .ad-contact-icons a.whatsapp {
            color: #25D366;
          }

          .ad-contact-icons a.whatsapp:hover {
            color: #1da851;
          }

          .ad-contact-icons a.instagram {
            color: #E4405F;
          }

          .ad-contact-icons a.instagram:hover {
            color: #C13584;
          }

          .ad-contact-icons a.facebook {
            color: #1877F2;
          }

          .ad-contact-icons a.facebook:hover {
            color: #0C63D4;
          }

          .ad-contact-icons a.twitter {
            color: #1DA1F2;
          }

          .ad-contact-icons a.twitter:hover {
            color: #0C85D0;
          }

          .ad-contact-icons a.linkedin {
            color: #0A66C2;
          }

          .ad-contact-icons a.linkedin:hover {
            color: #004182;
          }

          .ad-contact-icons a.youtube {
            color: #FF0000;
          }

          .ad-contact-icons a.youtube:hover {
            color: #CC0000;
          }

          .ad-contact-icons a.website {
            color: #6B7280;
          }

          .ad-contact-icons a.website:hover {
            color: #4B5563;
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
        }
        .action-button.message {
          background: #3b82f6;
          padding: 30px;
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
        }
        .long-tab-button.active {
          background: #3b82f6;
          color: white;
        }
        .long-tab-button:hover {
          background: #d1d5db;
        }
        .long-tab-button.active:hover {
          background: #2563eb;
        }
        .requestinfo-submit-btn {
          width: 100%;
          padding: 12px;
          background: #3b82f6;
          color: white;
          border-radius: 8px;
          font-weight: 500;
          transition: background 0.2s;
        }
        .requestinfo-submit-btn:hover {
          background: #2563eb;
        }
        .agent-name {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @media (max-width: 768px) {
          .sidebar-container {
            max-width: 100%;
            padding: 12px;
          }
          .chat-modal {
            width: 100%;
            height: 100vh;
            border-radius: 0;
          }
          .success-modal {
            width: 100%;
            max-width: 90%;
            max-height: 50vh;
            border-radius: 8px;
          }
          .success-modal-content {
            padding: 16px;
          }
          .success-modal-title {
            font-size: 1.25rem;
          }
          .success-modal-message {
            font-size: 0.9rem;
          }
          .success-modal-button {
            padding: 8px 16px;
            font-size: 0.85rem;
          }
          .chat-sidebar {
            width: 100%;
          }
          .chat-window {
            width: 100%;
          }
          .chat-sidebar.mobile-hidden {
            display: none;
          }
          .chat-window.mobile-hidden {
            display: none;
          }
          .action-buttons-row {
            gap: 6px;
          }
          .action-button {
            padding: 10px;
            font-size: 0.85rem;
          }
          .tab-button-container {
            flex-direction: column;
            gap: 8px;
          }
          .long-tab-button {
            padding: 10px;
            font-size: 0.9rem;
          }
          .requestinfo-form-group input,
          .requestinfo-form-group textarea {
            font-size: 0.9rem;
            padding: 8px;
            width: 100%;
          }
          .requestinfo-terms {
            font-size: 0.8rem;
          }
          .requestinfo-submit-btn {
            padding: 10px;
            font-size: 0.9rem;
          }
          .ad-section {
            gap: 8px;
          }
          .ad-title {
            font-size: 1.1rem;
          }
          .ad-image-container {
            max-width: 100%;
            aspect-ratio: 1 / 1;
          }
          .ad-description {
            font-size: 0.85rem;
          }
          .ad-contact-icon {
            font-size: 1.2rem !important;
            padding: 6px;
            width: 36px !important;
            height: 36px !important;
          }
          .ad-tag {
            font-size: 0.7rem;
            padding: 3px 6px;
          }
        }
        @media (max-width: 480px) {
          .sidebar-container {
            padding: 8px;
            align-items: flex-start;
          }
          .success-modal {
            width: 100%;
            max-width: 95%;
            max-height: 40vh;
            border-radius: 6px;
          }
          .success-modal-content {
            padding: 12px;
            gap: 12px;
          }
          .success-modal-title {
            font-size: 1.1rem;
          }
          .success-modal-message {
            font-size: 0.85rem;
          }
          .success-modal-button {
            padding: 6px 12px;
            font-size: 0.8rem;
          }
          .agent-info {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
          .agent-name {
            font-size: 1.2rem;
            font-weight: 700;
          }
          .avatar-img {
            width: 32px;
            height: 32px;
          }
          .action-button {
            padding: 8px;
            font-size: 0.8rem;
          }
          .requestinfo-form-group input,
          .requestinfo-form-group textarea {
            font-size: 0.85rem;
            padding: 6px;
            width: 100%;
          }
          .requestinfo-submit-btn {
            padding: 8px;
            font-size: 0.85rem;
          }
          .ad-section {
            gap: 6px;
          }
          .ad-title {
            font-size: 1rem;
          }
          .ad-image-container {
            aspect-ratio: 1 / 1;
          }
          .ad-description {
            font-size: 0.8rem;
          }
          .ad-contact-icon {
            font-size: 1rem !important;
            padding: 5px;
            width: 32px !important;
            height: 32px !important;
          }
          .ad-tag {
            font-size: 0.65rem;
            padding: 2px 4px;
          }
        }
      `}</style>
      <div className="sidebar-container">
        <div className="requestinfo-right-section">
          <div className="agent-info flex items-center gap-4 mb-4">
            <img
              src={normalizedOwner.avatar}
              alt={normalizedOwner.name}
              title={normalizedOwner.name}
              className="avatar-img"
              onError={(e) => { e.target.src = DEFAULT_AVATAR; }}
            />
            <div>
              <div className="agent-name">{normalizedOwner.name}</div>
            </div>
          </div>
          <div className="requestinfo-tour-type mb-4">
            <div className="action-buttons-row">
              <div className="message-call-row" style={{ display: "flex", gap: "10px", width: "100%" }}>

                {/* Send Button */}
                <button
                  onClick={toggleChatModal}
                  style={{ justifyContent: "center", flex: 1, display: "flex", alignItems: "center", gap: "6px" }}
                // disabled={isGuest}

                >
                  <FontAwesomeIcon icon={faMessage} />
                  Send Message
                </button>

                {/* Call + WhatsApp only if NOT Basic Plan */}
                {!isBasicPlan && (
                  <>

                    {/* Call Button */}
                    <button
                      onClick={() => window.location.href = `tel:${normalizedOwner.phone}`}
                      className="action-button call"
                      disabled={normalizedOwner.phone === "N/A"}
                      style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                      }}
                    >
                      <FontAwesomeIcon icon={faPhone} />
                      Call
                    </button>

                    {/* WhatsApp Button */}
                    <button
                      onClick={() =>
                        window.open(
                          `https://wa.me/${normalizedOwner.phone}?text=Hello%20there!`,
                          "_blank"
                        )
                      }
                      className="action-button whatsapp"
                      disabled={normalizedOwner.whatsapp === "N/A"}
                      style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                      }}
                    >
                      <FontAwesomeIcon icon={faWhatsapp} />
                      WhatsApp
                    </button>

                  </>
                )}
              </div>


            </div>
          </div>
          <div className="tab-button-container">
            <button
              className={`long-tab-button ${activeTab === 'tour' ? 'active' : ''}`}
              onClick={() => setActiveTab('tour')}
              aria-label="Schedule a tour"
            >
              Schedule a Tour
            </button>
            <button
              className={`long-tab-button ${activeTab === 'info' ? 'active' : ''}`}
              onClick={() => setActiveTab('info')}
              aria-label="View my visits"
            >
              My Visits
            </button>
          </div>
          {activeTab === 'tour' && (
            <form
              onSubmit={handleScheduleVisit}
              className="space-y-4 w-full max-w-md mx-auto p-4 bg-white shadow rounded-lg"
            >
              <div className="w-full max-w-xl">
                <label htmlFor="scheduledTime" className="block text-sm font-medium text-gray-700 mb-2">Select Date & Time</label>
                <input
                  type="datetime-local"
                  id="scheduledTime"
                  value={visitForm.scheduledTime}
                  onChange={(e) => setVisitForm({ ...visitForm, scheduledTime: e.target.value })}
                  required
                  min={minDateTime}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                  disabled={isGuest}
                  aria-label="Select date and time for visit"
                />
              </div>
              <div className="w-full max-w-xl">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">Additional Notes</label>
                <textarea
                  id="notes"
                  placeholder="Enter your notes (e.g., preferred time or additional requests)"
                  value={visitForm.notes}
                  onChange={(e) => setVisitForm({ ...visitForm, notes: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500 h-24 resize-none"
                  disabled={isGuest}
                  aria-label="Additional notes for visit"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="gdpr"
                  name="gdprConsent"
                  required
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  disabled={isGuest}
                  aria-label=" Agree to terms of use"
                />
                <label htmlFor="gdpr" className="ml-2 text-sm text-gray-600">
                  By submitting this form I agree to{" "}
                  <a href="#" className="text-blue-600">Terms of Use</a>
                </label>
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                disabled={isGuest}
                aria-label="Submit tour request"
              >
                Submit a Tour Request
              </button>
              {visitError && <p className="text-red-500 mt-2">{visitError}</p>}
            </form>
          )}
          {activeTab === 'info' && (
            <div className="requestinfo-info-section">
              <button
                className="requestinfo-submit-btn"
                onClick={() => fetchVisits(0)}
                disabled={isFetchingVisits || isGuest}
                aria-label="Refresh scheduled visits"
              >
                {isFetchingVisits ? 'Loading...' : 'Refresh My Scheduled Visits'}
              </button>
              {isFetchingVisits && <div className="loading p-4 text-center">Loading visits...</div>}
              {isGuest ? (
                <p className="mt-2 text-gray-500">Please log in to view scheduled visits.</p>
              ) : visits.length > 0 ? (
                <div className="mt-4">
                  <h5 className="font-semibold text-lg">Scheduled Visits</h5>
                  {visits.map((visit) => (
                    <div key={visit.id} className="border p-3 mb-2 rounded">
                      <p><strong>Property:</strong> {visit.property?.title || 'Unknown'}</p>
                      <p><strong>Scheduled Time:</strong> {visit.scheduledTime ? format(new Date(visit.scheduledTime), 'PPp') : 'N/A'}</p>
                      <p><strong>Status:</strong> {visit.status || 'Unknown'}</p>
                      <p><strong>Notes:</strong> {visit.notes || 'None'}</p>
                    </div>
                  ))}
                  <button
                    className="requestinfo-submit-btn mt-4"
                    onClick={() => fetchVisits(visitPage + 1)}
                    disabled={isFetchingVisits || isGuest}
                    aria-label="Load more visits"
                  >
                    Load More
                  </button>
                </div>
              ) : (
                <p className="mt-2 text-gray-500">No scheduled visits found.</p>
              )}
            </div>
          )}
          {isChatOpen && (
            <div className="chat-modal-overlay" onClick={toggleChatModal}>
              <div className="chat-modal" onClick={(e) => e.stopPropagation()}>
                <div className="whatsapp-container">
                  {isLoading && <div className="loading p-4 text-center">Loading...</div>}
                  <div
                    className={`chat-sidebar ${activeRoom && window.innerWidth <= 768 ? 'mobile-hidden' : ''}`}
                  >
                    <div className="search-bar p-4">
                      <input
                        type="text"
                        value={chatSearchQuery}
                        onChange={(e) => setChatSearchQuery(e.target.value)}
                        placeholder="Search or start a new chat"
                        className="w-full p-2 border rounded-lg"
                        disabled={isGuest}
                        aria-label="Search chats"
                      />
                    </div>
                    <div className="chat-list">
                      {filteredRooms.length > 0 ? filteredRooms.map((chat) => (
                        <div
                          className={`chat-item flex gap-3 p-4 ${activeRoom?.id === chat.id ? 'active' : ''}`}
                          key={chat.id}
                          onClick={() => {
                            setActiveRoom(chat);
                            fetchChatRoom(chat.id);
                          }}
                          role="button"
                          tabIndex={0}
                          aria-label={`Select chat with ${chat.owner.name}`}
                        >
                          <div className="chat-avatar">
                            <img
                              src={chat?.thumbnail || chat?.owner?.avatar || DEFAULT_AVATAR}
                              alt={chat.owner.name}
                              title={`Property in ${chat.district}`}
                              className="avatar-img"
                              onError={(e) => { e.target.src = DEFAULT_AVATAR; }}
                            />
                          </div>
                          <div className="chat-info flex-1">
                            <div className="chat-name font-semibold">{chat.senderName || chat.owner.name}</div>
                            {chat.district && chat.district !== 'Unknown' && (
                              <div className="district-name text-sm text-gray-500">{chat.district}</div>
                            )}
                            <div className="chat-msg text-sm text-gray-600 truncate">
                              {(messages[chat.id] || []).slice(-1)[0]?.content || chat.lastMessage?.content || 'No messages yet'}
                            </div>
                            {chat.unreadCount > 0 && (
                              <span className="unread-count bg-blue-500 text-white text-xs rounded-full px-2 py-1">{chat.unreadCount}</span>
                            )}
                          </div>
                        </div>
                      )) : (
                        <div className="p-4 text-center text-gray-500">
                          {isGuest
                            ? 'Please log in to view chat rooms.'
                            : chatSearchQuery.trim()
                              ? 'No chats match your search.'
                              : 'No chat rooms available.'}
                        </div>
                      )}
                    </div>
                  </div>
                  <div
                    className={`chat-window ${!activeRoom && window.innerWidth <= 768 ? 'mobile-hidden' : ''}`}
                  >
                    {activeRoom ? (
                      <>
                        <div className="chat-header">
                          {window.innerWidth <= 768 && (
                            <button className="back-arrow text-white p-2" onClick={() => setActiveRoom(null)} aria-label="Back to chat list">
                              <FontAwesomeIcon icon={faChevronLeft} />
                            </button>
                          )}
                          <img
                            src={activeRoom?.owner?.avatar || activeRoom?.thumbnail || DEFAULT_AVATAR}
                            alt={activeRoom?.owner?.name || 'Unknown'}
                            title={activeRoom?.owner?.name || 'Unknown'}
                            className="avatar-img"
                            onError={(e) => { e.target.src = DEFAULT_AVATAR; }}
                          />
                          <div className="chat-header-info">
                            <span className="chat-header-name">{activeRoom?.senderName || activeRoom?.owner?.name}</span>
                            {/* <span className="chat-header-district">{activeRoom?.district }</span> */}
                          </div>
                          {/* <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
                            {isConnected ? '🟢 Online' : '🔴 Offline'}
                          </span> */}
                          <button className="chat-close" onClick={toggleChatModal} aria-label="Close chat">
                            <FontAwesomeIcon icon={faTimes} />
                          </button>
                        </div>
                        <div className="chat-messages">
                          {(messages[activeRoom.id] || []).map((msg, idx) => (
                            <div
                              key={msg.id || idx}
                              className={`message ${msg.type} ${msg.status === 'READ' ? 'read' : ''}`}
                              onClick={() => !msg.mine && msg.status !== 'READ' && markMessageAsRead(msg.id, activeRoom.id)}
                              role="button"
                              tabIndex={0}
                              aria-label={`Message: ${msg.content}`}
                            >
                              <div className="message-content">{msg.content}</div>
                              <div className="message-meta">
                                <span className="timestamp">
                                  {formatInTimeZone(msg.createdAt, 'Asia/Kolkata', 'h:mm a')}
                                </span>
                                {msg.type === 'outgoing' && (
                                  <span className={`message-status ${msg.status.toLowerCase()}`}>
                                    {msg.status === 'READ' ? '✓✓' : '✓'}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                          <div ref={messagesEndRef} />
                          {typingUsers[activeRoom.id]?.length > 0 && (
                            <div className="typing-indicator text-sm text-gray-500 p-2">
                              {typingUsers[activeRoom.id].map((user) => user.userName).join(', ')} is typing...
                            </div>
                          )}
                        </div>
                        <div className="chat-input">
                          <input
                            type="text"
                            placeholder="Type a message"
                            value={inputText}
                            onChange={handleTyping}
                            onKeyDown={handleKeyPress}
                            disabled={!isConnected || !activeRoom || isGuest}
                            className="flex-1"
                            aria-label="Type a message"
                          />
                          <button
                            onClick={handleSend}
                            disabled={!isConnected || !activeRoom || isGuest}
                            className="chat-input button"
                            aria-label="Send message"
                          >
                            <FontAwesomeIcon icon={faMessage} className="me-1" /> Send
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="chat-placeholder p-4 text-center text-gray-500">
                        Select a chat room or start a new one
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          {showSuccessDialog && (
            <div className="chat-modal-overlay" onClick={() => setShowSuccessDialog(false)}>
              <div className="success-modal" onClick={(e) => e.stopPropagation()}>
                <div className="success-modal-content">
                  <h2 className="success-modal-title">Success!</h2>
                  <p className="success-modal-message">Your visit has been scheduled successfully!</p>
                  <button
                    onClick={() => setShowSuccessDialog(false)}
                    className="success-modal-button"
                    aria-label="Close success dialog"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
          <div className="ad-section">
            <span className="ad-tag">ADS</span>
            {adsLoading ? (
              <p className="text-center">Loading advertisement...</p>
            ) : ad ? (
              <div className="ad-container">
                <div className="ad-image-wrapper">
                  <img
                    src={ad.bannerImageUrl || DEFAULT_AD_IMAGE}
                    alt={ad.title || 'Advertisement'}
                    className="ad-image"
                    onError={(e) => { e.target.src = DEFAULT_AD_IMAGE; }}
                  />
                </div>
                <div className="ad-content">
                  <h5 className="ad-title">{ad.title || 'Untitled Advertisement'}</h5>
                  <p className="ad-description">{ad.description || 'No description available.'}</p>
                  <div className="ad-contact-icons">

                    {/* HIDE Call + WhatsApp IF BASIC PLAN */}
                    {!isBasicPlan && ad.phoneNumber && ad.phoneNumber.trim() !== '' && ad.phoneNumber !== 'N/A' && (
                      <a
                        href={`tel:${ad.phoneNumber}`}
                        className="call"
                        aria-label="Call advertisement contact"
                        onClick={() => trackAdClick(ad.id, 'phone')}
                      >
                        <FontAwesomeIcon icon={faPhone} />
                      </a>
                    )}

                    {!isBasicPlan && ad.phoneNumber && ad.phoneNumber.trim() !== '' && ad.phoneNumber !== 'N/A' && (
                      <a
                        href={`https://wa.me/${ad.phoneNumber}`}
                        className="whatsapp"
                        target="_blank"
                        aria-label="WhatsApp advertisement contact"
                        onClick={() => trackAdClick(ad.id, 'whatsapp')}
                      >
                        <FontAwesomeIcon icon={faWhatsapp} />
                      </a>
                    )}

                    {/* Email always allowed */}
                    {ad.emailAddress && ad.emailAddress.trim() !== '' && ad.emailAddress !== 'N/A' && (
                      <a
                        href={`mailto:${ad.emailAddress}?subject=Inquiry about ${ad.title || 'Advertisement'}`}
                        className="mail"
                        onClick={() => trackAdClick(ad.id, 'email')} // assuming email click type is 'email' or fallback
                      >
                        <FontAwesomeIcon icon={faEnvelope} />
                      </a>
                    )}

                    {/* Social links always allowed */}
                    {ad.instagramUrl && ad.instagramUrl.trim() !== '' && (
                      <a href={ad.instagramUrl} className="instagram" target="_blank" onClick={() => trackAdClick(ad.id, 'instagram')}>
                        <FontAwesomeIcon icon={faInstagram} />
                      </a>
                    )}

                    {ad.facebookUrl && ad.facebookUrl.trim() !== '' && (
                      <a href={ad.facebookUrl} className="facebook" target="_blank" onClick={() => trackAdClick(ad.id, 'facebook')}>
                        <FontAwesomeIcon icon={faFacebookF} />
                      </a>
                    )}

                    {ad.twitterUrl && ad.twitterUrl.trim() !== '' && (
                      <a href={ad.twitterUrl} className="twitter" target="_blank" onClick={() => trackAdClick(ad.id, 'twitter')}>
                        <FontAwesomeIcon icon={faTwitter} />
                      </a>
                    )}

                    {ad.linkedinUrl && ad.linkedinUrl.trim() !== '' && (
                      <a href={ad.linkedinUrl} className="linkedin" target="_blank" onClick={() => trackAdClick(ad.id, 'linkedin')}>
                        <FontAwesomeIcon icon={faLinkedinIn} />
                      </a>
                    )}

                    {ad.youtubeUrl && ad.youtubeUrl.trim() !== '' && (
                      <a href={ad.youtubeUrl} className="youtube" target="_blank" onClick={() => trackAdClick(ad.id, 'youtube')}>
                        <FontAwesomeIcon icon={faYoutube} />
                      </a>
                    )}

                    {ad.websiteUrl && ad.websiteUrl.trim() !== '' && (
                      <a href={ad.websiteUrl} className="website" target="_blank" onClick={() => trackAdClick(ad.id, 'website')}>
                        <FontAwesomeIcon icon={faGlobe} />
                      </a>
                    )}
                  </div>

                </div>
              </div>
            ) : (
              <div className="ad-container">
                <div className="ad-image-wrapper">
                  <img
                    src="/src/assets/staticad.png"
                    alt="Real Estate Opportunities"
                    className="ad-image"
                    onError={(e) => { e.target.src = DEFAULT_AD_IMAGE; }}
                  />
                </div>
                <div className="ad-content">
                  <h5 className="ad-title">Real Estate Opportunities</h5>
                  <p className="ad-description">Looking for exclusive property deals? Contact us for the best real estate investments.</p>
                  <div className="ad-contact-icons">
                    <a
                      href="tel:+919155105666"
                      className="call"
                      aria-label="Call advertisement contact"
                    >
                      <FontAwesomeIcon icon={faPhone} />
                    </a>
                    <a
                      href="https://wa.me/919155105666"
                      className="whatsapp"
                      target="_blank"
                      aria-label="WhatsApp advertisement contact"
                    >
                      <FontAwesomeIcon icon={faWhatsapp} />
                    </a>
                    <a
                      href="mailto:mail.nearprop@gmail.com?subject=Inquiry about Real Estate Opportunities"
                      className="mail"
                    >
                      <FontAwesomeIcon icon={faEnvelope} />
                    </a>
                    <a href="https://nearprop.com" className="website" target="_blank">
                      <FontAwesomeIcon icon={faGlobe} />
                    </a>
                    <a href="https://instagram.com/nearprop" className="instagram" target="_blank">
                      <FontAwesomeIcon icon={faInstagram} />
                    </a>
                    <a href="https://facebook.com/nearprop" className="facebook" target="_blank">
                      <FontAwesomeIcon icon={faFacebookF} />
                    </a>
                    <a href="https://youtube.com/nearprop" className="youtube" target="_blank">
                      <FontAwesomeIcon icon={faYoutube} />
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Subscribe to WebSocket room
const subscribeToRoom = (roomId, setMessages, setTypingUsers, setIsConnected) => {
  if (!stompClient || !stompClient.connected || !roomId) {
    console.warn('Cannot subscribe: WebSocket not connected or roomId missing', { roomId });
    return;
  }
  if (currentSubscription) {
    currentSubscription.unsubscribe();
    console.log(`Unsubscribed from previous room topic`);
  }
  currentSubscription = stompClient.subscribe(`/topic/chat/${roomId}`, (msg) => {
    try {
      const data = JSON.parse(msg.body);
      const messageRoomId = data.chatRoomId || data.roomId || roomId;
      if (data.type === 'MESSAGE') {
        setMessages((prev) => {
          const existingMessages = prev[messageRoomId] || [];
          const isDuplicate = existingMessages.some((msg) => msg.id === data.id);
          if (!isDuplicate) {
            return {
              ...prev,
              [messageRoomId]: [
                ...existingMessages,
                {
                  ...data,
                  type: data.mine ? 'outgoing' : 'incoming',
                  status: data.status || 'SENT',
                  createdAt: data.createdAt || new Date().toISOString(),
                },
              ],
            };
          }
          return prev;
        });
        if (!data.mine) {
          const messageSound = new Audio('/message-notification.mp3');
          messageSound.play().catch((err) => console.error('Sound play error:', err));
        }
      } else if (data.type === 'TYPING' || data.type === 'STOP_TYPING') {
        setTypingUsers((prev) => {
          const users = prev[messageRoomId] || [];
          if (data.type === 'TYPING') {
            if (!users.some((user) => user.userId === data.userId)) {
              return { ...prev, [messageRoomId]: [...users, { userId: data.userId, userName: data.userName || `User ${data.userId}` }] };
            }
          } else {
            return { ...prev, [messageRoomId]: users.filter((user) => user.userId !== data.userId) };
          }
          return prev;
        });
      } else if (data.type === 'STATUS_UPDATE') {
        setMessages((prev) => {
          const messages = prev[messageRoomId] || [];
          const updatedMessages = messages.map((msg) =>
            msg.id === data.messageId ? { ...msg, status: data.status } : msg
          );
          return { ...prev, [messageRoomId]: updatedMessages };
        });
        if (data.status === 'READ') {
          setRooms((prev) => prev.map((room) => (room.id === messageRoomId ? { ...room, unreadCount: 0 } : room)));
        }
      }
    } catch (error) {
      console.error('❌ WebSocket parse error:', error);
    }
  });
  console.log(`Subscribed to /topic/chat/${roomId}`);
};

// Initialize WebSocket
const initWebSocket = (token, roomId, setIsConnected, setMessages, setTypingUsers) => {
  if (stompClient && stompClient.connected) {
    console.log('WebSocket already connected');
    if (roomId) {
      subscribeToRoom(roomId, setMessages, setTypingUsers, setIsConnected);
    }
    return;
  }
  stompClient = new Client({
    brokerURL: `${API_CONFIG.wsUrl}?token=${token}`,
    connectHeaders: { Authorization: `Bearer ${token}` },
    reconnectDelay: 5000,
    onConnect: () => {
      console.log('✅ WebSocket connected');
      try { window.__stompClient = stompClient; } catch(e) {}
      setIsConnected(true);
      if (roomId) {
        subscribeToRoom(roomId, setMessages, setTypingUsers, setIsConnected);
      }
    },
    onStompError: (frame) => {
      console.error('STOMP error:', frame.headers['message']);
    },
    onWebSocketError: (evt) => {
      console.error('WebSocket error:', evt);
    },
    onDisconnect: () => {
      console.warn('🔌 WebSocket disconnected');
      setIsConnected(false);
      currentSubscription = null;
    },
  });
  stompClient.activate();
};

// Send WebSocket message
const sendMessageToSocket = ({ destination, body, headers }) => {
  if (stompClient && stompClient.connected) {
    console.log('Sending message:', { destination, body });
    stompClient.publish({ destination, body, headers });
  } else if (stompClient && !stompClient.connected) {
    console.warn('⚠️ WebSocket not connected — attempting to reconnect and retry');
    try {
      stompClient.activate();
    } catch (e) {}
    setTimeout(() => {
      if (stompClient && stompClient.connected) {
        console.log('Retrying send after reconnect:', { destination, body });
        stompClient.publish({ destination, body, headers });
      } else {
        console.error('Failed to send: WebSocket still not connected');
      }
    }, 700);
  } else {
    console.warn('⚠️ No WebSocket client available');
  }
};

// Send typing event
const sendTypingEvent = ({ destination, body, headers }) => {
  if (stompClient && stompClient.connected) {
    console.log('Sending typing event:', { destination, body });
    stompClient.publish({ destination, body, headers });
  } else if (stompClient && !stompClient.connected) {
    console.warn('⚠️ WebSocket not connected — attempting to reconnect (typing event)');
    try {
      stompClient.activate();
    } catch (e) {}
    setTimeout(() => {
      if (stompClient && stompClient.connected) {
        stompClient.publish({ destination, body, headers });
      }
    }, 700);
  }
};

// Close WebSocket
const closeWebSocket = () => {
  if (stompClient) {
    if (currentSubscription) {
      currentSubscription.unsubscribe();
      currentSubscription = null;
    }
    stompClient.deactivate();
    try { window.__stompClient = null; } catch(e) {}
    stompClient = null;
    console.log('WebSocket closed');
  }
};

export default Sidebar;