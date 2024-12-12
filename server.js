const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // Allow all origins for development; replace '*' with frontend URL in production
        methods: ['GET', 'POST'],
    },
});

app.use(bodyParser.json());
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Default route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/chatApp', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// MongoDB Models
const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    friends: { type: [String], default: [] },
    friendRequests: { type: [String], default: [] },
});
const User = mongoose.model('User', userSchema);

const chatRoomSchema = new mongoose.Schema({
    name: { type: String, unique: true, required: true },
    members: { type: [String], default: [] },
    messages: [{ sender: String, content: String, timestamp: Date }],
});
const ChatRoom = mongoose.model('ChatRoom', chatRoomSchema);

// API Routes

// Signup Route
app.post('/signup', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        const newUser = new User({ username, password });
        await newUser.save();
        res.status(200).json({ message: 'Sign-up successful' });
    } catch (error) {
        res.status(400).json({ error: 'User already exists' });
    }
});

// Login Route
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user || user.password !== password) {
            return res.status(400).json({ error: 'Invalid username or password' });
        }
        res.status(200).json({ message: 'Login successful' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Friend Requests
app.get('/friend-requests/:username', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.status(200).json({ friendRequests: user.friendRequests });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Send Friend Request
app.post('/send-friend-request', async (req, res) => {
    const { username, friendUsername } = req.body;

    try {
        const friend = await User.findOne({ username: friendUsername });
        if (!friend) return res.status(400).json({ error: 'User not found' });

        if (friend.friendRequests.includes(username)) {
            return res.status(400).json({ error: 'Friend request already sent' });
        }

        friend.friendRequests.push(username);
        await friend.save();
        res.status(200).json({ message: 'Friend request sent successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Accept Friend Request
app.post('/accept-friend-request', async (req, res) => {
    const { username, friendUsername } = req.body;
    try {
        const user = await User.findOne({ username });
        const friend = await User.findOne({ username: friendUsername });
        if (!user || !friend) return res.status(400).json({ error: 'One or both users not found' });

        const index = user.friendRequests.indexOf(friendUsername);
        if (index === -1) return res.status(400).json({ error: 'Friend request not found' });

        user.friends.push(friendUsername);
        friend.friends.push(username);
        user.friendRequests.splice(index, 1);

        await user.save();
        await friend.save();
        res.status(200).json({ message: 'Friend request accepted' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get Friends List
app.get('/friends/:username', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.status(200).json({ friends: user.friends });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create Chat Room
app.post('/create-chat', async (req, res) => {
    const { name, creator, members } = req.body;

    if (!name || !creator) {
        return res.status(400).json({ error: 'Room name and creator are required' });
    }

    try {
        const existingRoom = await ChatRoom.findOne({ name });
        if (existingRoom) {
            return res.status(400).json({ error: 'Chat room already exists' });
        }

        const newChatRoom = new ChatRoom({
            name,
            members: [creator, ...(members || [])],
            messages: [],
        });

        await newChatRoom.save();
        res.status(200).json({ message: 'Chat room created successfully', chatRoom: newChatRoom });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create chat room' });
    }
});

// Get All Chat Rooms
app.get('/chat-rooms', async (req, res) => {
    try {
        const chatRooms = await ChatRoom.find({});
        res.status(200).json({ chatRooms });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch chat rooms' });
    }
});

// Get Chat Room Messages
app.get('/chat-rooms/:name/messages', async (req, res) => {
    try {
        const chatRoom = await ChatRoom.findOne({ name: req.params.name });
        if (!chatRoom) {
            return res.status(404).json({ error: 'Chat room not found' });
        }
        res.status(200).json({ messages: chatRoom.messages });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// WebSocket for Real-Time Messaging
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('joinRoom', (roomName) => {
        socket.join(roomName);
        console.log(`User ${socket.id} joined room ${roomName}`);
    });

    socket.on('sendMessage', async ({ roomName, sender, content }) => {
        const message = { sender, content, timestamp: new Date() };

        // Save message to the database
        const chatRoom = await ChatRoom.findOne({ name: roomName });
        if (chatRoom) {
            chatRoom.messages.push(message);
            await chatRoom.save();
        }

        // Broadcast message to the room
        io.to(roomName).emit('newMessage', message);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Start Server
const PORT = 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

