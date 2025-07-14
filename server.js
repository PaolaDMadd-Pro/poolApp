
// --- TESTS (placeholder) ---
// TODO: Add unit/integration tests for database-backed endpoints (e.g., poll creation, retrieval)
// Get vote counts per date for a poll (with poll title)

// --- Variable Declarations ---
const express = require('express');
const session = require('express-session');
const fs = require('fs');
require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl: { rejectUnauthorized: false } // Required for Supabase
});
const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = './db.json';
const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;
let db = { polls: [] };

// --- End Variable Declarations ---

// Test the connection on startup
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Database connected:', res.rows[0]);
  }
});


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

// --- Middleware ---
app.use(express.json());
app.use(express.static('public'));
app.use(session({
  secret: process.env.SESSION_SECRET, // use a secure key in production
  resave: false,
  saveUninitialized: true
}));

// --- Database Loading ---
if (fs.existsSync(DB_FILE)) {
  db = JSON.parse(fs.readFileSync(DB_FILE));
}
function saveDB() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// --- Poll API ---
// Delete poll by ID (admin only)
app.delete('/api/polls/:id', async (req, res) => {
  if (!req.session.isAdmin) {
    return res.status(403).send('Not authorized');
  }
  try {
    const result = await pool.query('DELETE FROM polls WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).send('Poll not found');
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting poll:', err);
    res.status(500).send('Error deleting poll');
  }
});

// Create a new poll (PostgreSQL)
app.post('/api/polls', async (req, res) => {
  const { title, description, dates } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO polls (title, description, dates) VALUES ($1, $2, $3) RETURNING id',
      [title, description, dates]
    );
    res.json({ id: result.rows[0].id });
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

app.post('/api/polls/:id/vote', async (req, res) => {
  const pollId = req.params.id;
  const { voter, selectedDates } = req.body;
  try {
    // Check poll exists
    const pollResult = await pool.query('SELECT id FROM polls WHERE id = $1', [pollId]);
    if (pollResult.rowCount === 0) return res.status(404).send('Poll not found');
    await pool.query(
      'INSERT INTO votes (poll_id, voter, selected_dates) VALUES ($1, $2, $3)',
      [pollId, voter, selectedDates]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error submitting vote:', err);
    res.status(500).send('Error submitting vote');
  }
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

app.get('/api/admin/polls', async (req, res) => {
  if (!req.session.isAdmin) {
    return res.status(403).send('Not authorized');
  }
  try {
    const pollsResult = await pool.query('SELECT * FROM polls ORDER BY created_at DESC');
    // For each poll, fetch votes
    const polls = await Promise.all(pollsResult.rows.map(async poll => {
      const votesResult = await pool.query('SELECT voter, selected_dates FROM votes WHERE poll_id = $1', [poll.id]);
      return { ...poll, votes: votesResult.rows };
    }));
    res.json(polls);
  } catch (err) {
    console.error('Error fetching admin polls:', err);
    res.status(500).send('Error fetching admin polls');
  }
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
