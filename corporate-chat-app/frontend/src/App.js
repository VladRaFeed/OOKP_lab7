// frontend/src/App.js
import React, { useState } from 'react';
import io from 'socket.io-client';
import Chat from './components/Chat';
import WebRTC from './components/WebRTC';
import './App.css';

const socket = io('https://ookp-lab7.onrender.com', {
  transports: ['websocket', 'polling'],
});

function App() {
  const [chatId] = useState('main-chat');
  const [roomId] = useState('main-room');

  return (
    <div className="App">
      <h1>Corporate Chat</h1>
      <WebRTC socket={socket} roomId={roomId} />
      <Chat socket={socket} chatId={chatId} />
    </div>
  );
}

export default App;