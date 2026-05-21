import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPhone, faEnvelope, faMessage, faPhoneVolume, faChevronLeft } from "@fortawesome/free-solid-svg-icons";
import { faWhatsapp, faFacebookF, faInstagram, faYoutube } from "@fortawesome/free-brands-svg-icons";
import axios from 'axios';
import { Client } from '@stomp/stompjs';
import { FaWhatsapp } from 'react-icons/fa';

const API_CONFIG = {
  baseUrl: 'https://api.nearprop.com',
  apiPrefix: 'api',
  wsUrl: 'wss://api.nearprop.com/api/ws',
};

const FALLBACK_AD = [
  {
    id: 2,
    title: "Luxury Villas in Bangalore",
    description: "Exclusive gated community villas with private pools and smart home features",
    bannerImageUrl: "https://my-nearprop-bucket.s3.ap-south-1.amazonaws.com/advertisements/media/advertisements/admin/11_sachin-administrator/luxury-villas-in-bangalore/images/luxury-villas-in-bangalore-61ac950a-d959-4d44-a313-43c748b5b012.png",
    videoUrl: "https://my-nearprop-bucket.s3.ap-south-1.amazonaws.com/advertisements/media/advertisements/admin/11_sachin-administrator/luxury-villas-in-bangalore/videos/luxury-villas-in-bangalore-4e011d5e-6f39-4cc6-83da-8f0fb85b4a7f.mp4",
    websiteUrl: "https://tickvia.com/",
    whatsappNumber: "+917024520740",
    phoneNumber: "+917024510740",
    emailAddress: "sandeep.acoreithub@gmail.com",
    instagramUrl: "https://www.instagram.com/saim_7024?igsh=MXF6M2w5aXJ5Y3F4Zw==",
    facebookUrl: "https://www.facebook.com/profile.php?id=100085421884918",
    youtubeUrl: "https://youtu.be/upU0OcE658E?si=yZs8jnCXx5Qm8jpD",
    additionalInfo: "Book a visit today and get a complimentary interior design consultation!",
    targetLocation: "Indore",
    validUntil: "2025-08-01T13:20:23.487501",
    createdBy: { name: "Sachin Administrator" },
  },
];

let stompClient = null;
let currentSubscription = null;

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
      console.log('WebSocket message received:', data);
      const messageRoomId = data.chatRoomId || data.roomId || roomId;
      if (data.type === 'MESSAGE') {
        setMessages((prev) => ({
          ...prev,
          [messageRoomId]: [
            ...(prev[messageRoomId] || []),
            {
              ...data,
              type: data.mine ? 'outgoing' : 'incoming',
              status: data.status || 'SENT',
              createdAt: data.createdAt || new Date().toISOString(),
            },
          ],
        }));
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

const initWebSocket = (token, roomId, setIsConnected, setMessages, setTypingUsers) => {
  if (stompClient && stompClient.connected) {
    if (roomId) {
      subscribeToRoom(roomId, setMessages, setTypingUsers, setIsConnected);
    }
    return;
  }

  stompClient = new Client({
    brokerURL: `${API_CONFIG.wsUrl}?token=${token}`,
    connectHeaders: { Authorization: `Bearer ${token}` },
    debug: (str) => console.debug('[STOMP]', str),
    reconnectDelay: 5000,
    onConnect: () => {
      console.log('✅ WebSocket connected');
      try { window.__stompClient = stompClient; } catch(e) {}
      setIsConnected(true);
      if (roomId) {
        subscribeToRoom(roomId, setMessages, setTypingUsers, setIsConnected);
      }
    },
    onStompError: (frame) => console.error('STOMP error:', frame.headers['message']),
    onWebSocketError: (evt) => console.error('WebSocket error:', evt),
    onWebSocketClose: (evt) => console.warn('WebSocket closed event:', evt),
    onDisconnect: () => {
      console.warn('🔌 WebSocket disconnected');
      setIsConnected(false);
      currentSubscription = null;
    },
  });

  stompClient.activate();
};

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

const PgSidebar = ({ propertyId = "17", propertyTitle = "Property", owner = { name: "Michelle Ramirez", phone: "+919155105666", whatsapp: "+919155105666", avatar: "https://media.istockphoto.com/id/1399565382/photo/young-happy-mixed-race-businessman-standing-with-his-arms-crossed-working-alone-in-an-office.jpg" } }) => {
  const [advertisements, setAdvertisements] = useState([]);
  const [adsLoading, setAdsLoading] = useState(true);
  const [adsError, setAdsError] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState({});
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [showContact, setShowContact] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const token = localStorage.getItem('authData') ? JSON.parse(localStorage.getItem('authData')).token : null;
  const userId = localStorage.getItem('authData') ? JSON.parse(localStorage.getItem('authData')).userId : null;
  const userRole = localStorage.getItem('userRole');
  const userName = localStorage.getItem('authData') ? JSON.parse(localStorage.getItem('authData')).name : `User ${userId}`;
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeRoom]);

  const fetchRooms = async () => {
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
        avatar: room.seller?.avatar || room.buyer?.avatar || owner?.avatar || '/assets/default-avatar.png',
        propertyId: room.property?.id,
        district: room.property?.district || 'Unknown',
        thumbnail: room.property?.thumbnail || '/assets/default-property.png',
        unreadCount: room.unreadCount || 0,
        title: room.title || 'Chat Room',
        lastMessage: room.lastMessage || null,
        owner: {
          name: room.seller?.name || owner?.name || 'Unknown',
          phone: room.seller?.phone || owner?.phone || 'N/A',
          whatsapp: room.seller?.whatsapp || owner?.whatsapp || 'N/A',
          avatar: room.seller?.avatar || owner?.avatar || '/assets/default-avatar.png',
        },
      }));
      setRooms(formattedRooms);

      const propertyRoom = formattedRooms.find((room) => room.propertyId === parseInt(propertyId));
      if (propertyRoom) {
        setActiveRoom(propertyRoom);
      }
    } catch (err) {
      console.error('Failed to fetch chat rooms:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const createChatRoom = async () => {
    if (!token) {
      return null;
    }

    try {
      const response = await axios.post(
        `${API_CONFIG.baseUrl}/${API_CONFIG.apiPrefix}/chat/rooms`,
        {
          propertyId: parseInt(propertyId),
          title: propertyTitle ? `Chat for ${propertyTitle}` : 'Interested in property',
          initialMessage: "Hello, I'm interested in this property. Can you provide more information?",
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('Chatroom Created:', response.data);
      const newRoom = {
        id: response.data.id,
        name: response.data.seller?.name || response.data.buyer?.name || owner?.name || response.data.title || `Room ${response.data.id}`,
        avatar: response.data.seller?.avatar || response.data.buyer?.avatar || owner?.avatar || '/assets/default-avatar.png',
        propertyId: response.data.property?.id,
        district: response.data.property?.district || 'Unknown',
        thumbnail: response.data.property?.thumbnail || '/assets/default-property.png',
        unreadCount: response.data.unreadCount || 0,
        title: response.data.title || 'Chat Room',
        lastMessage: response.data.lastMessage || null,
        owner: {
          name: response.data.seller?.name || owner?.name || 'Unknown',
          phone: response.data.seller?.phone || owner?.phone || 'N/A',
          whatsapp: response.data.seller?.whatsapp || owner?.whatsapp || 'N/A',
          avatar: response.data.seller?.avatar || owner?.avatar || '/assets/default-avatar.png',
        },
      };
      setRooms((prev) => [...prev, newRoom]);
      setActiveRoom(newRoom);
      return newRoom;
    } catch (err) {
      console.error('Error creating chatroom:', err);
      return null;
    }
  };

  const fetchChatRoom = async (roomId) => {
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
        name: room.seller?.name || room.buyer?.name || owner?.name || room.title || `Room ${room.id}`,
        avatar: room.seller?.avatar || room.buyer?.avatar || owner?.avatar || '/assets/default-avatar.png',
        propertyId: room.property?.id,
        district: room.property?.district || 'Unknown',
        thumbnail: room.property?.thumbnail || '/assets/default-property.png',
        unreadCount: room.unreadCount || 0,
        title: room.title || 'Chat Room',
        lastMessage: room.lastMessage || null,
        owner: {
          name: room.seller?.name || owner?.name || 'Unknown',
          phone: room.seller?.phone || owner?.phone || 'N/A',
          whatsapp: room.seller?.whatsapp || owner?.whatsapp || 'N/A',
          avatar: room.seller?.avatar || owner?.avatar || '/assets/default-avatar.png',
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
      return null;
    }
  };

  const fetchMessages = async (roomId) => {
    try {
      setIsLoading(true);
      setMessages((prev) => ({ ...prev, [roomId]: [] }));
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
      setMessages((prev) => ({ ...prev, [roomId]: messagesData }));
      messagesData.forEach((msg) => {
        if (!msg.mine && msg.status !== 'READ') {
          markMessageAsRead(msg.id, roomId);
        }
      });
    } catch (err) {
      console.error('Failed to fetch messages for room', roomId, ':', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !activeRoom) return;

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
      sendMessageToSocket({
        destination: `/app/chat/${activeRoom.id}/send`,
        body: JSON.stringify({
          content: inputText,
          id: newMessage.id,
          chatRoomId: activeRoom.id,
          sender: { id: userId, name: userName },
          type: 'MESSAGE',
          status: 'SENT',
          createdAt: new Date().toISOString(),
        }),
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages((prev) => ({
        ...prev,
        [activeRoom.id]: [
          ...(prev[activeRoom.id] || []),
          {
            ...newMessage,
            type: 'outgoing',
            status: newMessage.status || 'SENT',
            sender: { id: userId, name: userName || 'Me' },
            createdAt: newMessage.createdAt || new Date().toISOString(),
          },
        ],
      }));
      setInputText('');
    } catch (err) {
      console.error('Failed to send message:', err.message);
    }
  };

  const markMessageAsRead = async (messageId, roomId) => {
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
    }
  };

  const fetchAdvertisements = async () => {
    try {
      setAdsLoading(true);
      if (!token) {
        console.warn('No token found, using fallback advertisement data');
        setAdvertisements(FALLBACK_AD);
        setAdsLoading(false);
        return;
      }

      const response = await axios.get(
        `${API_CONFIG.baseUrl}/api/v1/advertisements/district/Indore?page=0&size=10&sortBy=createdAt&direction=DESC`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      setAdvertisements(response.data.content || FALLBACK_AD);
      setAdsLoading(false);
    } catch (err) {
      console.error('Ads fetch error:', err.message);
      setAdsError(err.message);
      setAdvertisements(FALLBACK_AD);
      setAdsLoading(false);
    }
  };

  const handleTyping = (e) => {
    setInputText(e.target.value);
    if (activeRoom) {
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
    }
  };

  const handleSend = () => {
    sendMessage();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  const toggleContact = () => {
    setShowContact(!showContact);
    setShowDetails(false);
  };

  const toggleDetails = () => {
    setShowDetails(!showDetails);
    setShowContact(false);
  };

  const toggleChatModal = async () => {
    if (!isChatOpen && token) {
      await fetchRooms();
      if (!rooms.find((room) => room.propertyId === parseInt(propertyId))) {
        const newRoom = await createChatRoom();
        if (newRoom) {
          await fetchChatRoom(newRoom.id);
          setIsChatOpen(true);
        }
      } else {
        setIsChatOpen(true);
      }
    } else {
      setIsChatOpen(false);
    }
  };

  const formatIndianNumber = (number) => {
    if (!number) return '';

    const clean = number.toString().replace(/\D/g, '');
    if (!clean.startsWith('91') || clean.length < 12) return number;

    const country = '+91';
    const main = clean.slice(2);
    const part1 = main.slice(0, 5);
    const part2 = main.slice(5);

    return `${country} ${part1}-${part2}`;
  };

  useEffect(() => {
    if (token) {
      fetchRooms();
      fetchAdvertisements();
    }
  }, [token, propertyId]);

  useEffect(() => {
    if (token && activeRoom) {
      initWebSocket(token, activeRoom.id, setIsConnected, setMessages, setTypingUsers);
      fetchMessages(activeRoom.id);
      localStorage.setItem('lastActiveRoomId', activeRoom.id);
    }
    return () => closeWebSocket();
  }, [activeRoom, token]);

  const ad = advertisements && advertisements.length > 0 ? advertisements[0] : null;

  return (
    <div className="flex flex-col gap-6 p-6 bg-gray-50 min-h-screen">
      {/* Agent Info and Contact Buttons */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center gap-4">
          <img
            src={owner?.avatar || "https://media.istockphoto.com/id/1399565382/photo/young-happy-mixed-race-businessman-standing-with-his-arms-crossed-working-alone-in-an-office.jpg"}
            alt={owner?.name || "Michelle Ramirez"}
            className="w-12 h-12 rounded-full object-cover"
          />
          <div>
            <h3 className="text-lg font-semibold text-gray-800">{owner?.name || "Michelle Ramirez"}</h3>
            <p className="text-sm text-gray-500">Property Agent</p>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button
            onClick={toggleChatModal}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition"
          >
            <FontAwesomeIcon icon={faMessage} className="mr-2" /> Send Message
          </button>
          <button
            onClick={() => window.location.href = `tel:${owner?.phone || 'N/A'}`}
            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition disabled:bg-gray-400"
            disabled={owner?.phone === 'N/A'}
          >
            <FontAwesomeIcon icon={faPhoneVolume} className="mr-2" /> Call
          </button>
          <button
            onClick={() => window.open('https://wa.me/+919155105666?text=Hello%20there!', '_blank')}
            className="flex-1 bg-emerald-500 text-white py-2 px-4 rounded-md hover:bg-emerald-600 transition"
          >
            <FontAwesomeIcon icon={faWhatsapp} className="mr-2" /> WhatsApp
          </button>
        </div>
      </div>

      {/* Chat Modal */}
      {isChatOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={toggleChatModal}>
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl h-[80vh] flex flex-col md:flex-row" onClick={(e) => e.stopPropagation()}>
            <div className={`w-full md:w-1/3 border-r ${activeRoom && window.innerWidth <= 768 ? 'hidden' : 'block'}`}>
              <div className="p-4 border-b">
                <input
                  type="text"
                  placeholder="Search or start a new chat"
                  className="w-full p-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="overflow-y-auto h-[calc(80vh-80px)]">
                {rooms.map((chat) => (
                  <div
                    key={chat.id}
                    className={`flex items-center p-4 cursor-pointer hover:bg-gray-100 ${activeRoom?.id === chat.id ? 'bg-blue-50' : ''}`}
                    onClick={() => {
                      setActiveRoom(chat);
                      fetchChatRoom(chat.id);
                    }}
                  >
                    <img
                      src={chat.owner.avatar}
                      alt={chat.owner.name}
                      className="w-10 h-10 rounded-full object-cover mr-3"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <h4 className="text-sm font-semibold text-gray-800">{chat.owner.name}</h4>
                        {chat.unreadCount > 0 && (
                          <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-1">{chat.unreadCount}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{chat.district}</p>
                      <p className="text-xs text-gray-600 truncate">
                        {(messages[chat.id] || []).slice(-1)[0]?.content || chat.lastMessage?.content || 'No messages yet'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className={`w-full md:w-2/3 flex flex-col ${!activeRoom && window.innerWidth <= 768 ? 'hidden' : 'block'}`}>
              {activeRoom ? (
                <>
                  <div className="p-4 border-b flex items-center justify-between bg-gray-50">
                    {window.innerWidth <= 768 && (
                      <button onClick={() => setActiveRoom(null)} className="text-gray-600">
                        <FontAwesomeIcon icon={faChevronLeft} />
                      </button>
                    )}
                    <div className="flex items-center gap-3">
                      <img
                        src={activeRoom.owner.avatar}
                        alt={activeRoom.owner.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <h4 className="text-sm font-semibold text-gray-800">{activeRoom.owner.name}</h4>
                        <p className="text-xs text-gray-500">{activeRoom.district}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${activeRoom.owner.phone}`}
                        className="text-blue-600 hover:text-blue-800"
                        disabled={activeRoom.owner.phone === 'N/A'}
                      >
                        <FontAwesomeIcon icon={faPhone} />
                      </a>
                      <a
                        href={`https://wa.me/${activeRoom.owner.whatsapp}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 hover:text-green-800"
                        disabled={activeRoom.owner.whatsapp === 'N/A'}
                      >
                        <FontAwesomeIcon icon={faWhatsapp} />
                      </a>
                      <span className={`text-sm ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
                        {isConnected ? '🟢 Online' : '🔴 Offline'}
                      </span>
                      <button onClick={toggleChatModal} className="text-gray-600">×</button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    {isLoading && <div className="text-center text-gray-500">Loading...</div>}
                    {(messages[activeRoom.id] || []).map((msg, idx) => (
                      <div
                        key={msg.id || idx}
                        className={`flex ${msg.type === 'outgoing' ? 'justify-end' : 'justify-start'} mb-2`}
                        onClick={() => !msg.mine && msg.status !== 'READ' && markMessageAsRead(msg.id, activeRoom.id)}
                      >
                        <div
                          className={`max-w-[70%] p-3 rounded-lg ${
                            msg.type === 'outgoing' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'
                          }`}
                        >
                          <p>{msg.content}</p>
                          <div className="flex justify-between items-center text-xs mt-1">
                            <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {msg.type === 'outgoing' && (
                              <span className={msg.status === 'READ' ? 'text-blue-200' : 'text-gray-300'}>
                                {msg.status === 'READ' ? '✓✓' : '✓'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                    {typingUsers[activeRoom.id]?.length > 0 && (
                      <div className="text-sm text-gray-500 p-2">
                        {typingUsers[activeRoom.id].map((user) => user.userName).join(', ')} is typing...
                      </div>
                    )}
                  </div>
                  <div className="p-4 border-t">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Type a message"
                        value={inputText}
                        onChange={handleTyping}
                        onKeyDown={handleKeyPress}
                        disabled={!isConnected || !activeRoom}
                        className="flex-1 p-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={handleSend}
                        disabled={!isConnected || !activeRoom}
                        className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition disabled:bg-gray-400"
                      >
                        <FontAwesomeIcon icon={faMessage} />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  Select a chat room or start a new one
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Advertisements Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Featured Advertisement</h3>
        {adsLoading ? (
          <div className="text-center text-gray-500">Loading advertisements...</div>
        ) : adsError ? (
          <div className="text-center text-red-500">Error: {adsError}</div>
        ) : !ad ? (
          <div className="text-center text-gray-500">No advertisements available for Indore.</div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            {ad.bannerImageUrl ? (
              <img
                src={ad.bannerImageUrl}
                alt={ad.title}
                className="w-full h-48 object-cover"
                onError={(e) => {
                  console.error('Image load error for:', ad.bannerImageUrl);
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : (
              <div className="w-full h-48 bg-gray-200 flex items-center justify-center text-gray-500">No Image Available</div>
            )}
            <div className="p-4">
              <h4 className="text-xl font-semibold text-gray-800">{ad.title || 'Untitled Advertisement'}</h4>
              <p className="text-gray-600 mt-2">{ad.description || 'No description provided.'}</p>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={toggleContact}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition"
                >
                  Contact
                </button>
                <button
                  onClick={toggleDetails}
                  className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition"
                >
                  Details
                </button>
              </div>
              {showContact && (
                <div className="mt-4 space-y-2">
                  {ad.phoneNumber && (
                    <a
                      href={`tel:${ad.phoneNumber}`}
                      className="flex items-center gap-2 text-blue-600 hover:underline"
                    >
                      <FontAwesomeIcon icon={faPhone} /> {formatIndianNumber(ad.phoneNumber)}
                    </a>
                  )}
                  {ad.whatsappNumber && (
                    <a
                      href={`https://wa.me/${ad.whatsappNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-green-600 hover:underline"
                    >
                      <FontAwesomeIcon icon={faWhatsapp} /> WhatsApp
                    </a>
                  )}
                  {ad.emailAddress && (
                    <a
                      href={`mailto:${ad.emailAddress}`}
                      className="flex items-center gap-2 text-blue-600 hover:underline"
                    >
                      <FontAwesomeIcon icon={faEnvelope} /> {ad.emailAddress}
                    </a>
                  )}
                </div>
              )}
              {showDetails && (
                <div className="mt-4 space-y-2">
                  {ad.additionalInfo && (
                    <p className="text-gray-600">{ad.additionalInfo}</p>
                  )}
                  <div className="flex gap-2">
                    {ad.facebookUrl && (
                      <a
                        href={ad.facebookUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <FontAwesomeIcon icon={faFacebookF} size="lg" />
                      </a>
                    )}
                    {ad.instagramUrl && (
                      <a
                        href={ad.instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-pink-600 hover:text-pink-800"
                      >
                        <FontAwesomeIcon icon={faInstagram} size="lg" />
                      </a>
                    )}
                    {ad.youtubeUrl && (
                      <a
                        href={ad.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-red-600 hover:text-red-800"
                      >
                        <FontAwesomeIcon icon={faYoutube} size="lg" />
                      </a>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    <p>Location: {ad.targetLocation || 'Not specified'}</p>
                    <p>Valid Until: {ad.validUntil ? new Date(ad.validUntil).toLocaleDateString() : 'Not specified'}</p>
                    <p>Posted by: {ad.createdBy?.name || 'Unknown'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PgSidebar;