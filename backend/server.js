const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const app = express();
app.use(bodyParser.json());

let users = [];

// Register route
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 8);
    users.push({ username, password: hashedPassword });
    res.json({ message: "User registered successfully" });
});

// Login route
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username);
    if (user && bcrypt.compareSync(password, user.password)) {
        res.json({ message: "Login successful" });
    } else {
        res.status(400).json({ message: "Invalid credentials" });
    }
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
