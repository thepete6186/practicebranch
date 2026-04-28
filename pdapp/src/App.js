import './AuthFlow.css';
import './App.css';
import { useEffect, useState } from 'react';
import { Link, Navigate, Outlet, Route, Routes, useNavigate } from 'react-router-dom';
import { doSignout } from './firebase/auth';
import { useAuth } from './contexts/authContext';
import {
  doCreateUserWithEmailAndPassword,
  doSignInWithEmailAndPassword,
} from './firebase/auth';
import {
  createAdministrator,
  DEFAULT_GROUP_CODE,
  administratorGroupCodeExists,
  assignLegacyDataToDefaultGroupCode,
  getAdministratorByEmail,
  getTeacherByEmail,
  isAdministratorEmail,
  OFFICIAL_COUNTRIES,
  createTeacher,
  TEACHER_CAMPUSES,
  updateTeacher,
} from './services/pdFirestore';
import { PdDataProvider, usePdData } from './pdDataContext';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function isoWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

function normalizeSixDigitGroupCode(raw) {
  const digits = String(raw ?? '').replace(/\D/g, '').slice(0, 6);
  if (digits.length !== 6) return '';
  return digits;
}

function RoleChooserPage() {
  const { userLoggedIn, loading } = useAuth();
  if (loading) return null;
  if (userLoggedIn) {
    return <Navigate to="/app" replace />;
  }
  return (
    <main className="auth-landing">
      <section className="auth-card-wide">
        <h1 className="auth-title">Sign In / Sign Up</h1>
        <p className="auth-subtitle">Choose which portal you are entering.</p>
        <div className="role-grid">
          <Link className="role-card" to="/auth/admin">
            <h2>Administrator</h2>
            <p>Use this if you manage school setup and teacher onboarding.</p>
          </Link>
          <Link className="role-card" to="/auth/teacher">
            <h2>Teacher</h2>
            <p>Use this to sign in or create your teacher account.</p>
          </Link>
        </div>
      </section>
    </main>
  );
}

function RoleAuthPage({ role }) {
  const navigate = useNavigate();
  const isTeacher = role === 'teacher';
  const [mode, setMode] = useState('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [campus, setCampus] = useState(TEACHER_CAMPUSES[0] || 'Tai Tam');
  const [teacherCode, setTeacherCode] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [country, setCountry] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const title = isTeacher ? 'Teacher Sign In / Sign Up' : 'Administrator Sign In / Sign Up';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      if (mode === 'signup') {
        const normalizedEmail = email.trim();
        if (isTeacher) {
          const normalizedTeacherCode = normalizeSixDigitGroupCode(teacherCode);
          if (!name.trim() || !department.trim()) {
            throw new Error('Name and department are required.');
          }
          if (!normalizedTeacherCode) {
            throw new Error('Teacher code must be exactly 6 digits.');
          }
          const adminCodeExists = await administratorGroupCodeExists(normalizedTeacherCode);
          if (!adminCodeExists) {
            throw new Error('Teacher code is invalid. Please check with your administrator.');
          }
          const credential = await doCreateUserWithEmailAndPassword(normalizedEmail, password);
          await createTeacher({
            name: name.trim(),
            department: department.trim(),
            age: 0,
            campus,
            email: credential?.user?.email || normalizedEmail,
            role: 'Teacher',
            hours: 0,
            groupCode: normalizedTeacherCode,
          });
        } else {
          const normalizedAdminCode = normalizeSixDigitGroupCode(adminCode);
          if (!schoolName.trim() || !country.trim()) {
            throw new Error('School name and country are required for administrator sign up.');
          }
          if (!normalizedAdminCode) {
            throw new Error('Administrator code must be exactly 6 digits.');
          }
          const credential = await doCreateUserWithEmailAndPassword(normalizedEmail, password);
          await createAdministrator({
            email: credential?.user?.email || normalizedEmail,
            schoolName: schoolName.trim(),
            country: country.trim(),
            groupCode: normalizedAdminCode,
          });
        }
        setMessage('Account created successfully.');
        navigate(isTeacher ? '/teacher' : '/admin');
      } else {
        const normalizedEmail = email.trim();
        const credential = await doSignInWithEmailAndPassword(normalizedEmail, password);
        const signedInEmail = credential?.user?.email || normalizedEmail;
        if (isTeacher) {
          const teacherRecord = await getTeacherByEmail(signedInEmail);
          if (!teacherRecord) {
            await doSignout();
            throw new Error('No teacher profile found for this account.');
          }
        } else {
          const adminRecordExists = await isAdministratorEmail(signedInEmail);
          if (!adminRecordExists) {
            await doSignout();
            throw new Error('This account is not registered as an administrator.');
          }
        }
        setMessage('Signed in successfully.');
        navigate(isTeacher ? '/teacher' : '/admin');
      }
    } catch (err) {
      setError(err?.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-landing">
      <section className="auth-card">
        <h1 className="auth-title">{title}</h1>
        <p className="auth-subtitle">
          {isTeacher
            ? 'Teacher sign up requires your onboarding details and teacher code.'
            : 'Administrator sign up requires school profile information.'}
        </p>

        <div className="auth-mode-switch" role="tablist" aria-label="Authentication mode">
          <button
            type="button"
            className={`auth-mode-btn ${mode === 'signin' ? 'active' : ''}`}
            onClick={() => setMode('signin')}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-mode-btn ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => setMode('signup')}
          >
            Sign Up
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'signup' && isTeacher ? (
            <>
              <label htmlFor={`${role}-name`}>Full name</label>
              <input id={`${role}-name`} value={name} onChange={(e) => setName(e.target.value)} required />

              <label htmlFor={`${role}-department`}>Department</label>
              <input
                id={`${role}-department`}
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                required
              />

              <label htmlFor={`${role}-campus`}>Campus</label>
              <select id={`${role}-campus`} value={campus} onChange={(e) => setCampus(e.target.value)}>
                {TEACHER_CAMPUSES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <label htmlFor={`${role}-teacher-code`}>Teacher code</label>
              <input
                id={`${role}-teacher-code`}
                value={teacherCode}
                onChange={(e) => setTeacherCode(e.target.value)}
                inputMode="numeric"
                pattern="[0-9]{6}"
                placeholder="6-digit code"
                required
              />
            </>
          ) : null}

          {mode === 'signup' && !isTeacher ? (
            <>
              <label htmlFor={`${role}-school-name`}>School name</label>
              <input
                id={`${role}-school-name`}
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                required
              />

              <label htmlFor={`${role}-country`}>Country</label>
              <select id={`${role}-country`} value={country} onChange={(e) => setCountry(e.target.value)} required>
                <option value="">Select a country</option>
                {OFFICIAL_COUNTRIES.map((countryName) => (
                  <option key={countryName} value={countryName}>
                    {countryName}
                  </option>
                ))}
              </select>

              <label htmlFor={`${role}-admin-code`}>Administrator code</label>
              <input
                id={`${role}-admin-code`}
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
                inputMode="numeric"
                pattern="[0-9]{6}"
                placeholder="6-digit code"
                required
              />
            </>
          ) : null}

          <label htmlFor={`${role}-email`}>Email</label>
          <input
            id={`${role}-email`}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label htmlFor={`${role}-password`}>Password</label>
          <input
            id={`${role}-password`}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>

        {mode === 'signin' ? (
          <p className="auth-switch-copy">
            No account?{' '}
            <button type="button" className="auth-text-link" onClick={() => setMode('signup')}>
              Sign up
            </button>
          </p>
        ) : (
          <p className="auth-switch-copy">
            Already have an account?{' '}
            <button type="button" className="auth-text-link" onClick={() => setMode('signin')}>
              Sign in
            </button>
          </p>
        )}

        {message ? <p className="auth-success">{message}</p> : null}
        {error ? <p className="auth-error">{error}</p> : null}
        <Link className="back-link" to="/">
          Back to role selection
        </Link>
      </section>
    </main>
  );
}

function WelcomePage() {
  const navigate = useNavigate();

  const handleBackToStart = async () => {
    try {
      await doSignout();
    } catch (err) {
      // ignore signout errors but still navigate back
    }
    navigate('/', { replace: true });
  };

  return (
    <main className="auth-landing">
      <section className="auth-card">
        <h1 className="auth-title">Signed In</h1>
        <p className="auth-subtitle">Authentication is complete. Dashboard views are currently disabled.</p>
        <button type="button" className="back-link" onClick={handleBackToStart}>
          Back to start
        </button>
      </section>
    </main>
  );
}

function App() {
  const navigate = useNavigate();

  const { signOut, currentUser } = useAuth();
  const [activeGroupCode, setActiveGroupCode] = useState(DEFAULT_GROUP_CODE);

  useEffect(() => {
    let mounted = true;
    const resolveGroupCode = async () => {
      if (!currentUser?.email) {
        if (mounted) setActiveGroupCode(DEFAULT_GROUP_CODE);
        return;
      }
      const email = currentUser.email.trim();
      const admin = await getAdministratorByEmail(email);
      if (admin) {
        if (mounted) setActiveGroupCode(String(admin.groupCode || '').trim() || DEFAULT_GROUP_CODE);
        return;
      }
      const teacher = await getTeacherByEmail(email);
      if (teacher) {
        if (mounted) setActiveGroupCode(String(teacher.groupCode || '').trim() || DEFAULT_GROUP_CODE);
        return;
      }
      if (mounted) setActiveGroupCode(DEFAULT_GROUP_CODE);
    };
    resolveGroupCode();
    return () => {
      mounted = false;
    };
  }, [currentUser]);

  useEffect(() => {
    assignLegacyDataToDefaultGroupCode(DEFAULT_GROUP_CODE).catch(() => {
      // ignore migration failures caused by restricted permissions
    });
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (e) {
      // fallback
      try { await doSignout(); } catch {}
    }
    try {
      localStorage.removeItem('pdapp_selected_teacher_id');
    } catch {}
    navigate('/', { replace: true });
  };

  return (
    <Routes>
      <Route path="/" element={<RoleChooserPage />} />
      <Route path="/auth/admin" element={<RoleAuthPage role="admin" />} />
      <Route path="/auth/teacher" element={<RoleAuthPage role="teacher" />} />
      <Route path="/welcome" element={<WelcomePage />} />
      <Route path="/app" element={<PostLoginRedirectPage />} />
      <Route element={<RoleGate requiredRole="admin"><AdminLayout onSignOut={handleSignOut} /></RoleGate>}>
        <Route path="/admin" element={<DashboardPage groupCode={activeGroupCode} />} />
        <Route path="/admin/calendar" element={<AdminCalendarPage groupCode={activeGroupCode} />} />
        <Route path="/admin/past-events" element={<PastEventsPage groupCode={activeGroupCode} />} />
        <Route path="/admin/future-events" element={<FutureEventsPage groupCode={activeGroupCode} />} />
        <Route path="/admin/teachers" element={<TeachersPage groupCode={activeGroupCode} />} />
      </Route>
      <Route element={<RoleGate requiredRole="teacher"><TeacherLayout onSignOut={handleSignOut} /></RoleGate>}>
        <Route path="/teacher" element={<TeacherDashboardPage groupCode={activeGroupCode} />} />
        <Route path="/teacher/calendar" element={<TeacherCalendarPage groupCode={activeGroupCode} />} />
        <Route path="/teacher/past-events" element={<TeacherPastEventsPage groupCode={activeGroupCode} />} />
        <Route path="/teacher/future-events" element={<TeacherFutureEventsPage groupCode={activeGroupCode} />} />
      </Route>
    </Routes>
  );
}

function RoleGate({ requiredRole, children }) {
  const { currentUser, loading } = useAuth();
  const [resolvedRole, setResolvedRole] = useState(null);

  useEffect(() => {
    let active = true;
    const resolveRole = async () => {
      if (!currentUser?.email) {
        if (active) setResolvedRole('guest');
        return;
      }
      const email = currentUser.email.trim();
      const admin = await isAdministratorEmail(email);
      if (admin) {
        if (active) setResolvedRole('admin');
        return;
      }
      const teacher = await getTeacherByEmail(email);
      if (teacher) {
        if (active) setResolvedRole('teacher');
        return;
      }
      if (active) setResolvedRole('guest');
    };
    resolveRole();
    return () => {
      active = false;
    };
  }, [currentUser]);

  if (loading || !resolvedRole) return null;
  if (resolvedRole === 'guest') return <Navigate to="/" replace />;
  if (requiredRole === 'admin' && resolvedRole !== 'admin') return <Navigate to="/teacher" replace />;
  if (requiredRole === 'teacher' && resolvedRole !== 'teacher') return <Navigate to="/admin" replace />;
  return children;
}

function AdminLayout({ onSignOut }) {
  return (
    <div className="app-shell">
      <header className="admin-header">
        <div className="brand-group">
          <p className="brand-eyebrow">Professional Development Tracker</p>
          <h1 className="brand-title">Administrator Dashboard</h1>
        </div>
        <div className="admin-meta">
          <button className="sign-out-button" type="button" onClick={onSignOut}>
            Sign Out
          </button>
        </div>
      </header>
      <div className="app-shell-body">
        <Outlet />
      </div>
    </div>
  );
}

function TeacherLayout({ onSignOut }) {
  return (
    <div className="app-shell">
      <header className="admin-header teacher-header-accent">
        <div className="brand-group">
          <p className="brand-eyebrow">Professional Development Tracker</p>
          <h1 className="brand-title">My Dashboard</h1>
        </div>
        <div className="admin-meta">
          <button className="sign-out-button" type="button" onClick={onSignOut}>
            Sign Out
          </button>
        </div>
      </header>
      <div className="app-shell-body">
        <Outlet />
      </div>
    </div>
  );
}

function PostLoginRedirectPage() {
  const { currentUser, loading } = useAuth();
  const [targetRoute, setTargetRoute] = useState(null);

  useEffect(() => {
    let active = true;
    const resolveRoute = async () => {
      if (!currentUser?.email) {
        if (active) setTargetRoute('/');
        return;
      }
      const email = currentUser.email.trim();
      const admin = await isAdministratorEmail(email);
      if (admin) {
        if (active) setTargetRoute('/admin');
        return;
      }
      const teacher = await getTeacherByEmail(email);
      if (teacher) {
        if (active) setTargetRoute('/teacher');
        return;
      }
      if (active) setTargetRoute('/');
    };
    resolveRoute();
    return () => {
      active = false;
    };
  }, [currentUser]);

  if (loading || !targetRoute) return null;
  return <Navigate to={targetRoute} replace />;
}

function DashboardPage({ groupCode }) {
  return (
    <PdDataProvider groupCode={groupCode}>
      <DashboardInner />
    </PdDataProvider>
  );
}

function TeacherDashboardPage({ groupCode }) {
  return (
    <PdDataProvider groupCode={groupCode}>
      <TeacherDashboardInner />
    </PdDataProvider>
  );
}

function TeacherDashboardInner() {
  const { teachers, events, signups } = usePdData();
  const { currentUser } = useAuth();
  const teacher = teachers.find(
    (t) => String(t.email || '').toLowerCase() === String(currentUser?.email || '').toLowerCase()
  );
  const teacherSignups = signups.filter((signup) => signup.teacherId === teacher?.id);
  const signedUpEventIds = new Set(teacherSignups.map((signup) => signup.eventId));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const teacherEvents = events
    .filter((event) => signedUpEventIds.has(event.id))
    .map((event) => ({ ...event, jsDate: event?.date?.toDate?.() || null }))
    .filter((event) => event.jsDate);
  const completedEvents = teacherEvents.filter((event) => event.jsDate < today);
  const upcomingEvents = teacherEvents.filter((event) => event.jsDate >= today);

  return (
    <main className="admin-main-grid teacher-dashboard">
      <section className="panel-card calendar-panel">
        <MonthCalendar variant="compact" />
        <div className="calendar-panel-footer">
          <Link className="calendar-open-full-link" to="/teacher/calendar">
            Open full calendar
          </Link>
        </div>
      </section>

      <section className="teacher-right-stack">
        <section className="panel-card teacher-section-card">
          <h2 className="panel-title">Personal information</h2>
          {teacher ? (
            <dl className="teacher-info-grid">
              <div>
                <dt>Full name</dt>
                <dd>{teacher.name || '—'}</dd>
              </div>
              <div>
                <dt>School email</dt>
                <dd>{teacher.email || '—'}</dd>
              </div>
              <div>
                <dt>Department</dt>
                <dd>{teacher.department || '—'}</dd>
              </div>
              <div>
                <dt>Campus</dt>
                <dd>{teacher.campus || '—'}</dd>
              </div>
            </dl>
          ) : (
            <p className="empty-inline-note">Signed in as a teacher. Your profile is not set up yet.</p>
          )}
        </section>

        <section className="panel-card teacher-section-card">
          <div className="program-menu" aria-label="Programs">
            <div className="program-block">
              <h3 className="program-subtitle">Signed up:</h3>
              {upcomingEvents.length ? (
                <ul className="program-list">
                  {upcomingEvents.slice(0, 5).map((event) => (
                    <li key={event.id}>{event.name || 'Untitled event'}</li>
                  ))}
                </ul>
              ) : (
                <p className="program-empty">No upcoming signups.</p>
              )}
            </div>
            <div className="program-block">
              <h3 className="program-subtitle">Completed:</h3>
              {completedEvents.length ? (
                <ul className="program-list">
                  {completedEvents.slice(0, 5).map((event) => (
                    <li key={event.id}>{event.name || 'Untitled event'}</li>
                  ))}
                </ul>
              ) : (
                <p className="program-empty">No completed events.</p>
              )}
            </div>
          </div>
          <section className="events-split-grid">
            <Link className="panel-link" to="/teacher/past-events">
              <section className="panel-card">
                <h3 className="panel-title">Past Events</h3>
                <p className="empty-inline-note">{completedEvents.length} event{completedEvents.length === 1 ? '' : 's'}</p>
              </section>
            </Link>
            <Link className="panel-link" to="/teacher/future-events">
              <section className="panel-card">
                <h3 className="panel-title">Future Events</h3>
                <p className="empty-inline-note">{upcomingEvents.length} event{upcomingEvents.length === 1 ? '' : 's'}</p>
              </section>
            </Link>
          </section>
        </section>

        <section className="panel-card teacher-stats-card">
          <div className="teacher-stat">
            <span className="teacher-stat-label">Hours attended</span>
            <strong className="teacher-stat-value">{Number(teacher?.hours || 0)}</strong>
            <span className="teacher-stat-hint">All recorded</span>
          </div>
          <div className="teacher-stat-divider" aria-hidden="true" />
          <div className="teacher-stat">
            <span className="teacher-stat-label">Events joined</span>
            <strong className="teacher-stat-value">{teacherEvents.length}</strong>
            <span className="teacher-stat-hint">Signed up total</span>
          </div>
        </section>
      </section>
    </main>
  );
}

function DashboardInner() {
  const { teachers, events } = usePdData();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const eventDates = events
    .map((ev) => ev?.date?.toDate?.() || null)
    .filter(Boolean)
    .map((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()));
  const pastCount = eventDates.filter((d) => d < today).length;
  const futureCount = eventDates.filter((d) => d >= today).length;

  return (
    <main className="admin-main-grid">
      <section className="panel-card calendar-panel">
        <MonthCalendar variant="compact" />
        <div className="calendar-panel-footer">
          <Link className="calendar-open-full-link" to="/admin/calendar">
            Open full calendar
          </Link>
        </div>
      </section>

      <section className="right-panel-layout">
        <Link className="panel-link" to="/admin/teachers">
          <section className="panel-card">
            <div className="panel-heading-row">
              <h2 className="panel-title">Teacher View</h2>
            </div>
            <ul className="teacher-list">
              {teachers.slice(0, 4).map((teacher) => (
                <li key={teacher.id}>{teacher.name || 'Unnamed teacher'}</li>
              ))}
            </ul>
          </section>
        </Link>

        <section className="events-split-grid">
          <Link className="panel-link" to="/admin/past-events">
            <section className="panel-card">
              <h2 className="panel-title">Past Events</h2>
              <p className="empty-inline-note">{pastCount} event{pastCount === 1 ? '' : 's'}</p>
            </section>
          </Link>

          <Link className="panel-link" to="/admin/future-events">
            <section className="panel-card">
              <h2 className="panel-title">Future Events</h2>
              <p className="empty-inline-note">{futureCount} event{futureCount === 1 ? '' : 's'}</p>
            </section>
          </Link>
        </section>
      </section>
    </main>
  );
}

function DetailPage({ title, children, backTo = '/admin', backLabel = 'Back to Dashboard', calendarFullscreen = false }) {
  return (
    <main className={calendarFullscreen ? 'detail-page-wrap detail-page-wrap--calendar' : 'detail-page-wrap'}>
      <section className={calendarFullscreen ? 'detail-card detail-card--calendar' : 'panel-card detail-card'}>
        <div className={calendarFullscreen ? 'panel-heading-row calendar-page-toolbar' : 'panel-heading-row'}>
          <h2 className={calendarFullscreen ? 'detail-title calendar-page-title' : 'detail-title'}>{title}</h2>
          <Link className="back-link" to={backTo}>
            {backLabel}
          </Link>
        </div>
        {children}
      </section>
    </main>
  );
}

function buildCalendarWeeks(year, month) {
  const firstOfMonth = new Date(year, month, 1);
  const offset = (firstOfMonth.getDay() + 6) % 7;
  const cursor = new Date(year, month, 1 - offset);
  const monthEnd = new Date(year, month + 1, 0);
  const weeks = [];
  while (true) {
    const row = [];
    for (let i = 0; i < 7; i += 1) {
      row.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    if (row[0] > monthEnd) break;
    weeks.push(row);
  }
  return weeks;
}

function calendarDayKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function MonthCalendar({ variant = 'compact' }) {
  const today = new Date();
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const isLarge = variant === 'large';
  const showWeekColumn = isLarge;
  const weeks = buildCalendarWeeks(view.year, view.month);
  const monthName = new Date(view.year, view.month, 1).toLocaleString('default', { month: 'long' });

  const shiftMonth = (delta) => {
    setView((current) => {
      const moved = new Date(current.year, current.month + delta, 1);
      return { year: moved.getFullYear(), month: moved.getMonth() };
    });
  };

  const shiftYear = (delta) => {
    setView((current) => ({ ...current, year: current.year + delta }));
  };

  const goToToday = () => setView({ year: today.getFullYear(), month: today.getMonth() });

  return (
    <section className={['calendar-shell', isLarge ? 'calendar-shell--large' : 'calendar-shell--compact'].join(' ')}>
      <header className="calendar-header">
        <div className="calendar-nav">
          <button type="button" className="calendar-nav-btn" onClick={() => shiftYear(-1)} aria-label="Previous year">«</button>
          <button type="button" className="calendar-nav-btn" onClick={() => shiftMonth(-1)} aria-label="Previous month">‹</button>
          <h2 className="calendar-title">
            {monthName} <span className="calendar-title-year">{view.year}</span>
          </h2>
          <button type="button" className="calendar-nav-btn" onClick={() => shiftMonth(1)} aria-label="Next month">›</button>
          <button type="button" className="calendar-nav-btn" onClick={() => shiftYear(1)} aria-label="Next year">»</button>
        </div>
        <button type="button" className="calendar-today-btn" onClick={goToToday}>Today</button>
      </header>
      <div
        className="calendar-grid-pro"
        style={{
          gridTemplateColumns: showWeekColumn ? 'var(--calendar-week-col) repeat(7, minmax(0, 1fr))' : 'repeat(7, minmax(0, 1fr))',
          gridTemplateRows: isLarge ? `auto repeat(${weeks.length}, minmax(4rem, 1fr))` : `auto repeat(${weeks.length}, minmax(2.4rem, 3.5rem))`,
        }}
      >
        {showWeekColumn ? <div className="calendar-grid-corner" aria-hidden="true" /> : null}
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="calendar-day-head">{label}</div>
        ))}
        {showWeekColumn
          ? weeks.map((week) => (
              <div key={`week-${calendarDayKey(week[0])}`} style={{ display: 'contents' }}>
                <div className="calendar-week-label">CW {isoWeekNumber(week[0])}</div>
                {week.map((dayDate) => {
                  const inMonth = dayDate.getMonth() === view.month;
                  const isToday = dayDate.toDateString() === today.toDateString();
                  return (
                    <div key={calendarDayKey(dayDate)} className={['calendar-cell-pro', !inMonth ? 'is-other-month' : '', isToday ? 'is-today' : ''].filter(Boolean).join(' ')}>
                      <span className="calendar-cell-date">{dayDate.getDate()}</span>
                    </div>
                  );
                })}
              </div>
            ))
          : weeks.flat().map((dayDate) => {
              const inMonth = dayDate.getMonth() === view.month;
              const isToday = dayDate.toDateString() === today.toDateString();
              return (
                <div key={calendarDayKey(dayDate)} className={['calendar-cell-pro', !inMonth ? 'is-other-month' : '', isToday ? 'is-today' : ''].filter(Boolean).join(' ')}>
                  <span className="calendar-cell-date">{dayDate.getDate()}</span>
                </div>
              );
            })}
      </div>
    </section>
  );
}

function AdminCalendarPage({ groupCode }) {
  return (
    <PdDataProvider groupCode={groupCode}>
      <DetailPage title="Calendar" calendarFullscreen>
        <MonthCalendar variant="large" />
      </DetailPage>
    </PdDataProvider>
  );
}

function TeacherCalendarPage({ groupCode }) {
  return (
    <PdDataProvider groupCode={groupCode}>
      <DetailPage title="Calendar" backTo="/teacher" backLabel="Back to my dashboard" calendarFullscreen>
        <MonthCalendar variant="large" />
      </DetailPage>
    </PdDataProvider>
  );
}

function PastEventsPage({ groupCode }) {
  return (
    <PdDataProvider groupCode={groupCode}>
      <PastEventsInner />
    </PdDataProvider>
  );
}

function PastEventsInner() {
  const { events } = usePdData();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const pastEvents = events
    .map((ev) => ({ ...ev, jsDate: ev?.date?.toDate?.() || null }))
    .filter((ev) => ev.jsDate && new Date(ev.jsDate.getFullYear(), ev.jsDate.getMonth(), ev.jsDate.getDate()) < today)
    .sort((a, b) => b.jsDate - a.jsDate);

  const manualPastEvents = eventName && eventDate ? [{ id: `manual-${eventName}-${eventDate}`, name: eventName, jsDate: new Date(eventDate) }] : [];
  const allPastEvents = [...pastEvents, ...manualPastEvents];

  return (
    <DetailPage title="Past Events">
      <section className="events-manager">
        {allPastEvents.length === 0 ? (
          <p className="events-empty-message">No past events yet. Click + to add an event and date.</p>
        ) : (
          <div className="accordion-list">
            {allPastEvents.map((event) => (
              <details key={event.id} className="event-accordion-item">
                <summary>
                  <span>{event.name || 'Untitled event'}</span>
                  <span>{event.jsDate.toLocaleDateString()}</span>
                </summary>
                <div className="event-accordion-content">
                  <p><strong>Event:</strong> {event.name || 'Untitled event'}</p>
                  <p><strong>Date:</strong> {event.jsDate.toLocaleDateString()}</p>
                </div>
              </details>
            ))}
          </div>
        )}
        {isFormOpen ? (
          <form className="event-form-card" onSubmit={(e) => { e.preventDefault(); setIsFormOpen(false); }}>
            <label htmlFor="past-event-name">Event Name</label>
            <input id="past-event-name" type="text" value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="Enter event name" required />
            <label htmlFor="past-event-date">Date</label>
            <input id="past-event-date" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required />
            <div className="event-form-actions">
              <button className="event-action-button" type="submit">Add Event</button>
              <button className="event-action-button ghost" type="button" onClick={() => setIsFormOpen(false)}>Cancel</button>
            </div>
          </form>
        ) : null}
        <button className="add-event-fab" type="button" onClick={() => setIsFormOpen((prev) => !prev)} aria-label="Add past event">+</button>
      </section>
    </DetailPage>
  );
}

function FutureEventsPage({ groupCode }) {
  return (
    <PdDataProvider groupCode={groupCode}>
      <FutureEventsInner />
    </PdDataProvider>
  );
}

function FutureEventsInner() {
  const { events } = usePdData();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const futureEvents = events
    .map((ev) => ({ ...ev, jsDate: ev?.date?.toDate?.() || null }))
    .filter((ev) => ev.jsDate && new Date(ev.jsDate.getFullYear(), ev.jsDate.getMonth(), ev.jsDate.getDate()) >= today)
    .sort((a, b) => a.jsDate - b.jsDate);

  const manualFutureEvents = eventName && eventDate ? [{ id: `manual-${eventName}-${eventDate}`, name: eventName, jsDate: new Date(eventDate) }] : [];
  const allFutureEvents = [...futureEvents, ...manualFutureEvents];

  return (
    <DetailPage title="Future Events">
      <section className="events-manager">
        {allFutureEvents.length === 0 ? (
          <p className="events-empty-message">No future events yet. Click + to add an event and date.</p>
        ) : (
          <div className="accordion-list">
            {allFutureEvents.map((event) => (
              <details key={event.id} className="event-accordion-item">
                <summary>
                  <span>{event.name || 'Untitled event'}</span>
                  <span>{event.jsDate.toLocaleDateString()}</span>
                </summary>
                <div className="event-accordion-content">
                  <p><strong>Event:</strong> {event.name || 'Untitled event'}</p>
                  <p><strong>Date:</strong> {event.jsDate.toLocaleDateString()}</p>
                </div>
              </details>
            ))}
          </div>
        )}
        {isFormOpen ? (
          <form className="event-form-card" onSubmit={(e) => { e.preventDefault(); setIsFormOpen(false); }}>
            <label htmlFor="future-event-name">Event Name</label>
            <input id="future-event-name" type="text" value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="Enter event name" required />
            <label htmlFor="future-event-date">Date</label>
            <input id="future-event-date" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required />
            <div className="event-form-actions">
              <button className="event-action-button" type="submit">Add Event</button>
              <button className="event-action-button ghost" type="button" onClick={() => setIsFormOpen(false)}>Cancel</button>
            </div>
          </form>
        ) : null}
        <button className="add-event-fab" type="button" onClick={() => setIsFormOpen((prev) => !prev)} aria-label="Add future event">+</button>
      </section>
    </DetailPage>
  );
}

function TeachersPage({ groupCode }) {
  return (
    <PdDataProvider groupCode={groupCode}>
      <TeachersInner />
    </PdDataProvider>
  );
}

function TeachersInner() {
  const { teachers } = usePdData();
  const teacherList = teachers.filter((teacher) => teacher?.role === 'Teacher');
  const [pendingTeacherId, setPendingTeacherId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const adjustHours = async (teacher, delta) => {
    if (!teacher?.id) return;
    const currentHours = Number(teacher.hours || 0);
    const nextHours = Math.max(0, currentHours + delta);
    setErrorMessage('');
    setPendingTeacherId(teacher.id);
    try {
      await updateTeacher(teacher.id, { hours: nextHours });
    } catch (err) {
      setErrorMessage(err?.message || 'Failed to update teacher hours.');
    } finally {
      setPendingTeacherId('');
    }
  };

  return (
    <DetailPage title="Teacher View">
      {teacherList.length ? (
        <ul className="teacher-detail-list">
          {teacherList.map((teacher) => (
            <li key={teacher.id} className="teacher-detail-card">
              <div>
                <p className="teacher-detail-name">{teacher.name || 'Unnamed teacher'}</p>
                <p className="teacher-detail-line"><strong>Email:</strong> {teacher.email || '—'}</p>
                <p className="teacher-detail-line"><strong>Department:</strong> {teacher.department || '—'}</p>
                <p className="teacher-detail-line"><strong>Campus:</strong> {teacher.campus || '—'}</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                <p className="teacher-detail-line"><strong>Hours:</strong> {Number(teacher.hours || 0)}</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="event-action-button ghost"
                    type="button"
                    onClick={() => adjustHours(teacher, -1)}
                    disabled={pendingTeacherId === teacher.id}
                  >
                    -1 hour
                  </button>
                  <button
                    className="event-action-button"
                    type="button"
                    onClick={() => adjustHours(teacher, 1)}
                    disabled={pendingTeacherId === teacher.id}
                  >
                    +1 hour
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty-inline-note">No teachers yet.</p>
      )}
      {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}
    </DetailPage>
  );
}

function TeacherPastEventsPage({ groupCode }) {
  return (
    <PdDataProvider groupCode={groupCode}>
      <TeacherEventsInner mode="past" />
    </PdDataProvider>
  );
}

function TeacherFutureEventsPage({ groupCode }) {
  return (
    <PdDataProvider groupCode={groupCode}>
      <TeacherEventsInner mode="future" />
    </PdDataProvider>
  );
}

function TeacherEventsInner({ mode }) {
  const { teachers, events, signups } = usePdData();
  const { currentUser } = useAuth();
  const teacher = teachers.find(
    (t) => String(t.email || '').toLowerCase() === String(currentUser?.email || '').toLowerCase()
  );
  const teacherSignups = signups.filter((signup) => signup.teacherId === teacher?.id);
  const signedUpEventIds = new Set(teacherSignups.map((signup) => signup.eventId));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const teacherEvents = events
    .filter((event) => signedUpEventIds.has(event.id))
    .map((event) => ({ ...event, jsDate: event?.date?.toDate?.() || null }))
    .filter((event) => event.jsDate)
    .filter((event) => (mode === 'past' ? event.jsDate < today : event.jsDate >= today))
    .sort((a, b) => (mode === 'past' ? b.jsDate - a.jsDate : a.jsDate - b.jsDate));

  return (
    <DetailPage
      title={mode === 'past' ? 'My Past Events' : 'My Future Events'}
      backTo="/teacher"
      backLabel="Back to my dashboard"
    >
      {teacherEvents.length ? (
        <ul className="event-list detail-list">
          {teacherEvents.map((event) => (
            <li key={event.id}>
              {event.name || 'Untitled event'} - {event.jsDate.toLocaleDateString()}
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty-inline-note">
          {mode === 'past' ? 'No past events yet.' : 'No future events yet.'}
        </p>
      )}
    </DetailPage>
  );
}

export default App;
