const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const DB_PATH = path.join(__dirname, 'db.json');

function readDB() {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return { teachers: [], events: [] };
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

const app = express();
app.use(cors());
app.use(express.json());

// Simple header-based auth: client sends x-user-role: Administrator or Teacher
function requireAdmin(req, res, next) {
  const role = (req.get('x-user-role') || '').toLowerCase();
  if (role === 'administrator' || role === 'admin') return next();
  return res.status(403).json({ error: 'Forbidden: admin only' });
}

// Teachers endpoints
app.get('/api/teachers', (req, res) => {
  const db = readDB();
  res.json(db.teachers);
});

app.post('/api/teachers', (req, res) => {
  const db = readDB();
  const t = req.body;
  t.id = Date.now();
  db.teachers.push(t);
  writeDB(db);
  res.status(201).json(t);
});

app.put('/api/teachers/:id', (req, res) => {
  const id = Number(req.params.id);
  const db = readDB();
  const idx = db.teachers.findIndex((x) => x.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  db.teachers[idx] = { ...db.teachers[idx], ...req.body };
  writeDB(db);
  res.json(db.teachers[idx]);
});

app.delete('/api/teachers/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const db = readDB();
  db.teachers = db.teachers.filter((x) => x.id !== id);
  writeDB(db);
  res.json({ success: true });
});

// Events endpoints
app.get('/api/events', (req, res) => {
  const db = readDB();
  res.json(db.events);
});

app.post('/api/events', (req, res) => {
  const db = readDB();
  const e = req.body;
  e.id = Date.now();
  db.events.push(e);
  writeDB(db);
  res.status(201).json(e);
});

app.put('/api/events/:id', (req, res) => {
  const id = Number(req.params.id);
  const db = readDB();
  const idx = db.events.findIndex((x) => x.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  db.events[idx] = { ...db.events[idx], ...req.body };
  writeDB(db);
  res.json(db.events[idx]);
});

// Admin-only delete event
app.delete('/api/events/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const db = readDB();
  const before = db.events.length;
  db.events = db.events.filter((x) => x.id !== id);
  writeDB(db);
  res.json({ success: true, removed: before - db.events.length });
});

// simple health
app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`PD backend listening on ${PORT}`));
