import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import OpenAI from 'openai';

const app = express();
const port = process.env.PORT || 5000;
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map(s => s.trim()).filter(Boolean);

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin(origin, done) {
  if (!origin || allowedOrigins.includes(origin) || (process.env.NODE_ENV !== 'production' && /^http:\/\/localhost:\d+$/.test(origin))) return done(null, true);
  return done(new Error('Origin not allowed by CORS'));
}}));
app.use(express.json({ limit: '30kb' }));
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, limit: 180, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use('/api/auth/', rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false }));

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  passwordHash: { type: String, required: true },
  preferences: { theme: { type: String, default: 'light' }, accent: { type: String, default: '#64856d' }, font: { type: String, default: 'Inter' }, fontSize: { type: Number, default: 16 } }
}, { timestamps: true });
const taskSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 180 },
  notes: { type: String, maxlength: 2000, default: '' },
  dueDate: { type: String, default: '' },
  priority: { type: String, enum: ['low','medium','high'], default: 'medium' },
  category: { type: String, maxlength: 50, default: 'Personal' },
  recurring: { type: String, enum: ['none','daily','weekly'], default: 'none' },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date, default: null }
}, { timestamps: true });
const activitySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 180 },
  date: { type: String, required: true },
  minutes: { type: Number, min: 0, max: 1440, default: 0 },
  notes: { type: String, maxlength: 2000, default: '' }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Task = mongoose.model('Task', taskSchema);
const Activity = mongoose.model('Activity', activitySchema);
const safeUser = user => ({ id: user._id, name: user.name, email: user.email, preferences: user.preferences || {} });
const makeToken = user => jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' });

function requireAuth(req, res, next) {
  const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : '';
  if (!token) return res.status(401).json({ message: 'Please sign in to continue.' });
  try { req.userId = jwt.verify(token, process.env.JWT_SECRET).sub; next(); }
  catch { return res.status(401).json({ message: 'Your session has expired. Please sign in again.' }); }
}
const asyncRoute = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'Daylight API' }));

app.post('/api/auth/register', asyncRoute(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (name.length < 2 || name.length > 80) return res.status(400).json({ message: 'Name must be between 2 and 80 characters.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return res.status(400).json({ message: 'Enter a valid email address.' });
  if (password.length < 8 || password.length > 128) return res.status(400).json({ message: 'Password must be at least 8 characters.' });
  if (await User.exists({ email })) return res.status(409).json({ message: 'An account with this email already exists.' });
  const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12) });
  res.status(201).json({ token: makeToken(user), user: safeUser(user) });
}));

app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const user = await User.findOne({ email });
  if (!user || !await bcrypt.compare(String(req.body.password || ''), user.passwordHash)) return res.status(401).json({ message: 'Email or password is incorrect.' });
  res.json({ token: makeToken(user), user: safeUser(user) });
}));

app.get('/api/auth/me', requireAuth, asyncRoute(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(401).json({ message: 'Account not found.' });
  res.json({ user: safeUser(user) });
}));

app.patch('/api/auth/preferences', requireAuth, asyncRoute(async (req, res) => {
  const update = {};
  if (['light','dark','system'].includes(req.body.theme)) update['preferences.theme'] = req.body.theme;
  if (typeof req.body.accent === 'string' && /^#[0-9a-fA-F]{6}$/.test(req.body.accent)) update['preferences.accent'] = req.body.accent;
  if (['Inter','Georgia','Arial','Verdana','system-ui'].includes(req.body.font)) update['preferences.font'] = req.body.font;
  if ([14,15,16,17,18,20].includes(Number(req.body.fontSize))) update['preferences.fontSize'] = Number(req.body.fontSize);
  const user = await User.findByIdAndUpdate(req.userId, { $set: update }, { new: true });
  res.json({ user: safeUser(user) });
}));

app.delete('/api/auth/account', requireAuth, asyncRoute(async (req, res) => {
  await Promise.all([Task.deleteMany({ user: req.userId }), Activity.deleteMany({ user: req.userId }), User.findByIdAndDelete(req.userId)]);
  res.json({ message: 'Account and associated data deleted.' });
}));

app.get('/api/tasks', requireAuth, asyncRoute(async (req, res) => {
  const tasks = await Task.find({ user: req.userId }).sort({ completed: 1, dueDate: 1, createdAt: -1 }).limit(500);
  res.json({ tasks });
}));
app.post('/api/tasks', requireAuth, asyncRoute(async (req, res) => {
  const title = String(req.body.title || '').trim();
  if (!title || title.length > 180) return res.status(400).json({ message: 'Task title is required (max 180 characters).' });
  const task = await Task.create({ user: req.userId, title, notes: String(req.body.notes || '').slice(0,2000), dueDate: /^\d{4}-\d{2}-\d{2}$/.test(req.body.dueDate || '') ? req.body.dueDate : '', priority: ['low','medium','high'].includes(req.body.priority) ? req.body.priority : 'medium', category: String(req.body.category || 'Personal').slice(0,50), recurring: ['none','daily','weekly'].includes(req.body.recurring) ? req.body.recurring : 'none' });
  res.status(201).json({ task });
}));
app.patch('/api/tasks/:id', requireAuth, asyncRoute(async (req, res) => {
  const allowed = {};
  for (const key of ['title','notes','dueDate','priority','category','completed','recurring']) if (key in req.body) allowed[key] = req.body[key];
  if ('title' in allowed) allowed.title = String(allowed.title).trim().slice(0,180);
  if ('completed' in allowed) allowed.completedAt = allowed.completed ? new Date() : null;
  const task = await Task.findOneAndUpdate({ _id: req.params.id, user: req.userId }, { $set: allowed }, { new: true, runValidators: true });
  if (!task) return res.status(404).json({ message: 'Task not found.' });
  res.json({ task });
}));
app.delete('/api/tasks/:id', requireAuth, asyncRoute(async (req, res) => {
  const result = await Task.deleteOne({ _id: req.params.id, user: req.userId });
  if (!result.deletedCount) return res.status(404).json({ message: 'Task not found.' });
  res.json({ ok: true });
}));

app.get('/api/activities', requireAuth, asyncRoute(async (req, res) => {
  res.json({ activities: await Activity.find({ user: req.userId }).sort({ date: -1, createdAt: -1 }).limit(500) });
}));
app.post('/api/activities', requireAuth, asyncRoute(async (req, res) => {
  const title = String(req.body.title || '').trim(), date = String(req.body.date || '');
  if (!title || title.length > 180 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ message: 'Activity title and a valid date are required.' });
  const minutes = Math.min(1440, Math.max(0, Number(req.body.minutes) || 0));
  const activity = await Activity.create({ user: req.userId, title, date, minutes, notes: String(req.body.notes || '').slice(0,2000) });
  res.status(201).json({ activity });
}));
app.delete('/api/activities/:id', requireAuth, asyncRoute(async (req, res) => {
  const result = await Activity.deleteOne({ _id: req.params.id, user: req.userId });
  if (!result.deletedCount) return res.status(404).json({ message: 'Activity not found.' });
  res.json({ ok: true });
}));

app.post('/api/coach', requireAuth, asyncRoute(async (req, res) => {
  const message = String(req.body.message || '').trim().slice(0,2000);
  if (!message) return res.status(400).json({ message: 'Write a message first.' });
  if (!process.env.OPENAI_API_KEY) return res.json({ reply: 'Your AI coach is almost ready. Add OPENAI_API_KEY in the Render environment settings to enable live AI responses.' });
  let context = '';
  const sources = [];
  if (req.body.searchWeb && process.env.TAVILY_API_KEY) {
    const response = await fetch('https://api.tavily.com/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ api_key: process.env.TAVILY_API_KEY, query: message, search_depth: 'basic', max_results: 5, include_answer: false }) });
    if (response.ok) {
      const data = await response.json();
      for (const result of data.results || []) sources.push({ title: result.title, url: result.url, content: String(result.content || '').slice(0,700) });
      context = sources.map((s,i) => '[' + (i+1) + '] ' + s.title + ' — ' + s.content + ' (' + s.url + ')').join('\n');
    }
  }
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
    messages: [
      { role: 'system', content: 'You are Daylight, a practical, kind productivity coach. Give clear, realistic advice, help the user choose their next action, and never shame them. If web research is provided, distinguish sourced facts from your own suggestions and cite source URLs in your response.\n' + (context ? 'Web research results:\n' + context : '') },
      { role: 'user', content: message }
    ],
    max_tokens: 700
  });
  res.json({ reply: completion.choices[0]?.message?.content || 'I could not form a response. Please try again.', sources });
}));

app.use((err, _req, res, _next) => {
  console.error(err);
  if (res.headersSent) return;
  const status = err.status || 500;
  res.status(status).json({ message: process.env.NODE_ENV === 'production' ? (status < 500 ? err.message : 'Something went wrong. Please try again.') : (err.message || 'Server error') });
});

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must be set to a random string of at least 32 characters.');
  process.exit(1);
}
mongoose.connect(process.env.MONGODB_URI).then(() => app.listen(port, () => console.log('Daylight API listening on ' + port))).catch(err => {
  console.error('MongoDB connection failed:', err.message);
  process.exit(1);
});
