const express = require('express');
const session = require('express-session');
const fs = require('fs');
const { nanoid } = require('nanoid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = './db.json';

// --- Admin Credentials ---
const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;

// --- Middleware ---
app.use(express.json());
app.use(express.static('public'));
app.use(session({
  secret: process.env.SESSION_SECRET, // use a secure key in production
  resave: false,
  saveUninitialized: true
}));

// --- Database Loading ---
let db = { polls: [] };
if (fs.existsSync(DB_FILE)) {
  db = JSON.parse(fs.readFileSync(DB_FILE));
}
function saveDB() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// --- Poll API ---
app.post('/api/polls', (req, res) => {
  const id = nanoid(6);
  const { title, description, dates } = req.body;
  const poll = { id, title, description, dates, votes: [] };
  db.polls.push(poll);
  saveDB();
  res.json({ id });
});

app.get('/api/polls/:id', (req, res) => {
  const poll = db.polls.find(p => p.id === req.params.id);
  if (!poll) return res.status(404).send('Poll not found');
  res.json(poll);
});

app.post('/api/polls/:id/vote', (req, res) => {
  const poll = db.polls.find(p => p.id === req.params.id);
  if (!poll) return res.status(404).send('Poll not found');
  const { voter, selectedDates } = req.body;
  poll.votes.push({ voter, selectedDates });
  saveDB();
  res.json({ success: true });
});

// --- Admin API ---
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.isAdmin = true;
    res.sendStatus(200);
  } else {
    res.status(401).send('Invalid credentials');
  }
});

app.get('/api/admin/session', (req, res) => {
  res.json({ loggedIn: !!req.session.isAdmin });
});

app.get('/api/admin/polls', (req, res) => {
  if (!req.session.isAdmin) {
    return res.status(403).send('Not authorized');
  }
  res.json(Object.values(db.polls));
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
