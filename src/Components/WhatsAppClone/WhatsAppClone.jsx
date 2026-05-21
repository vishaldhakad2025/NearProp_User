import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useNavigate, useLocation } from "react-router-dom";
import {
  faCircleUser,
  faEllipsisV,
  faSearch,
  faPaperclip,
  faMicrophone,
  faPaperPlane,
  faSmile,
  faArrowLeft,
  faPhone,
  faVideo,
  faTimes,
  faRightToBracket,
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import { Client } from '@stomp/stompjs';
import { format } from 'date-fns';
import './WhatsAppClone.css';

// API configuration
const API_CONFIG = {
  baseUrl: 'https://api.nearprop.com',
  apiPrefix: 'api',
  wsUrl: 'wss://api.nearprop.com/api/ws',
};

// Default fallback image
const DEFAULT_AVATAR = "https://i.pinimg.com/736x/d2/54/e5/d254e5c08e0bcc1f14dbf274346020b2.jpg";

// WebSocket client variables
let stompClient = null;
let currentSubscription = null;

const WhatsAppClone = () => {
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState({});
  const [inputMessage, setInputMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showChatList, setShowChatList] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [error, setError] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef(null);

  // New states for profile
  const [currentUserName, setCurrentUserName] = useState('User');
  const [profileImageUrl, setProfileImageUrl] = useState(null);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Get auth data from localStorage
  const getAuthData = () => {
    try {
      const authData = localStorage.getItem('authData');
      if (!authData) return null;
      return JSON.parse(authData);
    } catch (err) {
      console.error('Error parsing authData:', err);
      return null;
    }
  };

  const authData = getAuthData();
  const token = authData?.token || null;
  const userId = authData?.userId || null;
  const userRole = authData?.roles?.[0] || null;
  const isGuest = !token;

  // Fetch user profile from API
  const fetchUserProfile = async () => {
    if (!token) {
      setCurrentUserName(authData?.name || 'User');
      setProfileImageUrl(null);
      return;
    }

    try {
      const response = await axios.get(
        `${API_CONFIG.baseUrl}/${API_CONFIG.apiPrefix}/v1/users/profile`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success && response.data.data) {
        const userData = response.data.data;
        setCurrentUserName(userData.name || 'User');
        setProfileImageUrl(userData.profileImageUrl || null);
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
      setCurrentUserName(authData?.name || 'User');
      setProfileImageUrl(null);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');
        setInputMessage(transcript);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsRecording(false);
        setError('Voice recording error. Try again.');
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    } else {
      console.warn('Speech Recognition not supported in this browser.');
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      setError('Voice recording not supported in your browser.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const fetchRooms = async () => {
    if (isGuest) {
      setRooms([]);
      setError('Please log in to view chat rooms.');
      return;
    } 
    try {
      setIsLoading(true);
      let endpoint;
      if (userRole === 'DEVELOPER') {
        endpoint = `${API_CONFIG.baseUrl}/${API_CONFIG.apiPrefix}/chat/rooms`;
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
        avatar: room.seller?.avatar || room.buyer?.avatar || room?.property?.thumbnail || DEFAULT_AVATAR,
        propertyId: room.property?.id,
        district: room.property?.districtName ,
        thumbnail: room?.property?.thumbnail,
        unreadCount: room.unreadCount || 0,
        title: room.title || 'Chat Room',
        lastMessage: room.lastMessage || null,
      }));

      setRooms(formattedRooms);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch chat rooms:', err.message);
      setError('Failed to load chat rooms. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
        isSent: msg.mine,
        text: msg.content,
        sender: msg.sender?.name || (msg.mine ? currentUserName : 'User'),
        timestamp: msg.createdAt ? format(new Date(msg.createdAt), 'h:mm a') : '',
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
      setError('Failed to load messages. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Mask numbers (after 4 digits → ****) only when sending
  const maskNumbersInMessage = (text) => {
    return text.replace(/\d{5,}/g, (match) => {
      return match.slice(0, 4) + '*'.repeat(match.length - 4);
    });
  };

  // Send a message with number masking (no toast block)
  const sendMessage = async () => {
    if (isGuest || isSending || !inputMessage.trim() || !activeRoom) return;

    const messageToSend = inputMessage.trim();
    const maskedMessage = maskNumbersInMessage(messageToSend);

    setIsSending(true);
    try {
      const response = await axios.post(
        `${API_CONFIG.baseUrl}/${API_CONFIG.apiPrefix}/chat/rooms/${activeRoom.id}/messages`,
        {
          content: maskedMessage, // Send masked version
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
                sender: { id: userId, name: currentUserName },
                createdAt: newMessage.createdAt || new Date().toISOString(),
                isSent: true,
                text: maskedMessage, // Show masked in UI too
                timestamp: format(new Date(), 'h:mm a'),
              },
            ],
          };
        }
        return prev;
      });
      setInputMessage('');
    } catch (err) {
      console.error('Failed to send message:', err.message);
      setError('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

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
    } catch (err) {
      console.error('Failed to mark message as READ:', err.message);
    }
  };

  const handleTyping = (e) => {
    setInputMessage(e.target.value);
    if (isGuest || !activeRoom) return;
    
    sendTypingEvent({
      destination: `/app/chat/${activeRoom.id}/typing`,
      body: JSON.stringify({
        type: 'TYPING',
        roomId: activeRoom.id,
        userId,
        userName: currentUserName,
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
            userName: currentUserName,
          }),
          headers: { Authorization: `Bearer ${token}` },
        });
      }, 2000)
    );
  };

  const handleSendMessage = () => {
    sendMessage();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleBackToChats = () => {
    setShowChatList(true);
    setActiveRoom(null);
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleChatSelect = async (chat) => {
    setActiveRoom(chat);
    await fetchMessages(chat.id);
    if (isMobile) {
      setShowChatList(false);
    }
  };

  const filteredRooms = rooms.filter((room) =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle property redirect and auto-open/create chat
  useEffect(() => {
    const handlePropertyRedirect = async () => {
      if (!isGuest && token && location.state?.propertyId && location.state?.propertyTitle) {
        const { propertyId, propertyTitle } = location.state;
        
        try {
          // First fetch rooms
          await fetchRooms();
          
          // Check if room already exists for this property
          const existingRoom = rooms.find(room => room.propertyId === parseInt(propertyId));
          
          if (existingRoom) {
            // If room exists, open it
            await handleChatSelect(existingRoom);
          } else {
            // If room doesn't exist, create new room
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
                name: response.data.seller?.name || response.data.buyer?.name || 'Property Owner',
                avatar: response.data.seller?.avatar || response.data.buyer?.avatar || DEFAULT_AVATAR,
                propertyId: response.data.property?.id,
                district: response.data.property?.districtName,
                thumbnail: response.data.property?.thumbnail,
                unreadCount: 0,
                title: response.data.title || 'Chat Room',
                lastMessage: response.data.lastMessage || null,
              };
              
              setRooms((prev) => [...prev, newRoom]);
              await handleChatSelect(newRoom);
            } catch (err) {
              console.error('Error creating chat room:', err);
              setError('Failed to create chat room. Please try again.');
            }
          }
          
          // Clear location state after processing
          navigate('/chat', { replace: true, state: {} });
        } catch (err) {
          console.error('Error handling property redirect:', err);
        }
      }
    };

    if (!isGuest && token) {
      fetchUserProfile();
      fetchRooms();
      handlePropertyRedirect();
    } else {
      setCurrentUserName('Guest');
      setProfileImageUrl(null);
    }
  }, [isGuest, token, location.state?.propertyId]);

  useEffect(() => {
    if (!isGuest && token && activeRoom) {
      initWebSocket(token, activeRoom.id, setIsConnected, setMessages, setTypingUsers, setRooms);
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

  return (
    <div className="whatsapp-container">
      {/* Sidebar - Chat List */}
      <div className={`chat-sidebar ${!showChatList && isMobile ? 'hidden' : ''}`}>
        <div className="sidebar-header">
          <div
            className="user-profile"
            style={{ cursor: "pointer" }}
            onClick={() => navigate("/userprofile")}
          >
            <img
              src={profileImageUrl || DEFAULT_AVATAR}
              alt={currentUserName}
              className="profile-icon"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = DEFAULT_AVATAR;
              }}
            />
            <span className="user-name">{currentUserName}</span>
          </div>
          <div className="header-icons" style={{ cursor: "pointer" }} onClick={() => navigate("/")}>
            <FontAwesomeIcon icon={faRightToBracket} className="header-icon" />
          </div>
        </div>

        <div className="search-container">
          <div className="search-bar">
            <FontAwesomeIcon icon={faSearch} className="search-icon" />
            <input
              type="text"
              placeholder="Search or start new chat"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="chat-list">
          {isLoading && rooms.length === 0 ? (
            <div className="loading p-4 text-center">Loading chats...</div>
          ) : isGuest ? (
            <div className="p-4 text-center text-gray-500">
              Please log in to view chat rooms.
            </div>
          ) : filteredRooms.length > 0 ? (
            filteredRooms.map((chat) => (
              <div
                key={chat.id}
                className={`chat-item ${activeRoom?.id === chat.id ? 'active' : ''}`}
                onClick={() => handleChatSelect(chat)}
              >
                <img
                  src={chat.avatar || DEFAULT_AVATAR}
                  alt={chat.name}
                  className="chat-avatar"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = DEFAULT_AVATAR;
                  }}
                />
                <div className="chat-info">
                  <div className="chat-header">
                    <h4 className="chat-name">{chat.name}</h4>
                    <span className="chat-time">
                      {chat.lastMessage?.createdAt
                        ? format(new Date(chat.lastMessage.createdAt), 'h:mm a')
                        : ''}
                    </span>
                  </div>
                  <div className="chat-preview">
                    <p className="last-message">
                      {(messages[chat.id] || []).slice(-1)[0]?.text ||
                        chat.lastMessage?.content ||
                        'No messages yet'}
                    </p>
                    {chat.unreadCount > 0 && (
                      <span className="unread-badge">{chat.unreadCount}</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-gray-500">
              No chats found. Start a conversation!
            </div>
          )}
        </div>
      </div>

      <div className={`chat-window ${showChatList && isMobile ? 'hidden' : ''}`}>
        {activeRoom ? (
          <>
            <div className="chat-header-bar">
              {isMobile && (
                <FontAwesomeIcon
                  icon={faArrowLeft}
                  className="back-icon"
                  onClick={handleBackToChats}
                />
              )}
              <img
                src={activeRoom.avatar || DEFAULT_AVATAR}
                alt={activeRoom.name}
                className="chat-header-avatar"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = DEFAULT_AVATAR;
                }}
              />
              <div className="chat-header-info">
                <h3>{activeRoom.name}</h3>
                <span className="online-status">
                  {isConnected ? 'online' : 'offline'}
                </span>
              </div>
            </div>

            <div className="messages-container">
              {isLoading && (messages[activeRoom.id] || []).length === 0 ? (
                <div className="loading p-4 text-center">Loading messages...</div>
              ) : (
                <>
                  {(messages[activeRoom.id] || []).map((message, idx) => (
                    <div
                      key={message.id || idx}
                      className={`message ${message.isSent ? 'sent' : 'received'}`}
                      onClick={() =>
                        !message.isSent &&
                        message.status !== 'READ' &&
                        markMessageAsRead(message.id, activeRoom.id)
                      }
                    >
                      <div className="message-bubble">
                        <p className="message-text">{message.text}</p>
                        <span className="message-time">
                          {message.timestamp}
                          {message.isSent && (
                            <span className="message-status ms-1">
                              {message.status === 'READ' ? '✓✓' : '✓'}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                  {typingUsers[activeRoom.id]?.length > 0 && (
                    <div className="typing-indicator text-sm p-2">
                      {typingUsers[activeRoom.id].map((user) => user.userName).join(', ')} is
                      typing...
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="input-container">
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*,video/*,application/*"
              />
              <input
                type="text"
                placeholder="Type a message"
                value={inputMessage}
                onChange={handleTyping}
                onKeyPress={handleKeyPress}
                className="message-input"
                disabled={isGuest || isSending}
              />
              {inputMessage.trim() ? (
                <FontAwesomeIcon
                  icon={faPaperPlane}
                  className="input-icon send-icon"
                  onClick={handleSendMessage}
                />
              ) : (
                <FontAwesomeIcon 
                  icon={faMicrophone} 
                  className={`input-icon mic-icon ${isRecording ? 'recording' : ''}`}
                  onClick={toggleRecording}
                  style={{ cursor: 'pointer' }}
                />
              )}
            </div>
          </>
        ) : (
          <div className="empty-chat">
            <div className="empty-chat-content">
              <div className="empty-icon">💬</div>
              <h2>Chat Application</h2>
              <p>
                Select a chat to start messaging
                <br />
                End-to-end encrypted
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="error-toast">
          <p>{error}</p>
          <button onClick={() => setError(null)}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
      )}
    </div>
  );
};

// WebSocket functions (unchanged - same as before)
const subscribeToRoom = (roomId, setMessages, setTypingUsers, setIsConnected, setRooms) => {
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
                  isSent: data.mine,
                  text: data.content,
                  sender: data.sender?.name || 'User',
                  timestamp: format(new Date(), 'h:mm a'),
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
              return {
                ...prev,
                [messageRoomId]: [
                  ...users,
                  { userId: data.userId, userName: data.userName || `User ${data.userId}` },
                ],
              };
            }
          } else {
            return {
              ...prev,
              [messageRoomId]: users.filter((user) => user.userId !== data.userId),
            };
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
          setRooms((prev) =>
            prev.map((room) => (room.id === messageRoomId ? { ...room, unreadCount: 0 } : room))
          );
        }
      }
    } catch (error) {
      console.error('WebSocket parse error:', error);
    }
  });
  console.log(`Subscribed to /topic/chat/${roomId}`);
};

const initWebSocket = (token, roomId, setIsConnected, setMessages, setTypingUsers, setRooms) => {
  if (stompClient && stompClient.connected) {
    console.log('WebSocket already connected');
    if (roomId) {
      subscribeToRoom(roomId, setMessages, setTypingUsers, setIsConnected, setRooms);
    }
    return;
  }
  
  stompClient = new Client({
    brokerURL: `${API_CONFIG.wsUrl}?token=${token}`,
    connectHeaders: { Authorization: `Bearer ${token}` },
    reconnectDelay: 5000,
    onConnect: () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      if (roomId) {
        subscribeToRoom(roomId, setMessages, setTypingUsers, setIsConnected, setRooms);
      }
    },
    onStompError: (frame) => {
      console.error('STOMP error:', frame.headers['message']);
    },
    onWebSocketError: (evt) => {
      console.error('WebSocket error:', evt);
    },
    onDisconnect: () => {
      console.warn('WebSocket disconnected');
      setIsConnected(false);
      currentSubscription = null;
    },
  });
  stompClient.activate();
};

const sendTypingEvent = ({ destination, body, headers }) => {
  if (stompClient && stompClient.connected) {
    console.log('Sending typing event:', { destination, body });
    stompClient.publish({ destination, body, headers });
  }
};

const closeWebSocket = () => {
  if (stompClient) {
    if (currentSubscription) {
      currentSubscription.unsubscribe();
      currentSubscription = null;
    }
    stompClient.deactivate();
    stompClient = null;
    console.log('WebSocket closed');
  }
};

export default WhatsAppClone;