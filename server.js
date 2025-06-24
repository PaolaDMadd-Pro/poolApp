const express = require('express');
const fs = require('fs');
const { nanoid } = require('nanoid');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));

const DB_FILE = './db.json';
let db = { polls: [] };

if (fs.existsSync(DB_FILE)) {
  db = JSON.parse(fs.readFileSync(DB_FILE));
}

function saveDB() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

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

app.get('/api/admin/polls', (req, res) => {
  res.json(Object.values(db.polls));
});

app.post('/api/polls/:id/vote', (req, res) => {
  const poll = db.polls.find(p => p.id === req.params.id);
  if (!poll) return res.status(404).send('Poll not found');
  const { voter, selectedDates } = req.body;
  poll.votes.push({ voter, selectedDates });
  saveDB();
  res.json({ success: true });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
