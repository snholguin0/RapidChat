const ngrokURL = 'https://bad3-2601-541-b81-96f0-d418-d650-4370-7207.ngrok-free.app'; // Replace with your Ngrok URL
const socket = io(ngrokURL);

let currentUser = null;
let currentRoom = null; // Track the current room

// DOM Elements
const signupForm = document.getElementById('signup-form');
const loginForm = document.getElementById('login-form');
const authContainer = document.getElementById('auth-container');
const dashboard = document.getElementById('dashboard');
const friendRequestsContainer = document.getElementById('friend-requests');
const friendsListContainer = document.getElementById('friends-list');
const addFriendForm = document.getElementById('add-friend-form');
const createChatForm = document.getElementById('create-chat-form');
const chatRoomsList = document.getElementById('chat-rooms-list');
const messagesContainer = document.getElementById('messages');
const messageInput = document.getElementById('message-input');

// Signup
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('signup-username').value;
    const password = document.getElementById('signup-password').value;

    const response = await fetch(`${ngrokURL}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });

    if (response.ok) {
        alert('Sign-up successful! Please log in.');
    } else {
        alert('Sign-up failed. Please try again.');
    }
});

// Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    const response = await fetch(`${ngrokURL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });

    if (response.ok) {
        currentUser = username;
        alert(`Welcome, ${username}!`);
        showDashboard();
        fetchFriendRequests();
        fetchFriends();
        fetchChatRooms();
    } else {
        alert('Login failed. Please try again.');
    }
});

// Show Dashboard
function showDashboard() {
    authContainer.style.display = 'none';
    dashboard.style.display = 'block';
}

// Fetch Friend Requests
async function fetchFriendRequests() {
    const response = await fetch(`${ngrokURL}/friend-requests/${currentUser}`);
    if (response.ok) {
        const data = await response.json();
        friendRequestsContainer.innerHTML = '';
        data.friendRequests.forEach((req) => {
            const li = document.createElement('li');
            li.textContent = req;

            const acceptButton = document.createElement('button');
            acceptButton.textContent = 'Accept';
            acceptButton.addEventListener('click', () => acceptFriendRequest(req));

            li.appendChild(acceptButton);
            friendRequestsContainer.appendChild(li);
        });
    }
}

// Accept Friend Request
async function acceptFriendRequest(friendUsername) {
    const response = await fetch(`${ngrokURL}/accept-friend-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser, friendUsername }),
    });

    if (response.ok) {
        alert('Friend request accepted!');
        fetchFriendRequests();
        fetchFriends();
    } else {
        alert('Failed to accept friend request.');
    }
}

// Fetch Friends List
async function fetchFriends() {
    const response = await fetch(`${ngrokURL}/friends/${currentUser}`);
    if (response.ok) {
        const data = await response.json();
        friendsListContainer.innerHTML = '';
        data.friends.forEach((friend) => {
            const li = document.createElement('li');
            li.textContent = friend;
            friendsListContainer.appendChild(li);
        });
    }
}

// Add Friend
addFriendForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const friendUsername = document.getElementById('friend-username').value;

    const response = await fetch(`${ngrokURL}/send-friend-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser, friendUsername }),
    });

    if (response.ok) {
        alert(`Friend request sent to ${friendUsername}!`);
    } else {
        const error = await response.json();
        alert(`Failed to send friend request: ${error.error}`);
    }
});

// Create Chat Room
createChatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const roomName = document.getElementById('chat-room-name').value;

    const response = await fetch(`${ngrokURL}/create-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: roomName, creator: currentUser }),
    });

    if (response.ok) {
        alert(`Chat room "${roomName}" created!`);
        fetchChatRooms();
    } else {
        alert('Failed to create chat room.');
    }
});

// Fetch Chat Rooms
async function fetchChatRooms() {
    const response = await fetch(`${ngrokURL}/chat-rooms`);
    if (response.ok) {
        const data = await response.json();
        chatRoomsList.innerHTML = ''; // Clear previous rooms
        data.chatRooms.forEach((room) => {
            const li = document.createElement('li');
            li.textContent = room.name;

            const joinButton = document.createElement('button');
            joinButton.textContent = currentRoom === room.name ? 'Leave' : 'Join';
            joinButton.className = currentRoom === room.name ? 'btn btn-danger' : 'btn btn-success';
            joinButton.addEventListener('click', () => toggleRoom(room.name, joinButton));

            li.appendChild(joinButton);
            chatRoomsList.appendChild(li);
        });
    } else {
        alert('Failed to fetch chat rooms.');
    }
}

// Toggle Room (Join/Leave)
function toggleRoom(roomName, button) {
    if (currentRoom === roomName) {
        socket.emit('leaveRoom', roomName);
        currentRoom = null;
        button.textContent = 'Join';
        button.className = 'btn btn-success'; // Green for Join
    } else {
        socket.emit('joinRoom', roomName);
        currentRoom = roomName;
        button.textContent = 'Leave';
        button.className = 'btn btn-danger'; // Red for Leave
        fetchMessages(roomName);
    }
}

// Fetch Messages
async function fetchMessages(roomName) {
    const response = await fetch(`${ngrokURL}/chat-rooms/${roomName}/messages`);
    if (response.ok) {
        const data = await response.json();
        messagesContainer.innerHTML = ''; // Clear previous messages
        data.messages.forEach((message) => {
            displayMessage(message);
        });
    } else {
        alert('Failed to fetch messages.');
    }
}

// Send Message
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && currentRoom) {
        const message = messageInput.value.trim();
        if (!message) return;

        socket.emit('sendMessage', { roomName: currentRoom, sender: currentUser, content: message });
        messageInput.value = ''; // Clear input
    }
});

// Display Real-Time Messages
socket.on('newMessage', (message) => {
    displayMessage(message);
});

function displayMessage(message) {
    const p = document.createElement('p');
    p.innerHTML = `<strong>${message.sender}:</strong> ${message.content}`;
    messagesContainer.appendChild(p);
}
