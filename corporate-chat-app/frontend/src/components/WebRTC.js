// frontend/src/components/WebRTC.js
import React, { useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer';

export default function WebRTC({ socket, roomId }) {
  const videoRef = useRef();
  const peersRef = useRef({});
  const videoRefs = useRef({});
  const [peers, setPeers] = useState({});
  const [stream, setStream] = useState(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setStream(stream);
        videoRef.current.srcObject = stream;
        socket.emit('join-room', roomId);

        socket.on('user-connected', (userId) => {
          if (userId !== socket.id) {
            console.log(`New user connected: ${userId}`);
            const peer = createPeer(userId, socket.id, stream);
            peersRef.current[userId] = peer;
            videoRefs.current[userId] = React.createRef();
            setPeers((prev) => ({ ...prev, [userId]: peer }));
          }
        });

        socket.on('signal', ({ from, signalData }) => {
          if (from !== socket.id) {
            console.log(`Received signal from: ${from}`);
            if (peersRef.current[from]) {
              peersRef.current[from].signal(signalData);
            } else {
              const peer = addPeer(signalData, from, stream);
              peersRef.current[from] = peer;
              videoRefs.current[from] = React.createRef();
              setPeers((prev) => ({ ...prev, [from]: peer }));
            }
          }
        });

        socket.on('user-disconnected', (userId) => {
          if (peersRef.current[userId]) {
            console.log(`User disconnected: ${userId}`);
            peersRef.current[userId].destroy();
            delete peersRef.current[userId];
            delete videoRefs.current[userId];
            setPeers((prev) => {
              const newPeers = { ...prev };
              delete newPeers[userId];
              return newPeers;
            });
          }
        });
      })
      .catch((err) => {
        console.error('Error accessing media devices:', err);
      });

    socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
    });

    return () => {
      socket.off('user-connected');
      socket.off('signal');
      socket.off('user-disconnected');
      socket.off('connect_error');
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [socket, roomId]);

  const createPeer = (userToSignal, callerID, stream) => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream,
    });
    peer.on('signal', (signal) => {
      console.log(`Sending signal to ${userToSignal}`);
      socket.emit('signal', { roomId, signalData: signal, to: userToSignal });
    });
    peer.on('stream', (remoteStream) => {
      console.log(`Received stream from ${userToSignal}`, remoteStream.getTracks());
      const setStream = () => {
        if (videoRefs.current[userToSignal]?.current) {
          videoRefs.current[userToSignal].current.srcObject = remoteStream;
        } else {
          console.warn(`No video ref for ${userToSignal}, retrying...`);
          setTimeout(setStream, 100);
        }
      };
      setStream();
    });
    peer.on('error', (err) => {
      console.error(`Peer error with ${userToSignal}:`, err);
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
      console.log(`Sending signal back to ${callerID}`);
      socket.emit('signal', { roomId, signalData: signal, to: callerID });
    });
    peer.on('stream', (remoteStream) => {
      console.log(`Received stream from ${callerID}`, remoteStream.getTracks());
      const setStream = () => {
        if (videoRefs.current[callerID]?.current) {
          videoRefs.current[callerID].current.srcObject = remoteStream;
        } else {
          console.warn(`No video ref for ${callerID}, retrying...`);
          setTimeout(setStream, 100);
        }
      };
      setStream();
    });
    peer.on('error', (err) => {
      console.error(`Peer error with ${callerID}:`, err);
    });
    peer.signal(incomingSignal);
    return peer;
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
    <div className="video-container">
      <h2>Video</h2>
      <div className="video-grid">
        <div className="video-wrapper">
          <h3>My Video</h3>
          <video muted autoPlay ref={videoRef} className="video" />
        </div>
        {Object.keys(peers).map((peerId) => (
          <div key={peerId} className="video-wrapper">
            <h3>User {peerId.slice(0, 5)}</h3>
            <video autoPlay ref={videoRefs.current[peerId]} className="video" />
          </div>
        ))}
      </div>
      <div className="controls">
        <button onClick={toggleCamera}>
          {cameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
        </button>
        <button onClick={toggleMic}>
          {micOn ? 'Turn Off Mic' : 'Turn On Mic'}
        </button>
      </div>
    </div>
  );
}