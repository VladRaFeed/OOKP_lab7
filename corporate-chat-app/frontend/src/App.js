import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import Peer from 'simple-peer';

const socket = io('https://ookp-lab7.onrender.com', {
  transports: ['websocket', 'polling'],
});

function App() {
  const [chatId] = useState('main-chat');
  const [roomId] = useState('main-room');
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [peers, setPeers] = useState({});
  const videoRef = useRef();
  const peersRef = useRef({});
  const [stream, setStream] = useState(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);

  useEffect(() => {
    // Чат
    socket.emit('join-chat', chatId);
    socket.on('receive-message', ({ sender, content, timestamp }) => {
      setMessages((prev) => [...prev, { sender, content, timestamp }]);
    });

    // WebRTC
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      setStream(stream);
      videoRef.current.srcObject = stream;
      socket.emit('join-room', roomId);

      socket.on('user-connected', (userId) => {
        const peer = createPeer(userId, socket.id, stream);
        peersRef.current[userId] = peer;
        setPeers((prev) => ({ ...prev, [userId]: peer }));
      });

      socket.on('signal', ({ from, signalData }) => {
        if (peersRef.current[from]) {
          peersRef.current[from].signal(signalData);
        } else {
          const peer = addPeer(signalData, from, stream);
          peersRef.current[from] = peer;
          setPeers((prev) => ({ ...prev, [from]: peer }));
        }
      });

      socket.on('user-disconnected', (userId) => {
        if (peersRef.current[userId]) {
          peersRef.current[userId].destroy();
          delete peersRef.current[userId];
          setPeers((prev) => {
            const newPeers = { ...prev };
            delete newPeers[userId];
            return newPeers;
          });
        }
      });
    });

    return () => {
      socket.off('receive-message');
      socket.off('user-connected');
      socket.off('signal');
      socket.off('user-disconnected');
    };
  }, [chatId, roomId]);

  const createPeer = (userToSignal, callerID, stream) => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream,
    });
    peer.on('signal', (signal) => {
      socket.emit('signal', { roomId, signalData: signal, to: userToSignal });
    });
    return peer;
  };

  const addPeer = (incomingSignal, callerID, stream) => {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream,
    });
    peer.on('signal', (signal) => {
      socket.emit('signal', { roomId, signalData: signal, to: callerID });
    });
    peer.signal(incomingSignal);
    return peer;
  };

  const sendMessage = () => {
    if (message.trim()) {
      socket.emit('send-message', { chatId, sender: socket.id, content: message });
      setMessage('');
    }
  };

  const toggleCamera = () => {
    if (stream) {
      stream.getVideoTracks()[0].enabled = !cameraOn;
      setCameraOn(!cameraOn);
    }
  };

  const toggleMic = () => {
    if (stream) {
      stream.getAudioTracks()[0].enabled = !micOn;
      setMicOn(!micOn);
    }
  };

  return (
    <div>
      <h1>Corporate Chat</h1>
      <div>
        <h2>Video</h2>
        <video autoPlay ref={videoRef} style={{ width: '300px' }} />
        {Object.keys(peers).map((peerId) => (
          <video key={peerId} autoPlay ref={(ref) => ref && (ref.srcObject = peers[peerId].streams[0])} style={{ width: '300px' }} />
        ))}
        <button onClick={toggleCamera}>{cameraOn ? 'Turn Off Camera' : 'Turn On Camera'}</button>
        <button onClick={toggleMic}>{micOn ? 'Turn Off Mic' : 'Turn On Mic'}</button>
      </div>
      <div>
        <h2>Chat</h2>
        <div>
          {messages.map((msg, index) => (
            <p key={index}>{`${msg.sender}: ${msg.content} (${new Date(msg.timestamp).toLocaleTimeString()})`}</p>
          ))}
        </div>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}

export default App;