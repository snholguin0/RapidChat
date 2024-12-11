const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

// Initialize the app and create a server
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the 'frontend' folder
app.use(express.static('../frontend'));


// WebSocket logic
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Event for joining a room
    socket.on('joinRoom', (room) => {
        socket.join(room); // Add the user to the specified room
        console.log(`${socket.id} joined room: ${room}`);

        // Notify others in the room that a new user has joined
        socket.to(room).emit('message', `A new user has joined room: ${room}`);
    });

    // Event for receiving and broadcasting chat messages
    socket.on('chatMessage', ({ room, message, username }) => {
        console.log(`Message from ${username || 'User'} in ${room}: ${message}`);

        // Broadcast the message to everyone in the room
        io.to(room).emit('message', `${username || 'User'}: ${message}`);
    });

    // Event for handling user disconnection
    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
    });
});

// Start the server
const PORT = 3000; // You can change this to your desired port
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
