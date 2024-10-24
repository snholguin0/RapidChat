const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs'); // assuming this will be used for user authentication
const app = express();
const PORT = 3000;

// Serve static files from the frontend folder
app.use(express.static(path.join(__dirname, '../frontend')));

// Route to serve the index.html file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Example endpoint for user authentication
app.post('/login', (req, res) => {
    // Your authentication logic here
    res.send('Login endpoint');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
