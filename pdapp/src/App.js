import './AuthFlow.css';
import { useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/authContext';
import {
  doCreateUserWithEmailAndPassword,
  doSignInWithEmailAndPassword,
} from './firebase/auth';
import { createAdministrator, createTeacher, TEACHER_CAMPUSES } from './services/pdFirestore';

function normalizeSixDigitGroupCode(raw) {
  const digits = String(raw ?? '').replace(/\D/g, '').slice(0, 6);
  if (digits.length !== 6) return '';
  return digits;
}

function RoleChooserPage() {
  const { userLoggedIn, loading } = useAuth();
  if (loading) return null;
  if (userLoggedIn) {
    return <Navigate to="/welcome" replace />;
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
        const credential = await doCreateUserWithEmailAndPassword(normalizedEmail, password);
        if (isTeacher) {
          const normalizedTeacherCode = normalizeSixDigitGroupCode(teacherCode);
          if (!name.trim() || !department.trim()) {
            throw new Error('Name and department are required.');
          }
          if (!normalizedTeacherCode) {
            throw new Error('Teacher code must be exactly 6 digits.');
          }
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
          if (!schoolName.trim() || !country.trim()) {
            throw new Error('School name and country are required for administrator sign up.');
          }
          await createAdministrator({
            email: credential?.user?.email || normalizedEmail,
            schoolName: schoolName.trim(),
            country: country.trim(),
          });
        }
        setMessage('Account created successfully.');
      } else {
        await doSignInWithEmailAndPassword(email.trim(), password);
        setMessage('Signed in successfully.');
      }
      navigate('/welcome');
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
              <input id={`${role}-country`} value={country} onChange={(e) => setCountry(e.target.value)} required />
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
  return (
    <main className="auth-landing">
      <section className="auth-card">
        <h1 className="auth-title">Signed In</h1>
        <p className="auth-subtitle">Authentication is complete. Dashboard views are currently disabled.</p>
        <Link className="back-link" to="/">
          Back to start
        </Link>
      </section>
    </main>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<RoleChooserPage />} />
      <Route path="/auth/admin" element={<RoleAuthPage role="admin" />} />
      <Route path="/auth/teacher" element={<RoleAuthPage role="teacher" />} />
      <Route path="/welcome" element={<WelcomePage />} />
    </Routes>
  );
}

export default App;
