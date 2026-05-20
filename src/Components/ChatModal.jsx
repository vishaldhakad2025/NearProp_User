import React from 'react';
import './PgAndHosteldetails.css';

const ChatModal = ({
  isOpen,
  toggle,
  rooms,
  activeRoom,
  setActiveRoom,
  messages,
  setMessages,
  typingUsers,
  inputText,
  setInputText,
  isConnected,
  sendMessage,
  messagesEndRef,
}) => {
  if (!isOpen) return null; // Conditionally render modal only when isOpen is true

  return (
    <div className="chat-modal-overlay" onClick={toggle}>
      <div className="chat-modal" onClick={e => e.stopPropagation()}>
        <div className="whatsapp-container">
          <div className="chat-sidebar">
            <input type="text" placeholder="Search or start a new chat" className="chat-search" />
<div className="chat-list">
               {rooms.map(chat => (
                 <div
                   key={chat.id}
                   className={`chat-item ${activeRoom?.id === chat.id ? 'active' : ''}`}
                   onClick={() => setActiveRoom(chat)}
                 >
                   <img src={chat.owner.avatar} alt={chat.owner.name} onError={(e) => { e.target.src = 'https://via.placeholder.com/50'; }} />
                   <div className="chat-info">
                     <div className="chat-name">
                       {chat.senderName || chat.lastMessage?.sender?.name }
                     </div>
                     <div className="chat-msg">{(messages[chat.id] || []).slice(-1)[0]?.content || 'No messages'}</div>
                   </div>
                 </div>
               ))}
             </div>
          </div>
          <div className="chat-window">
            {activeRoom ? (
              <>
<div className="chat-header">
                   <img src={activeRoom.owner.avatar} alt={activeRoom.owner.name} onError={(e) => { e.target.src = 'https://via.placeholder.com/50'; }} />
                   <span>{activeRoom.senderName || activeRoom.lastMessage?.sender?.name || activeRoom.owner.name}</span>
                   <span className={isConnected ? 'connected' : 'disconnected'}>
                     {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
                   </span>
                   <button onClick={toggle} className="chat-modal-close" aria-label="Close Chat">
                     ×
                   </button>
                 </div>
                <div className="chat-messages">
                  {(messages[activeRoom.id] || []).map((msg, idx) => (
                    <div key={idx} className={`message ${msg.type}`}>
                      <div className="message-meta">{msg.sender?.name || 'Unknown'}</div>
                      <div className="message-content">{msg.content}</div>
                      <div className="timestamp">{new Date(msg.createdAt).toLocaleString()}</div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                  {typingUsers[activeRoom.id]?.length > 0 && (
                    <div className="typing-indicator">
                      {typingUsers[activeRoom.id].map(u => u.userName).join(', ')} typing...
                    </div>
                  )}
                </div>
                <div className="chat-input">
                  <input
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    placeholder="Type a message"
                    disabled={!isConnected}
                    className="chat-input-field"
                  />
                  <button onClick={sendMessage} disabled={!isConnected} className="chat-send-btn">
                    Send
                  </button>
                </div>
              </>
            ) : (
              <div className="no-room-selected">
                <p>Select a chat to start messaging</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatModal;