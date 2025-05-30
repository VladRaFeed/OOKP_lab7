const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Налаштування CORS для Socket.IO
const io = new Server(server, {
  cors: {
    origin: 'https://ookp-lab7-sny6.vercel.app', 
    methods: ['GET', 'POST'],
    credentials: true, // Для підтримки кук або авторизації (про всяк випадок)
  },
});

// Налаштування CORS для Express
app.use(cors({
  origin: 'https://ookp-lab7-sny6.vercel.app',
  methods: ['GET', 'POST'],
  credentials: true,
}));

app.use(express.json());

// Підключення до MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Схема для повідомлень
const messageSchema = new mongoose.Schema({
  chatId: String,
  sender: String,
  content: String,
  timestamp: { type: Date, default: Date.now },
});
const Message = mongoose.model('Message', messageSchema);

// Socket.IO для чату та WebRTC сигналізації
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Чат
  socket.on('join-chat', (chatId) => {
    socket.join(chatId);
    console.log(`${socket.id} joined chat ${chatId}`);
  });

  socket.on('send-message', async ({ chatId, sender, content }) => {
    const message = new Message({ chatId, sender, content });
    await message.save();
    io.to(chatId).emit('receive-message', { sender, content, timestamp: message.timestamp });
  });

  // WebRTC сигналізація
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    socket.to(roomId).emit('user-connected', socket.id);
  });

  socket.on('signal', ({ roomId, signalData, to }) => {
    io.to(to).emit('signal', { from: socket.id, signalData });
  });

  socket.on('disconnect', () => {
    socket.broadcast.emit('user-disconnected', socket.id);
    console.log('User disconnected:', socket.id);
  });
});

app.get('/', (req, res) => res.send('Backend is running'));

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));