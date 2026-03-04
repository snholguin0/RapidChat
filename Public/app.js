let token = localStorage.getItem("rapidchat_token") || "";
let username = localStorage.getItem("rapidchat_user") || "";
let socket = null;
let currentRoom = "";

const authView = document.getElementById("authView");
const chatView = document.getElementById("chatView");

const signupForm = document.getElementById("signupForm");
const loginForm = document.getElementById("loginForm");
const signupMsg = document.getElementById("signupMsg");
const loginMsg = document.getElementById("loginMsg");

const who = document.getElementById("who");
const logoutBtn = document.getElementById("logoutBtn");

const roomInput = document.getElementById("roomInput");
const joinBtn = document.getElementById("joinBtn");
const leaveBtn = document.getElementById("leaveBtn");

const roomTitle = document.getElementById("roomTitle");
const members = document.getElementById("members");

const messages = document.getElementById("messages");
const msgForm = document.getElementById("msgForm");
const msgInput = document.getElementById("msgInput");
const chatMsg = document.getElementById("chatMsg");

function showAuth() {
  authView.classList.remove("hidden");
  chatView.classList.add("hidden");
}

function showChat() {
  authView.classList.add("hidden");
  chatView.classList.remove("hidden");
  who.textContent = username || "";
}

function setMsg(el, text) {
  el.textContent = text || "";
}

function fmtTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function addMessage({ kind, from, text, ts }) {
  const div = document.createElement("div");
  div.className = "bubble " + (kind === "system" ? "system" : "");

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = kind === "system"
    ? `${fmtTime(ts)} System`
    : `${fmtTime(ts)} ${from}`;

  const body = document.createElement("div");
  body.className = "text";
  body.textContent = text;

  div.appendChild(meta);
  div.appendChild(body);
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function clearChat() {
  messages.innerHTML = "";
  members.innerHTML = "";
  roomTitle.textContent = "No room joined";
  currentRoom = "";
}

async function api(path, opts = {}) {
  const headers = opts.headers || {};
  if (token) headers["x-session-token"] = token;
  if (opts.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";

  const res = await fetch(path, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function connectSocket() {
  socket = io({ auth: { token } });

  socket.on("connect", () => setMsg(chatMsg, ""));

  socket.on("connect_error", (err) => {
    setMsg(chatMsg, "Socket error: " + err.message);
  });

  socket.on("systemMessage", (m) => {
    if (m.roomName !== currentRoom) return;
    addMessage({ kind: "system", text: m.text, ts: m.ts });
  });

  socket.on("chatMessage", (m) => {
    if (m.roomName !== currentRoom) return;
    addMessage({ kind: "chat", from: m.from, text: m.text, ts: m.ts });
  });

  socket.on("roomMembers", (m) => {
    if (m.roomName !== currentRoom) return;
    members.innerHTML = "";
    m.members.forEach((name) => {
      const li = document.createElement("li");
      li.textContent = name;
      members.appendChild(li);
    });
  });
}

function joinRoom(name) {
  if (!name) return setMsg(chatMsg, "Enter a room name");
  if (currentRoom) socket.emit("leaveRoom", { roomName: currentRoom });

  currentRoom = name;
  roomTitle.textContent = "Room: " + currentRoom;
  messages.innerHTML = "";

  socket.emit("joinRoom", { roomName: currentRoom });
  setMsg(chatMsg, "");
}

function leaveRoom() {
  if (!currentRoom) return;
  socket.emit("leaveRoom", { roomName: currentRoom });
  clearChat();
}

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  setMsg(signupMsg, "");

  const u = document.getElementById("suUser").value.trim();
  const p = document.getElementById("suPass").value;

  if (!u || !p) return setMsg(signupMsg, "Enter username and password");

  try {
    await api("/api/signup", {
      method: "POST",
      body: JSON.stringify({ username: u, password: p })
    });
    setMsg(signupMsg, "Account created. Now login.");
  } catch (err) {
    setMsg(signupMsg, err.message);
  }
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  setMsg(loginMsg, "");

  const u = document.getElementById("liUser").value.trim();
  const p = document.getElementById("liPass").value;

  if (!u || !p) return setMsg(loginMsg, "Enter username and password");

  try {
    const data = await api("/api/login", {
      method: "POST",
      body: JSON.stringify({ username: u, password: p })
    });

    token = data.token;
    username = data.username;

    localStorage.setItem("rapidchat_token", token);
    localStorage.setItem("rapidchat_user", username);

    showChat();
    connectSocket();
  } catch (err) {
    setMsg(loginMsg, err.message);
  }
});

logoutBtn.addEventListener("click", async () => {
  try {
    await api("/api/logout", { method: "POST" });
  } catch {}

  if (socket) socket.disconnect();
  socket = null;

  token = "";
  username = "";
  localStorage.removeItem("rapidchat_token");
  localStorage.removeItem("rapidchat_user");

  clearChat();
  showAuth();
});

joinBtn.addEventListener("click", () => joinRoom(roomInput.value.trim()));
leaveBtn.addEventListener("click", () => leaveRoom());

msgForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!socket) return setMsg(chatMsg, "Not connected");
  if (!currentRoom) return setMsg(chatMsg, "Join a room first");

  const text = msgInput.value.trim();
  if (!text) return;

  socket.emit("sendMessage", { roomName: currentRoom, text });
  msgInput.value = "";
});

// Boot
(async function boot() {
  if (!token) return showAuth();

  try {
    const me = await api("/api/me");
    username = me.username;
    localStorage.setItem("rapidchat_user", username);

    showChat();
    connectSocket();
  } catch {
    token = "";
    localStorage.removeItem("rapidchat_token");
    localStorage.removeItem("rapidchat_user");
    showAuth();
  }
})();