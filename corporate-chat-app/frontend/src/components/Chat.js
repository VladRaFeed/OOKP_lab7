// frontend/src/components/Chat.js
import React, { useState, useEffect } from 'react';

export default function Chat({ socket, chatId }) {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    socket.emit('join-chat', chatId);
    socket.on('receive-message', ({ sender, content, timestamp }) => {
      setMessages((prev) => [...prev, { sender, content, timestamp }]);
    });

    return () => {
      socket.off('receive-message');
    };
  }, [socket, chatId]);

  const sendMessage = () => {
    if (message.trim()) {
      socket.emit('send-message', { chatId, sender: socket.id, content: message });
      setMessage('');
    }
  };

  return (
    <div className="chat-container">
      <h2>Chat</h2>
      <div className="chat-messages">
        {messages.map((msg, index) => (
          <p
            key={index}
            className={msg.sender === socket.id ? 'my-message' : 'other-message'}
          >
            {`${msg.sender.slice(0, 5)}: ${msg.content} (${new Date(msg.timestamp).toLocaleTimeString()})`}
          </p>
        ))}
      </div>
      <div className="chat-input">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..."
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}