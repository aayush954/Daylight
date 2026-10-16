import { useEffect, useMemo, useState } from 'react';
import { Sun, LayoutDashboard, CheckSquare, CalendarDays, ChartNoAxesCombined, Sparkles, Settings, Search, Plus, ChevronRight, Clock3, Circle, CheckCircle2, Flame, ArrowUpRight, Menu, X, Send, Trash2, LogOut, Palette, Type, Moon, SunMedium, BookOpen, ListTodo, ExternalLink } from 'lucide-react';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const today = () => new Date().toISOString().slice(0, 10);
const longDate = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' });
const dateShort = value => value ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(value + 'T12:00:00')) : '';
const demoTasks = [
  { _id: 'demo1', title: 'Plan my priorities for today', priority: 'high', category: 'Personal', dueDate: today(), completed: true },
  { _id: 'demo2', title: 'Focus session — deep work', priority: 'high', category: 'Work', dueDate: today(), completed: false },
  { _id: 'demo3', title: 'Move my body for 30 minutes', priority: 'medium', category: 'Health', dueDate: today(), completed: false },
  { _id: 'demo4', title: 'Read or learn something new', priority: 'low', category: 'Growth', dueDate: today(), completed: false }
];
async function api(path, options = {}, token = '') {
  const response = await fetch(API + path, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Something went wrong. Please try again.');
  return data;
}
const initialPreferences = { theme: 'light', accent: '#64856d', font: 'Inter', fontSize: 16 };

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('daylight_token') || '');
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('register');
  const [auth, setAuth] = useState({ name: '', email: '', password: '' });
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');
  const [page, setPage] = useState('Overview');
  const [tasks, setTasks] = useState(demoTasks);
  const [activities, setActivities] = useState([]);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [draft, setDraft] = useState({ title: '', dueDate: today(), priority: 'medium', category: 'Personal', notes: '' });
  const [activityDraft, setActivityDraft] = useState({ title: '', date: today(), minutes: 30, notes: '' });
  const [toast, setToast] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  const [preferences, setPreferences] = useState(initialPreferences);
  const [messages, setMessages] = useState([{ role: 'assistant', content: 'Hi there! I’m your Daylight coach. Tell me what’s on your mind, and we’ll find a thoughtful next step together.' }]);
  const [chatInput, setChatInput] = useState('');
  const [webSearch, setWebSearch] = useState(true);
  const [chatBusy, setChatBusy] = useState(false);
  const demo = !user;

  useEffect(() => {
    if (!token) { setUser(null); return; }
    api('/auth/me', {}, token).then(({ user: current }) => {
      setUser(current); setPreferences({ ...initialPreferences, ...(current.preferences || {}) });
      return Promise.all([api('/tasks', {}, token), api('/activities', {}, token)]);
    }).then(([t, a]) => { setTasks(t.tasks); setActivities(a.activities); }).catch(() => {
      localStorage.removeItem('daylight_token'); setToken(''); setToast('Your session expired. Please sign in again.');
    });
  }, [token]);
  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : preferences.theme;
    document.documentElement.style.setProperty('--accent', preferences.accent);
    document.documentElement.style.setProperty('--font-family', preferences.font === 'system-ui' ? 'system-ui, sans-serif' : preferences.font);
    document.documentElement.style.setProperty('--font-size', preferences.fontSize + 'px');
  }, [preferences]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 3200); return () => clearTimeout(timer); }, [toast]);

  const done = tasks.filter(t => t.completed).length;
  const progress = tasks.length ? Math.round(done / tasks.length * 100) : 0;
  const todays = tasks.filter(t => !t.dueDate || t.dueDate === today());
  const upcoming = tasks.filter(t => !t.completed && t.dueDate > today()).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 4);
  const filteredTasks = useMemo(() => tasks.filter(t => {
    const ok = filter === 'All' || (filter === 'Completed' ? t.completed : filter === 'Open' ? !t.completed : t.priority === filter.toLowerCase());
    return ok && t.title.toLowerCase().includes(search.toLowerCase());
  }), [tasks, filter, search]);
  const nav = [{ label: 'Overview', icon: LayoutDashboard }, { label: 'My tasks', icon: CheckSquare }, { label: 'Activity journal', icon: CalendarDays }, { label: 'Progress', icon: ChartNoAxesCombined }, { label: 'AI coach', icon: Sparkles }, { label: 'Preferences', icon: Settings }];

  async function authenticate(e) {
    e.preventDefault(); setAuthError(''); setAuthBusy(true);
    try {
      const data = await api('/auth/' + authMode, { method: 'POST', body: JSON.stringify(auth) });
      localStorage.setItem('daylight_token', data.token); setUser(data.user); setToken(data.token);
      setToast(authMode === 'register' ? 'Your workspace is ready. Welcome to Daylight!' : 'Welcome back.');
    } catch (err) { setAuthError(err.message); } finally { setAuthBusy(false); }
  }
  function signOut() { localStorage.removeItem('daylight_token'); setToken(''); setUser(null); setTasks(demoTasks); setActivities([]); setPage('Overview'); }
  async function addTask(e) {
    e.preventDefault(); if (!draft.title.trim()) return;
    try {
      const task = demo ? { ...draft, _id: crypto.randomUUID(), completed: false } : (await api('/tasks', { method: 'POST', body: JSON.stringify(draft) }, token)).task;
      setTasks(current => [task, ...current]); setDraft({ title: '', dueDate: today(), priority: 'medium', category: 'Personal', notes: '' }); setShowTaskForm(false); setToast('Task added to your plan.');
    } catch (err) { setToast(err.message); }
  }
  async function toggleTask(task) {
    try {
      const changes = { completed: !task.completed };
      const updated = demo ? { ...task, ...changes, completedAt: changes.completed ? new Date().toISOString() : null } : (await api('/tasks/' + task._id, { method: 'PATCH', body: JSON.stringify(changes) }, token)).task;
      setTasks(current => current.map(t => t._id === task._id ? updated : t));
    } catch (err) { setToast(err.message); }
  }
  async function removeTask(id) {
    try { if (!demo) await api('/tasks/' + id, { method: 'DELETE' }, token); setTasks(current => current.filter(t => t._id !== id)); setToast('Task removed.'); }
    catch (err) { setToast(err.message); }
  }
  async function addActivity(e) {
    e.preventDefault(); if (!activityDraft.title.trim()) return;
    try {
      const activity = demo ? { ...activityDraft, _id: crypto.randomUUID() } : (await api('/activities', { method: 'POST', body: JSON.stringify(activityDraft) }, token)).activity;
      setActivities(current => [activity, ...current]); setActivityDraft({ title: '', date: today(), minutes: 30, notes: '' }); setToast('Activity recorded.');
    } catch (err) { setToast(err.message); }
  }
  async function removeActivity(id) {
    try { if (!demo) await api('/activities/' + id, { method: 'DELETE' }, token); setActivities(current => current.filter(a => a._id !== id)); }
    catch (err) { setToast(err.message); }
  }
  async function sendChat(e, suggestion) {
    e?.preventDefault(); const text = (suggestion || chatInput).trim(); if (!text || chatBusy) return;
    const next = [...messages, { role: 'user', content: text }]; setMessages(next); setChatInput(''); setChatBusy(true);
    try {
      const data = demo
        ? { reply: 'Here’s a gentle place to start: choose the task that would make the biggest difference, break it into a step you can finish in 25 minutes, and begin there. Create an account and configure the AI service to unlock personalized coaching and live web research.' }
        : await api('/coach', { method: 'POST', body: JSON.stringify({ message: text, searchWeb }) }, token);
      setMessages([...next, { role: 'assistant', content: data.reply, sources: data.sources || [] }]);
    } catch (err) { setMessages([...next, { role: 'assistant', content: err.message }]); }
    finally { setChatBusy(false); }
  }
  async function savePreferences(next) {
    setPreferences(next);
    if (!demo) try { await api('/auth/preferences', { method: 'PATCH', body: JSON.stringify(next) }, token); } catch (err) { setToast(err.message); }
  }

  if (!token || !user) return <AuthScreen auth={auth} setAuth={setAuth} mode={authMode} setMode={setAuthMode} submit={authenticate} busy={authBusy} error={authError} explore={() => { setToken('preview'); setUser({ name: 'Guest' }); setTasks(demoTasks); }} />;

  return <div className="app-shell">
    {mobileNav && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
    <aside className={'sidebar ' + (mobileNav ? 'sidebar-open' : '')}>
      <div className="brand"><span className="brand-mark"><Sun size={23}/></span><span>daylight<span className="brand-period">.</span></span><button className="icon-button sidebar-close" onClick={() => setMobileNav(false)} aria-label="Close menu"><X size={18}/></button></div>
      <div className="workspace-label">YOUR WORKSPACE</div>
      <nav className="side-nav">{nav.map(item => <button key={item.label} className={'nav-item ' + (page === item.label ? 'active' : '')} onClick={() => { setPage(item.label); setMobileNav(false); }}><item.icon size={18}/><span>{item.label}</span>{item.label === 'AI coach' && <Sparkles size={13} className="nav-sparkle"/>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-note"><Sparkles size={17}/><div><strong>A little progress</strong><p>is still progress.</p></div></div><div className="profile-row"><div className="avatar">{(user.name || 'G')[0].toUpperCase()}</div><div className="profile-copy"><strong>{user.name || 'Guest'}</strong><span>{user.email || 'Preview workspace'}</span></div><button className="icon-button" onClick={signOut} title="Sign out"><LogOut size={16}/></button></div></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><button className="icon-button mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open menu"><Menu size={20}/></button><div className="breadcrumbs"><span>Workspace</span><ChevronRight size={14}/><strong>{page}</strong></div><div className="topbar-right"><div className="date-chip"><span className="date-dot"/>{longDate.format(new Date())}</div><div className="avatar top-avatar">{(user.name || 'G')[0].toUpperCase()}</div></div></header>
      {demo && <div className="demo-banner"><Sparkles size={16}/><span><strong>Preview mode.</strong> Create an account to save your own data.</span><button onClick={signOut}>Create account <ArrowUpRight size={14}/></button></div>}
      <div className="page-content">
        {page === 'Overview' && <Overview tasks={tasks} todayTasks={todays} upcoming={upcoming} progress={progress} done={done} activities={activities} setPage={setPage} toggleTask={toggleTask} setShowTaskForm={setShowTaskForm}/>}
        {page === 'My tasks' && <TasksPage tasks={filteredTasks} filter={filter} setFilter={setFilter} search={search} setSearch={setSearch} toggleTask={toggleTask} removeTask={removeTask} setShowTaskForm={setShowTaskForm}/>}
        {page === 'Activity journal' && <ActivityPage activities={activities} draft={activityDraft} setDraft={setActivityDraft} addActivity={addActivity} removeActivity={removeActivity}/>}
        {page === 'Progress' && <ProgressPage tasks={tasks} activities={activities} progress={progress} done={done}/>}
        {page === 'AI coach' && <CoachPage messages={messages} input={chatInput} setInput={setChatInput} send={sendChat} busy={chatBusy} webSearch={webSearch} setWebSearch={setWebSearch}/>}
        {page === 'Preferences' && <PreferencesPage preferences={preferences} save={savePreferences}/>}
      </div>
      <footer className="page-footer"><span>Made for a more intentional day <Sun size={13}/></span><span>DAYLIGHT · ONE STEP AT A TIME</span></footer>
    </main>
    {showTaskForm && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setShowTaskForm(false); }}><form className="modal-card" onSubmit={addTask}><div className="modal-heading"><div><span className="eyebrow">MAKE IT HAPPEN</span><h2>Add a task</h2></div><button type="button" className="icon-button" onClick={() => setShowTaskForm(false)}><X size={19}/></button></div><label>Task name<input autoFocus maxLength="180" placeholder="What would you like to get done?" value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} required/></label><div className="form-grid"><label>Due date<input type="date" value={draft.dueDate} onChange={e => setDraft({ ...draft, dueDate: e.target.value })}/></label><label>Priority<select value={draft.priority} onChange={e => setDraft({ ...draft, priority: e.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label></div><label>Category<select value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })}>{['Personal','Work','Health','Growth','Study','Other'].map(c => <option key={c}>{c}</option>)}</select></label><label>Notes (optional)<textarea rows="3" value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} placeholder="Add a little context..."/></label><button className="primary-button full-button"><Plus size={17}/> Add to my plan</button></form></div>}
    {toast && <div className="toast" role="status">{toast}</div>}
  </div>;
}

function AuthScreen({ auth, setAuth, mode, setMode, submit, busy, error, explore }) {
  return <div className="auth-layout"><section className="auth-story"><div className="auth-brand"><span className="brand-mark"><Sun size={23}/></span><span>daylight<span className="brand-period">.</span></span></div><div className="story-content"><span className="eyebrow light-eyebrow">A SPACE TO FIND YOUR FOCUS</span><h1>Your days,<br/><em>with intention.</em></h1><p>A calmer way to plan what matters, celebrate your progress, and make room for the life you're building.</p><div className="story-points"><span><CheckCircle2 size={17}/> Your tasks, in one thoughtful place</span><span><ChartNoAxesCombined size={17}/> Progress you can actually see</span><span><Sparkles size={17}/> A little help when you need direction</span></div></div><div className="story-foot">SMALL STEPS. MEANINGFUL DAYS.</div></section><section className="auth-panel"><div className="auth-form-wrap"><div className="mobile-auth-brand"><span className="brand-mark"><Sun size={22}/></span><span>daylight<span className="brand-period">.</span></span></div><span className="eyebrow">{mode === 'register' ? 'YOUR NEXT CHAPTER STARTS HERE' : 'GOOD TO HAVE YOU BACK'}</span><h2>{mode === 'register' ? 'Create your space' : 'Welcome back'}</h2><p className="muted">{mode === 'register' ? 'A more intentional day is just a few steps away.' : 'Pick up where you left off.'}</p><form className="auth-form" onSubmit={submit}>{mode === 'register' && <label>Your name<input autoComplete="name" value={auth.name} onChange={e => setAuth({ ...auth, name: e.target.value })} placeholder="How should we call you?" minLength="2" maxLength="80" required/></label>}<label>Email address<input type="email" autoComplete="email" value={auth.email} onChange={e => setAuth({ ...auth, email: e.target.value })} placeholder="you@example.com" required/></label><label>Password<input type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={auth.password} onChange={e => setAuth({ ...auth, password: e.target.value })} placeholder="At least 8 characters" minLength="8" required/></label>{error && <div className="form-error">{error}</div>}<button className="primary-button full-button" disabled={busy}>{busy ? 'One moment…' : mode === 'register' ? 'Create my workspace' : 'Sign in'} <ArrowUpRight size={17}/></button></form><div className="auth-switch">{mode === 'register' ? 'Already have a space?' : 'New to Daylight?'} <button onClick={() => setMode(mode === 'register' ? 'login' : 'register')}>{mode === 'register' ? 'Sign in' : 'Create an account'}</button></div><button className="preview-link" onClick={explore}>Explore the preview <ArrowUpRight size={14}/></button><div className="auth-privacy"><BookOpen size={14}/> Your space is personal. Your progress belongs to you.</div></div><div className="auth-panel-footer">DAYLIGHT · MAKE TODAY COUNT</div></section></div>;
}
function Heading({ eyebrow, title, subtitle, action, onAction }) { return <div className="section-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{action && <button className="secondary-button" onClick={onAction}>{action}</button>}</div>; }
function Stat({ label, value, detail, icon: Icon, trend }) { return <div className="stat-card"><div className="stat-top"><span>{label}</span><span className="stat-icon"><Icon size={18}/></span></div><div className="stat-value">{value}</div><div className="stat-detail">{detail}</div><div className="stat-trend"><span className="trend-dot"/>{trend}</div></div>; }
function TaskRow({ task, toggle, remove }) { return <div className={'task-row ' + (task.completed ? 'task-done' : '')}><button className="task-check" aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'} onClick={() => toggle(task)}>{task.completed ? <CheckCircle2 size={20}/> : <Circle size={20}/>}</button><div className="task-main"><strong>{task.title}</strong><div className="task-meta"><span className={'priority priority-' + (task.priority || 'medium')}>{task.priority || 'medium'} priority</span><span className="category-label">{task.category || 'Personal'}</span></div></div>{task.dueDate && <span className="task-due">{task.dueDate === today() ? 'Today' : dateShort(task.dueDate)}</span>}{remove && <button className="icon-button" onClick={() => remove(task._id)} aria-label="Delete task"><Trash2 size={15}/></button>}</div>; }
function Overview({ tasks, todayTasks, upcoming, progress, done, activities, setPage, toggleTask, setShowTaskForm }) {
  const pending = todayTasks.filter(t => !t.completed);
  return <><Heading eyebrow="YOUR DAY AT A GLANCE" title="Make today count." subtitle="A little intention goes a long way. Here's your space to begin." action="+ New task" onAction={() => setShowTaskForm(true)}/><div className="welcome-strip"><div className="welcome-copy"><span className="welcome-kicker"><Sun size={15}/> A GENTLE REMINDER</span><h2>You don't have to do it all.<br/><em>Just the next right thing.</em></h2><p>Take a breath, choose what matters, and begin where you are.</p></div><div className="sun-art"><div className="sun-orbit orbit-one"/><div className="sun-orbit orbit-two"/><div className="sun-core"><Sun size={49}/></div><span className="sun-label">ONE DAY AT A TIME</span></div></div><div className="stats-grid"><Stat label="Today's progress" value={progress + '%'} detail={done + ' of ' + tasks.length + ' tasks complete'} icon={ChartNoAxesCombined} trend="Keep your rhythm"/><Stat label="On your plate" value={pending.length} detail="Tasks still to focus on" icon={ListTodo} trend="One step at a time"/><Stat label="Coming up" value={upcoming.length} detail="Upcoming planned tasks" icon={CalendarDays} trend="Stay gently prepared"/><Stat label="Activities logged" value={activities.length} detail="Moments recorded" icon={Flame} trend="Every effort counts"/></div><div className="overview-grid"><section className="panel"><div className="panel-heading"><div><span className="eyebrow">STAY IN YOUR FLOW</span><h2>Today's priorities</h2></div><button className="text-button" onClick={() => setPage('My tasks')}>View all <ArrowUpRight size={15}/></button></div><div className="task-list">{todayTasks.slice(0,5).map(t => <TaskRow key={t._id} task={t} toggle={toggleTask}/>)}</div><button className="add-inline" onClick={() => setShowTaskForm(true)}><Plus size={16}/> Add another task</button></section><section className="panel"><div className="panel-heading"><div><span className="eyebrow">A LOOK AHEAD</span><h2>On the horizon</h2></div><CalendarDays size={18} className="panel-muted-icon"/></div>{upcoming.length ? upcoming.map(t => <div className="upcoming-item" key={t._id}><div className="upcoming-date"><strong>{new Date(t.dueDate + 'T12:00:00').getDate()}</strong><span>{dateShort(t.dueDate).split(' ')[0]}</span></div><div className="upcoming-copy"><strong>{t.title}</strong><span>{t.category || 'Personal'}</span></div></div>) : <div className="empty-state compact-empty"><CalendarDays size={25}/><strong>Clear skies ahead</strong><p>No upcoming tasks just yet.</p></div>}<button className="add-inline" onClick={() => setPage('My tasks')}>Plan ahead <ArrowUpRight size={15}/></button></section></div><div className="coach-banner"><div className="coach-icon"><Sparkles size={22}/></div><div><span className="eyebrow">A THOUGHTFUL SECOND OPINION</span><h3>Not sure what to do next?</h3><p>Your AI coach can help you untangle your priorities and find a starting point.</p></div><button className="secondary-button" onClick={() => setPage('AI coach')}>Talk to your coach <ArrowUpRight size={16}/></button></div></>;
}
function TasksPage({ tasks, filter, setFilter, search, setSearch, toggleTask, removeTask, setShowTaskForm }) { return <><Heading eyebrow="YOUR PERSONAL ACTION LIST" title="My tasks." subtitle="Every big thing begins with one small action." action="+ Add task" onAction={() => setShowTaskForm(true)}/><section className="panel task-page-panel"><div className="task-toolbar"><div className="search-box"><Search size={17}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Find a task…"/></div><div className="filter-pills">{['All','Open','Completed','High','Medium','Low'].map(f => <button key={f} className={filter === f ? 'selected' : ''} onClick={() => setFilter(f)}>{f}</button>)}</div></div>{tasks.length ? <div className="task-list spacious">{tasks.map(t => <TaskRow key={t._id} task={t} toggle={toggleTask} remove={removeTask}/>)}</div> : <div className="empty-state"><CheckSquare size={28}/><strong>Nothing here for now</strong><p>Try a different filter, or add a task to start your list.</p><button className="secondary-button" onClick={() => setShowTaskForm(true)}><Plus size={16}/> Add a task</button></div>}</section></>; }
function ActivityPage({ activities, draft, setDraft, addActivity, removeActivity }) { return <><Heading eyebrow="NOTICE YOUR OWN EFFORT" title="Activity journal." subtitle="A record of how you spent your time — without judgment."/><div className="activity-layout"><form className="panel activity-form" onSubmit={addActivity}><div className="panel-heading"><div><span className="eyebrow">MAKE A NOTE</span><h2>Log an activity</h2></div><CalendarDays size={19}/></div><label>What did you do?<input value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} placeholder="e.g. Studied data structures" maxLength="180" required/></label><div className="form-grid"><label>Date<input type="date" value={draft.date} onChange={e => setDraft({ ...draft, date: e.target.value })} required/></label><label>Minutes<input type="number" min="0" max="1440" value={draft.minutes} onChange={e => setDraft({ ...draft, minutes: e.target.value })}/></label></div><label>Notes (optional)<textarea rows="3" value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} placeholder="What went well?"/></label><button className="primary-button full-button"><Plus size={16}/> Save activity</button></form><section className="panel"><div className="panel-heading"><div><span className="eyebrow">YOUR RECENT MOMENTS</span><h2>Activity history</h2></div><span className="count-pill">{activities.length} entries</span></div>{activities.length ? activities.map(a => <div className="journal-entry" key={a._id}><div className="journal-symbol"><Clock3 size={18}/></div><div className="journal-entry-copy"><strong>{a.title}</strong><span>{a.date} · {a.minutes || 0} minutes</span>{a.notes && <p>{a.notes}</p>}</div><button className="icon-button" aria-label="Delete activity" onClick={() => removeActivity(a._id)}><Trash2 size={15}/></button></div>) : <div className="empty-state"><BookOpen size={27}/><strong>Your story starts here</strong><p>Log a small win, a study session, a walk, or anything that mattered to you today.</p></div>}</section></div></>; }
function ProgressPage({ tasks, activities, progress, done }) {
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); const key = d.toISOString().slice(0,10); return { key, label: new Intl.DateTimeFormat('en',{weekday:'short'}).format(d), count: tasks.filter(t => t.completed && (t.completedAt ? String(t.completedAt).slice(0,10) === key : t.dueDate === key)).length }; });
  const max = Math.max(1, ...days.map(d => d.count)); const minutes = activities.reduce((sum, a) => sum + Number(a.minutes || 0), 0);
  return <><Heading eyebrow="NOTICE HOW FAR YOU'VE COME" title="Your progress." subtitle="Progress isn't a straight line. It's all the little ways you keep showing up."/><div className="stats-grid"><Stat label="Overall completion" value={progress + '%'} detail={done + ' completed tasks'} icon={ChartNoAxesCombined} trend="Every finish counts"/><Stat label="Tasks completed" value={done} detail={'Across ' + tasks.length + ' tasks'} icon={CheckCircle2} trend="One win at a time"/><Stat label="Time invested" value={(minutes / 60).toFixed(1) + 'h'} detail="From your activity journal" icon={Clock3} trend="Time with intention"/><Stat label="Activity entries" value={activities.length} detail="Moments captured" icon={Flame} trend="Your effort matters"/></div><div className="progress-layout"><section className="panel chart-panel"><div className="panel-heading"><div><span className="eyebrow">THE LAST SEVEN DAYS</span><h2>Your weekly rhythm</h2></div><span className="chart-legend"><i/> Tasks completed</span></div><div className="bar-chart">{days.map(d => <div className="bar-column" key={d.key}><div className="bar-track"><div className="bar-fill" style={{ height: (d.count / max * 100) + '%', minHeight: d.count ? '8px' : '3px' }}/></div><span className="bar-number">{d.count || ''}</span><span className="bar-day">{d.label}</span></div>)}</div><p className="chart-footnote">Only recorded completion dates are counted. Keep logging to build a more useful picture.</p></section><section className="panel reflection-panel"><span className="eyebrow">A MOMENT TO REFLECT</span><h2>Keep it kind</h2><blockquote>“You do not have to see the whole staircase, just take the first step.”</blockquote><p>Use your records to notice patterns, celebrate consistency, and adjust your plans — not to judge yourself.</p><div className="reflection-stat"><span>Days with logged activity</span><strong>{new Set(activities.map(a => a.date)).size}</strong></div><div className="reflection-stat"><span>Minutes recorded</span><strong>{minutes.toLocaleString()}</strong></div></section></div></>; }
function CoachPage({ messages, input, setInput, send, busy, webSearch, setWebSearch }) {
  const ideas = ['Help me plan a balanced day','What should I focus on first?','Research a better way to build a habit'];
  return <><Heading eyebrow="THINK IT THROUGH, TOGETHER" title="Your AI coach." subtitle="A calm second opinion for your goals, your plans, and your next step."/><div className="coach-layout"><section className="panel chat-panel"><div className="chat-header"><div className="coach-avatar"><Sparkles size={19}/></div><div><strong>Daylight assistant</strong><span><i/> Here to help you find clarity</span></div><span className="ai-label">AI</span></div><div className="chat-messages">{messages.map((m,i) => <div key={i} className={'chat-message ' + m.role}><div className="message-avatar">{m.role === 'assistant' ? <Sun size={15}/> : 'Y'}</div><div className="message-body"><p>{m.content}</p>{m.sources?.length > 0 && <div className="source-list"><strong>Sources</strong>{m.sources.map((s,j) => <a key={j} href={s.url} target="_blank" rel="noreferrer">{s.title || s.url} <ExternalLink size={12}/></a>)}</div>}</div></div>)}{busy && <div className="chat-message assistant"><div className="message-avatar"><Sun size={15}/></div><div className="typing"><i/><i/><i/></div></div>}</div><div className="suggestion-row">{ideas.map(s => <button key={s} onClick={() => send(null,s)} disabled={busy}>{s}</button>)}</div><form className="chat-composer" onSubmit={send}><textarea value={input} onChange={e => setInput(e.target.value)} placeholder="Tell me what you're thinking…" rows="1" maxLength="2000"/><button disabled={!input.trim() || busy} aria-label="Send message"><Send size={17}/></button></form><div className="chat-bottom"><label><input type="checkbox" checked={webSearch} onChange={e => setWebSearch(e.target.checked)}/><Search size={14}/> Research the web when useful</label><span>AI can make mistakes. Check important information.</span></div></section><aside className="panel coach-guidance"><span className="eyebrow">A GOOD PLACE TO START</span><h3>One thing at a time.</h3><p>You don't need a perfect plan. A useful next step is enough.</p><div className="guidance-steps"><div><span>01</span><p>Name what matters most today.</p></div><div><span>02</span><p>Make the first step small and clear.</p></div><div><span>03</span><p>Protect a little time to begin.</p></div></div></aside></div></>; }
function PreferencesPage({ preferences, save }) {
  const colors = ['#64856d','#6688a6','#a77b68','#9179a9','#c18a45','#455c70','#cf7181'];
  const fonts = ['Inter','Georgia','Arial','Verdana','system-ui'];
  return <><Heading eyebrow="MAKE YOUR SPACE YOURS" title="Preferences." subtitle="A workspace should feel comfortable to return to. Make it yours."/><div className="settings-layout"><section className="panel settings-panel"><div className="settings-section-heading"><div className="settings-icon"><Palette size={18}/></div><div><h2>Appearance</h2><p>Set the mood for your workspace.</p></div></div><div className="setting-row"><div><strong>Color theme</strong><span>Choose the atmosphere you prefer.</span></div><div className="theme-options">{[['light',SunMedium,'Light'],['dark',Moon,'Dark'],['system',Palette,'System']].map(([value,Icon,label]) => <button key={value} className={'theme-option ' + (preferences.theme === value ? 'chosen' : '')} onClick={() => save({ ...preferences, theme: value })}><Icon size={18}/>{label}</button>)}</div></div><div className="setting-row"><div><strong>Accent color</strong><span>Pick a color that feels like you.</span></div><div className="color-options">{colors.map(color => <button key={color} className={'color-swatch ' + (preferences.accent === color ? 'chosen' : '')} style={{ '--swatch': color }} aria-label={'Set accent ' + color} onClick={() => save({ ...preferences, accent: color })}/>)}<label className="custom-color" title="Choose custom color"><input type="color" value={preferences.accent} onChange={e => save({ ...preferences, accent: e.target.value })}/><Plus size={15}/></label></div></div><div className="settings-section-heading second-settings"><div className="settings-icon"><Type size={18}/></div><div><h2>Reading comfort</h2><p>Adjust typography to suit you.</p></div></div><div className="setting-row"><div><strong>Font family</strong><span>Choose the style you read comfortably.</span></div><select className="setting-select" value={preferences.font} onChange={e => save({ ...preferences, font: e.target.value })}>{fonts.map(f => <option key={f}>{f}</option>)}</select></div><div className="setting-row"><div><strong>Font size</strong><span>Current size: {preferences.fontSize}px</span></div><div className="font-size-options">{[14,15,16,17,18,20].map(size => <button key={size} className={preferences.fontSize === size ? 'chosen' : ''} onClick={() => save({ ...preferences, fontSize: size })}>{size}</button>)}</div></div></section><aside className="panel preview-panel"><span className="eyebrow">A LITTLE PREVIEW</span><div className="preview-sample"><div className="preview-sun"><Sun size={22}/></div><h3>A softer way to focus.</h3><p>Your space, your pace. Make a little room for what matters today.</p><button className="preview-button">A small step</button></div><div className="preview-caption">Your choices update the workspace right away.</div></aside></div><div className="settings-tip"><Sparkles size={17}/><span>Your preferences are saved to your account when signed in. Preview mode keeps changes for this visit.</span></div></>; }
