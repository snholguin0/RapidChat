require("dotenv").config();

const express = require("express");
const bcrypt = require("bcryptjs");
const http = require("http");
const path = require("path");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || `http://localhost:${PORT}`;
const MONGODB_URI = process.env.MONGODB_URI;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// If you later split frontend/backend domains, keep this.
// For local same-origin it won’t hurt.
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", CLIENT_ORIGIN);
  res.header("Access-Control-Allow-Headers", "Content-Type, x-session-token");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

const io = new Server(server, {
  cors: { origin: CLIENT_ORIGIN, methods: ["GET", "POST"] }
});

// ---------- Mongo Models ----------
const userSchema = new mongoose.Schema(
  {
    username: { type: String, unique: true, required: true, trim: true },
    passwordHash: { type: String, required: true }
  },
  { timestamps: true }
);

const sessionSchema = new mongoose.Schema(
  {
    token: { type: String, unique: true, required: true },
    username: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: "7d" } // auto delete after 7 days
  },
  { timestamps: false }
);

const User = mongoose.model("User", userSchema);
const Session = mongoose.model("Session", sessionSchema);

// ---------- Helpers ----------
function makeToken() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function auth(req, res, next) {
  const token = req.header("x-session-token");
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  const session = await Session.findOne({ token });
  if (!session) return res.status(401).json({ error: "Not authenticated" });

  req.username = session.username;
  next();
}

// ---------- Routes ----------
app.post("/api/signup", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: "Missing fields" });

    const exists = await User.findOne({ username });
    if (exists) return res.status(409).json({ error: "Username already exists" });

    const passwordHash = await bcrypt.hash(password, 10);
    await User.create({ username, passwordHash });

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: "Signup failed" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: "Missing fields" });

    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: "Invalid username or password" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid username or password" });

    const token = makeToken();
    await Session.create({ token, username });

    return res.json({ ok: true, token, username });
  } catch (err) {
    return res.status(500).json({ error: "Login failed" });
  }
});

app.post("/api/logout", auth, async (req, res) => {
  const token = req.header("x-session-token");
  await Session.deleteOne({ token });
  return res.json({ ok: true });
});

app.get("/api/me", auth, (req, res) => {
  return res.json({ ok: true, username: req.username });
});

// ---------- Socket.io ----------
const roomMembers = new Map(); // roomName -> Set(username)

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("unauthorized"));

    const session = await Session.findOne({ token });
    if (!session) return next(new Error("unauthorized"));

    socket.username = session.username;
    next();
  } catch {
    next(new Error("unauthorized"));
  }
});

io.on("connection", (socket) => {
  const username = socket.username;

  socket.on("joinRoom", ({ roomName }) => {
    if (!roomName) return;

    socket.join(roomName);

    if (!roomMembers.has(roomName)) roomMembers.set(roomName, new Set());
    roomMembers.get(roomName).add(username);

    io.to(roomName).emit("systemMessage", { roomName, text: `${username} joined`, ts: Date.now() });
    io.to(roomName).emit("roomMembers", {
      roomName,
      members: Array.from(roomMembers.get(roomName))
    });
  });

  socket.on("leaveRoom", ({ roomName }) => {
    if (!roomName) return;

    socket.leave(roomName);

    const set = roomMembers.get(roomName);
    if (set) {
      set.delete(username);
      if (set.size === 0) roomMembers.delete(roomName);
    }

    io.to(roomName).emit("systemMessage", { roomName, text: `${username} left`, ts: Date.now() });
    io.to(roomName).emit("roomMembers", {
      roomName,
      members: roomMembers.get(roomName) ? Array.from(roomMembers.get(roomName)) : []
    });
  });

  socket.on("sendMessage", ({ roomName, text }) => {
    if (!roomName || !text) return;
    io.to(roomName).emit("chatMessage", {
      roomName,
      from: username,
      text: String(text).slice(0, 2000),
      ts: Date.now()
    });
  });

  socket.on("disconnecting", () => {
    for (const roomName of socket.rooms) {
      if (roomName === socket.id) continue;

      const set = roomMembers.get(roomName);
      if (!set) continue;

      set.delete(username);
      if (set.size === 0) roomMembers.delete(roomName);

      io.to(roomName).emit("systemMessage", { roomName, text: `${username} disconnected`, ts: Date.now() });
      io.to(roomName).emit("roomMembers", {
        roomName,
        members: roomMembers.get(roomName) ? Array.from(roomMembers.get(roomName)) : []
      });
    }
  });
});

// ---------- Start ----------
(async () => {
  if (!MONGODB_URI) {
    console.log("Missing MONGODB_URI in .env");
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log("MongoDB connected");

    server.listen(PORT, () => {
      console.log(`RapidChat running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Mongo connect failed:", err.message);
    process.exit(1);
  }
})();