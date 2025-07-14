// Get vote counts per date for a poll (with poll title)
app.get('/api/polls/:id/date-votes', async (req, res) => {
  try {
    const pollId = req.params.id;
    const query = `
      SELECT
        p.title AS poll_title,
        unnest(v.selected_dates) AS date,
        COUNT(*) AS vote_count
      FROM votes v
      JOIN polls p ON v.poll_id = p.id
      WHERE v.poll_id = $1
      GROUP BY p.title, date
      ORDER BY vote_count DESC;
    `;
    const result = await pool.query(query, [pollId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching date vote counts:', err);
    res.status(500).send('Error fetching date vote counts');
  }
});
const express = require('express');
const session = require('express-session');
const fs = require('fs');
const { nanoid } = require('nanoid');
require('dotenv').config();

// --- PostgreSQL (Supabase) Connection ---
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl: { rejectUnauthorized: false } // Required for Supabase
});

// Test the connection on startup
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Database connected:', res.rows[0]);
  }
});

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
// Delete poll by ID (admin only)
app.delete('/api/polls/:id', (req, res) => {
  if (!req.session.isAdmin) {
    return res.status(403).send('Not authorized');
  }
  const pollIndex = db.polls.findIndex(p => p.id === req.params.id);
  if (pollIndex === -1) return res.status(404).send('Poll not found');
  db.polls.splice(pollIndex, 1);
  saveDB();
  res.json({ success: true });
});

// Create a new poll (PostgreSQL)
app.post('/api/polls', async (req, res) => {
  const id = nanoid(6);
  const { title, description, dates } = req.body;
  try {
    await pool.query(
      'INSERT INTO polls (id, title, description, dates) VALUES ($1, $2, $3, $4)',
      [id, title, description, dates]
    );
    res.json({ id });
  } catch (err) {
    console.error('Error creating poll:', err);
    res.status(500).send('Error creating poll');
  }
});


// Get a poll and its votes (PostgreSQL)
app.get('/api/polls/:id', async (req, res) => {
  try {
    const pollResult = await pool.query('SELECT * FROM polls WHERE id = $1', [req.params.id]);
    if (pollResult.rows.length === 0) return res.status(404).send('Poll not found');
    const poll = pollResult.rows[0];

    const votesResult = await pool.query('SELECT voter, selected_dates FROM votes WHERE poll_id = $1', [req.params.id]);
    poll.votes = votesResult.rows;

    res.json(poll);
  } catch (err) {
    console.error('Error fetching poll:', err);
    res.status(500).send('Error fetching poll');
  }
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
