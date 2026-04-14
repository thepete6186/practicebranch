import './App.css';
import { firebaseProjectId } from './firebase';
import { Link, Outlet, Route, Routes } from 'react-router-dom';
import { Fragment, useMemo, useState } from 'react';
import { usePdData } from './pdDataContext';
import {
  calendarDateStringFromEvent,
  calendarDayKeyFromDateField,
  createEvent,
  createTeacher,
  deleteEvent,
  dateInputToTimestamp,
  eventMatchesListMode,
  formatEventDateField,
  removeTeacherEventSignup,
  signupTeacherForEvent,
  todayCalendarDateString,
  TEACHER_CAMPUSES,
  TEACHER_ROLES,
  updateTeacher,
} from './services/pdFirestore';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function isoWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

function buildCalendarWeeks(year, month) {
  const firstOfMonth = new Date(year, month, 1);
  const offset = (firstOfMonth.getDay() + 6) % 7;
  const cur = new Date(year, month, 1 - offset);
  const monthEnd = new Date(year, month + 1, 0);
  const weeks = [];
  while (true) {
    const row = [];
    for (let i = 0; i < 7; i += 1) {
      row.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    if (row[0] > monthEnd) break;
    weeks.push(row);
  }
  return weeks;
}

function calendarDayKey(d) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function buildEventsByDayKey(events) {
  const map = {};
  events.forEach((ev) => {
    if (!ev.date) return;
    const k = calendarDayKeyFromDateField(ev.date);
    if (!k) return;
    if (!map[k]) map[k] = [];
    map[k].push(ev);
  });
  return map;
}

function AdminHeader({ adminName, department }) {
  return (
    <header className="admin-header">
      <div className="brand-group">
        <p className="brand-eyebrow">Professional Development Tracker</p>
        <h1 className="brand-title">Administrator Dashboard</h1>
      </div>

      <div className="admin-meta">
        <div className="meta-item">
          <span className="meta-label">Signed in as</span>
          <span className="meta-value">{adminName}</span>
        </div>

        <div className="meta-item">
          <span className="meta-label">Role</span>
          <span className="meta-value">Administrator</span>
        </div>

        <div className="meta-item">
          <span className="meta-label">Department</span>
          <span className="meta-value">{department}</span>
        </div>

        <Link className="portal-switch-link" to="/teacher">
          Teacher portal
        </Link>

        <button className="sign-out-button" type="button">
          Sign Out
        </button>
      </div>
    </header>
  );
}

function TeacherHeader({ teachers, selectedTeacherId, onSelectTeacherId }) {
  const selected = teachers.find((t) => t.id === selectedTeacherId);
  return (
    <header className="admin-header teacher-header-accent">
      <div className="brand-group">
        <p className="brand-eyebrow">Professional Development Tracker</p>
        <h1 className="brand-title">My Dashboard</h1>
      </div>

      <div className="admin-meta teacher-header-controls">
        <label className="teacher-picker-label">
          <span className="meta-label">Acting as</span>
          <select
            className="teacher-picker-select"
            value={selectedTeacherId}
            onChange={(e) => onSelectTeacherId(e.target.value)}
            aria-label="Select teacher profile"
          >
            {teachers.length === 0 ? (
              <option value="">No teachers in Firestore</option>
            ) : null}
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.role})
              </option>
            ))}
          </select>
        </label>

        <div className="meta-item">
          <span className="meta-label">Role</span>
          <span className="meta-value">{selected?.role ?? '—'}</span>
        </div>

        <div className="meta-item">
          <span className="meta-label">Department</span>
          <span className="meta-value">{selected?.department ?? '—'}</span>
        </div>

        <Link className="portal-switch-link" to="/">
          Admin view
        </Link>

        <button className="sign-out-button" type="button">
          Sign Out
        </button>
      </div>
    </header>
  );
}

function AdminLayout() {
  const { teachers, firestoreError } = usePdData();
  const adminUser = useMemo(
    () => teachers.find((t) => t.role === 'Administrator') || null,
    [teachers]
  );
  return (
    <div className="app-shell">
      <AdminHeader
        adminName={adminUser?.name ?? '—'}
        department={adminUser?.department ?? 'Professional Learning'}
      />
      {firestoreError ? (
        <div className="firestore-error-banner" role="alert">
          Firestore (project {firebaseProjectId}): {firestoreError}
        </div>
      ) : null}
      <div className="app-shell-body">
        <Outlet />
      </div>
    </div>
  );
}

function TeacherLayout() {
  const { teachers, selectedTeacherId, setSelectedTeacherId, firestoreError } = usePdData();
  return (
    <div className="app-shell">
      <TeacherHeader
        teachers={teachers}
        selectedTeacherId={selectedTeacherId}
        onSelectTeacherId={setSelectedTeacherId}
      />
      {firestoreError ? (
        <div className="firestore-error-banner" role="alert">
          Firestore (project {firebaseProjectId}): {firestoreError}
        </div>
      ) : null}
      <div className="app-shell-body">
        <Outlet />
      </div>
    </div>
  );
}

function DashboardPage() {
  const { teachers, events } = usePdData();
  const { pastCount, futureCount } = useMemo(() => {
    const today = todayCalendarDateString();
    let past = 0;
    let future = 0;
    events.forEach((e) => {
      const s = calendarDateStringFromEvent(e);
      if (!s) return;
      if (s < today) past += 1;
      else future += 1;
    });
    return { pastCount: past, futureCount: future };
  }, [events]);

  return (
    <main className="admin-main-grid">
      <section className="panel-card calendar-panel">
        <MonthCalendar variant="compact" eventsByDayKey={buildEventsByDayKey(events)} />
        <div className="calendar-panel-footer">
          <Link className="calendar-open-full-link" to="/calendar">
            Open full calendar
          </Link>
        </div>
      </section>

      <section className="right-panel-layout">
        <Link className="panel-link" to="/teachers">
          <section className="panel-card">
            <div className="panel-heading-row">
              <h2 className="panel-title">Teacher View</h2>
            </div>
            {teachers.length === 0 ? (
              <p className="empty-inline-note">No teachers yet. Add some under Teacher View.</p>
            ) : (
              <ul className="teacher-list">
                {teachers.map((t) => (
                  <li key={t.id}>{t.name}</li>
                ))}
              </ul>
            )}
          </section>
        </Link>

        <section className="events-split-grid">
          <Link className="panel-link" to="/past-events">
            <section className="panel-card">
              <h2 className="panel-title">Past Events</h2>
              {pastCount === 0 ? (
                <p className="empty-inline-note">No past events yet.</p>
              ) : (
                <p className="events-count-pill">{pastCount} event{pastCount === 1 ? '' : 's'}</p>
              )}
            </section>
          </Link>

          <Link className="panel-link" to="/future-events">
            <section className="panel-card">
              <h2 className="panel-title">Future Events</h2>
              {futureCount === 0 ? (
                <p className="empty-inline-note">No future events yet.</p>
              ) : (
                <p className="events-count-pill">{futureCount} event{futureCount === 1 ? '' : 's'}</p>
              )}
            </section>
          </Link>
        </section>
      </section>
    </main>
  );
}

function DetailPage({
  title,
  children,
  backTo = '/',
  backLabel = 'Back to Dashboard',
  calendarFullscreen = false,
}) {
  return (
    <main
      className={
        calendarFullscreen ? 'detail-page-wrap detail-page-wrap--calendar' : 'detail-page-wrap'
      }
    >
      <section
        className={
          calendarFullscreen ? 'detail-card detail-card--calendar' : 'panel-card detail-card'
        }
      >
        <div
          className={
            calendarFullscreen ? 'panel-heading-row calendar-page-toolbar' : 'panel-heading-row'
          }
        >
          <h2 className={calendarFullscreen ? 'detail-title calendar-page-title' : 'detail-title'}>
            {title}
          </h2>
          <Link className="back-link" to={backTo}>
            {backLabel}
          </Link>
        </div>
        {children}
      </section>
    </main>
  );
}

function MonthCalendar({
  variant = 'compact',
  eventsByDayKey = {},
  enableEventSignup = false,
  selectedTeacherId = '',
  signedUpEventIds = new Set(),
}) {
  const today = new Date();
  const [view, setView] = useState(() => ({
    year: today.getFullYear(),
    month: today.getMonth(),
  }));
  const [pickerDay, setPickerDay] = useState(null);
  const [signupBusyId, setSignupBusyId] = useState(null);
  const [signupMessage, setSignupMessage] = useState(null);

  const { year, month } = view;
  const isLarge = variant === 'large';
  const showWeekColumn = isLarge;

  const shiftMonth = (delta) => {
    setView((v) => {
      const d = new Date(v.year, v.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const shiftYear = (delta) => {
    setView((v) => ({ ...v, year: v.year + delta }));
  };

  const goToToday = () => {
    setView({ year: today.getFullYear(), month: today.getMonth() });
  };

  const weeks = buildCalendarWeeks(year, month);

  const monthName = new Date(year, month, 1).toLocaleString('default', {
    month: 'long',
  });

  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const isTodayCell = (d) => sameDay(d, today);

  const shellClass = [
    'calendar-shell',
    isLarge ? 'calendar-shell--large' : 'calendar-shell--compact',
  ].join(' ');

  const gridTemplateColumns = showWeekColumn
    ? 'var(--calendar-week-col) repeat(7, minmax(0, 1fr))'
    : 'repeat(7, minmax(0, 1fr))';

  const gridTemplateRows = isLarge
    ? `auto repeat(${weeks.length}, minmax(4rem, 1fr))`
    : `auto repeat(${weeks.length}, minmax(2.4rem, 3.5rem))`;

  const pickerKey = pickerDay ? calendarDayKey(pickerDay) : null;
  const pickerEvents = pickerKey ? eventsByDayKey[pickerKey] || [] : [];

  const handleSignup = async (eventId) => {
    if (!selectedTeacherId) {
      setSignupMessage('Choose a teacher profile in the header first.');
      return;
    }
    setSignupMessage(null);
    setSignupBusyId(eventId);
    try {
      await signupTeacherForEvent(selectedTeacherId, eventId);
    } catch (err) {
      setSignupMessage(err?.message || 'Could not sign up.');
    } finally {
      setSignupBusyId(null);
    }
  };

  const handleCancelSignup = async (eventId) => {
    if (!selectedTeacherId) return;
    setSignupBusyId(eventId);
    try {
      await removeTeacherEventSignup(selectedTeacherId, eventId);
    } catch (err) {
      setSignupMessage(err?.message || 'Could not remove signup.');
    } finally {
      setSignupBusyId(null);
    }
  };

  const renderCell = (dayDate, inMonth) => {
    const key = calendarDayKey(dayDate);
    const dayEvents = eventsByDayKey[key] || [];
    const hasEvents = dayEvents.length > 0;
    const interactive =
      Boolean(enableEventSignup && selectedTeacherId && inMonth && hasEvents);

    const cellClass = [
      'calendar-cell-pro',
      !inMonth ? 'is-other-month' : '',
      isTodayCell(dayDate) ? 'is-today' : '',
      hasEvents ? 'has-events' : '',
      interactive ? 'is-clickable' : '',
    ]
      .filter(Boolean)
      .join(' ');

    const inner = (
      <>
        <span className="calendar-cell-date">{dayDate.getDate()}</span>
        {hasEvents ? <span className="calendar-event-dot" aria-hidden="true" /> : null}
      </>
    );

    if (interactive) {
      return (
        <button
          key={key}
          type="button"
          className={cellClass}
          onClick={() => setPickerDay(dayDate)}
          aria-label={`View events on ${dayDate.toDateString()}`}
        >
          {inner}
        </button>
      );
    }

    return (
      <div key={key} className={cellClass}>
        {inner}
      </div>
    );
  };

  return (
    <section className={shellClass} aria-label="Monthly calendar">
      <header className="calendar-header">
        <div className="calendar-nav">
          <button
            type="button"
            className="calendar-nav-btn"
            onClick={() => shiftYear(-1)}
            aria-label="Previous year"
          >
            «
          </button>
          <button
            type="button"
            className="calendar-nav-btn"
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
          >
            ‹
          </button>
          <h2 className="calendar-title">
            {monthName}{' '}
            <span className="calendar-title-year">{year}</span>
          </h2>
          <button
            type="button"
            className="calendar-nav-btn"
            onClick={() => shiftMonth(1)}
            aria-label="Next month"
          >
            ›
          </button>
          <button
            type="button"
            className="calendar-nav-btn"
            onClick={() => shiftYear(1)}
            aria-label="Next year"
          >
            »
          </button>
        </div>
        <button type="button" className="calendar-today-btn" onClick={goToToday}>
          Today
        </button>
      </header>
      <div
        className="calendar-grid-pro"
        style={{
          gridTemplateColumns,
          gridTemplateRows,
        }}
      >
        {showWeekColumn ? <div className="calendar-grid-corner" aria-hidden="true" /> : null}
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="calendar-day-head">
            {label}
          </div>
        ))}
        {weeks.map((week) => (
          <Fragment key={calendarDayKey(week[0])}>
            {showWeekColumn ? (
              <div className="calendar-week-label">CW {isoWeekNumber(week[0])}</div>
            ) : null}
            {week.map((dayDate) => {
              const inMonth = dayDate.getMonth() === month;
              return renderCell(dayDate, inMonth);
            })}
          </Fragment>
        ))}
      </div>

      {pickerDay ? (
        <div
          className="calendar-signup-backdrop"
          role="presentation"
          onClick={() => setPickerDay(null)}
        >
          <div
            className="calendar-signup-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Events on this day"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="calendar-signup-modal-header">
              <h3 className="calendar-signup-modal-title">
                {pickerDay.toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </h3>
              <button
                type="button"
                className="calendar-signup-close"
                onClick={() => setPickerDay(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            {pickerEvents.length === 0 ? (
              <p className="calendar-signup-empty">No events on this day.</p>
            ) : (
              <ul className="calendar-signup-list">
                {pickerEvents.map((ev) => {
                  const signedUp = signedUpEventIds.has(ev.id);
                  const busy = signupBusyId === ev.id;
                  return (
                    <li key={ev.id} className="calendar-signup-row">
                      <div>
                        <p className="calendar-signup-event-name">{ev.name}</p>
                        <p className="calendar-signup-meta">
                          {formatEventDateField(ev.date)} · {ev.hours ?? 0} h
                          {ev.certification ? ` · ${ev.certification}` : ''}
                        </p>
                      </div>
                      {enableEventSignup ? (
                        <div className="calendar-signup-actions">
                          {signedUp ? (
                            <button
                              type="button"
                              className="event-action-button ghost"
                              disabled={busy}
                              onClick={() => handleCancelSignup(ev.id)}
                            >
                              {busy ? '…' : 'Leave'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="event-action-button"
                              disabled={busy}
                              onClick={() => handleSignup(ev.id)}
                            >
                              {busy ? '…' : 'Sign up'}
                            </button>
                          )}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
            {signupMessage ? <p className="calendar-signup-error">{signupMessage}</p> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function TeacherDashboardPage() {
  const {
    events,
    signups,
    selectedTeacherId,
    selectedTeacher,
    eventsById,
    signedUpEventIdsForSelected,
  } = usePdData();

  const mySignups = useMemo(
    () => signups.filter((s) => s.teacherId === selectedTeacherId),
    [signups, selectedTeacherId]
  );

  const signedUpEvents = useMemo(
    () =>
      mySignups
        .map((s) => eventsById.get(s.eventId))
        .filter(Boolean),
    [mySignups, eventsById]
  );

  const certificateCount = useMemo(
    () => signedUpEvents.filter((e) => e.certification && String(e.certification).trim() !== '').length,
    [signedUpEvents]
  );

  const hoursDisplay =
    selectedTeacher && typeof selectedTeacher.hours === 'number' ? selectedTeacher.hours : 0;

  return (
    <main className="admin-main-grid teacher-dashboard">
      <section className="panel-card calendar-panel">
        <MonthCalendar
          variant="compact"
          eventsByDayKey={buildEventsByDayKey(events)}
          enableEventSignup
          selectedTeacherId={selectedTeacherId}
          signedUpEventIds={signedUpEventIdsForSelected}
        />
        <div className="calendar-panel-footer">
          <Link className="calendar-open-full-link" to="/teacher/calendar">
            Open full calendar
          </Link>
        </div>
      </section>

      <section className="teacher-right-stack">
        <section className="panel-card teacher-section-card">
          <h2 className="panel-title">Personal information</h2>
          {selectedTeacher ? (
            <dl className="teacher-info-grid">
              <div>
                <dt>Full name</dt>
                <dd>{selectedTeacher.name}</dd>
              </div>
              <div>
                <dt>School email</dt>
                <dd>{selectedTeacher.email}</dd>
              </div>
              <div>
                <dt>Department</dt>
                <dd>{selectedTeacher.department}</dd>
              </div>
              <div>
                <dt>Campus</dt>
                <dd>{selectedTeacher.campus}</dd>
              </div>
              <div>
                <dt>Age</dt>
                <dd>{selectedTeacher.age}</dd>
              </div>
            </dl>
          ) : (
            <p className="empty-inline-note">Add a teacher in the admin Teacher View to get started.</p>
          )}
        </section>

        <section className="panel-card teacher-section-card">
          <div className="program-menu" aria-label="Programs">
            <div className="program-block">
              <h3 className="program-subtitle">Signed up:</h3>
              {signedUpEvents.length === 0 ? (
                <p className="program-empty">Tap a date with an event on the calendar to sign up.</p>
              ) : (
                <ul className="program-list">
                  {signedUpEvents.map((e) => (
                    <li key={e.id}>{e.name}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="program-block">
              <h3 className="program-subtitle">Completed:</h3>
              <p className="program-empty">Not tracked yet.</p>
            </div>
          </div>
        </section>

        <section className="panel-card teacher-stats-card">
          <div className="teacher-stat">
            <span className="teacher-stat-label">PD hours (on record)</span>
            <strong className="teacher-stat-value">{hoursDisplay}</strong>
            <span className="teacher-stat-hint">Stored on teacher profile</span>
          </div>
          <div className="teacher-stat-divider" aria-hidden="true" />
          <div className="teacher-stat">
            <span className="teacher-stat-label">Cert. events signed up</span>
            <strong className="teacher-stat-value">{certificateCount}</strong>
            <span className="teacher-stat-hint">Events with a certification label</span>
          </div>
        </section>
      </section>
    </main>
  );
}

function CalendarPage() {
  const { events } = usePdData();
  return (
    <DetailPage title="Calendar" calendarFullscreen>
      <MonthCalendar variant="large" eventsByDayKey={buildEventsByDayKey(events)} />
    </DetailPage>
  );
}

function TeacherCalendarPage() {
  const { events, selectedTeacherId, signedUpEventIdsForSelected } = usePdData();
  return (
    <DetailPage title="Calendar" backTo="/teacher" backLabel="Back to my dashboard" calendarFullscreen>
      <MonthCalendar
        variant="large"
        eventsByDayKey={buildEventsByDayKey(events)}
        enableEventSignup
        selectedTeacherId={selectedTeacherId}
        signedUpEventIds={signedUpEventIdsForSelected}
      />
    </DetailPage>
  );
}

function TeachersPage() {
  const { teachers } = usePdData();
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [age, setAge] = useState('');
  const [campus, setCampus] = useState(TEACHER_CAMPUSES[0]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Teacher');
  const [hours, setHours] = useState('0');
  const [savingId, setSavingId] = useState(null);
  const [formError, setFormError] = useState(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError(null);
    const trimmedName = name.trim();
    if (!trimmedName || !department.trim() || !email.trim()) {
      setFormError('Name, department, and email are required.');
      return;
    }
    const ageNum = Number(age);
    if (!Number.isFinite(ageNum) || ageNum < 0) {
      setFormError('Age must be a valid number.');
      return;
    }
    try {
      await createTeacher({
        name: trimmedName,
        department: department.trim(),
        age: ageNum,
        campus,
        email: email.trim(),
        role,
        hours: Number(hours) || 0,
      });
      setName('');
      setDepartment('');
      setAge('');
      setEmail('');
      setHours('0');
    } catch (err) {
      setFormError(err?.message || 'Could not save teacher.');
    }
  };

  const saveHours = async (teacherId, value) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return;
    setSavingId(teacherId);
    try {
      await updateTeacher(teacherId, { hours: n });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <DetailPage title="Teacher View">
      <section className="teachers-admin">
        <h3 className="teachers-section-title">All teachers</h3>
        {teachers.length === 0 ? (
          <p className="empty-inline-note">No teachers yet. Add one with the form below.</p>
        ) : (
          <ul className="teacher-detail-list">
            {teachers.map((t) => (
              <li key={t.id} className="teacher-detail-card">
                <div className="teacher-detail-main">
                  <p className="teacher-detail-name">{t.name}</p>
                  <p className="teacher-detail-line">
                    {t.email} · {t.department} · {t.campus}
                  </p>
                  <p className="teacher-detail-line">
                    Role: {t.role} · Age: {t.age}
                  </p>
                </div>
                <label className="teacher-hours-field">
                  Hours
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    defaultValue={t.hours ?? 0}
                    key={`${t.id}-${t.hours}`}
                    disabled={savingId === t.id}
                    onBlur={(e) => saveHours(t.id, e.target.value)}
                  />
                </label>
              </li>
            ))}
          </ul>
        )}

        <h3 className="teachers-section-title">Add teacher</h3>
        <form className="event-form-card teacher-create-form" onSubmit={handleCreate}>
          <label htmlFor="t-name">Name</label>
          <input
            id="t-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <label htmlFor="t-dept">Department</label>
          <input
            id="t-dept"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            required
          />

          <label htmlFor="t-age">Age</label>
          <input
            id="t-age"
            type="number"
            min="0"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            required
          />

          <label htmlFor="t-campus">Campus</label>
          <select id="t-campus" value={campus} onChange={(e) => setCampus(e.target.value)}>
            {TEACHER_CAMPUSES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <label htmlFor="t-email">Email</label>
          <input id="t-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

          <label htmlFor="t-role">Role</label>
          <select id="t-role" value={role} onChange={(e) => setRole(e.target.value)}>
            {TEACHER_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <label htmlFor="t-hours">Hours (on record)</label>
          <input
            id="t-hours"
            type="number"
            min="0"
            step="0.5"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
          />

          {formError ? <p className="calendar-signup-error">{formError}</p> : null}

          <div className="event-form-actions">
            <button className="event-action-button" type="submit">
              Save teacher
            </button>
          </div>
        </form>
      </section>
    </DetailPage>
  );
}

function EventsManagerPage({ mode }) {
  const { events, teachers } = usePdData();
  const filtered = useMemo(
    () => events.filter((e) => eventMatchesListMode(mode, e)),
    [events, mode]
  );

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventHours, setEventHours] = useState('1');
  const [eventCert, setEventCert] = useState('');
  const [formError, setFormError] = useState(null);

  const title = mode === 'past' ? 'Past Events' : 'Future Events';

  const handleAddEvent = async (e) => {
    e.preventDefault();
    setFormError(null);
    const trimmedName = eventName.trim();
    if (!trimmedName || !eventDate) {
      return;
    }
    const h = Number(eventHours);
    if (!Number.isFinite(h) || h < 0) {
      setFormError('Hours must be a valid non-negative number.');
      return;
    }
    const todayStr = todayCalendarDateString();
    if (mode === 'past' && eventDate >= todayStr) {
      setFormError(
        'Past events must use a date before today. For today or later, add the event under Future Events.'
      );
      return;
    }
    if (mode === 'future' && eventDate < todayStr) {
      setFormError(
        'Future events must use today or a later date. For earlier dates, add the event under Past Events.'
      );
      return;
    }
    try {
      await createEvent({
        name: trimmedName,
        date: dateInputToTimestamp(eventDate),
        hours: h,
        certification: eventCert.trim(),
      });
      setEventName('');
      setEventDate('');
      setEventHours('1');
      setEventCert('');
      setIsFormOpen(false);
    } catch (err) {
      const code = err?.code;
      const msg =
        code === 'permission-denied'
          ? 'Firestore blocked this write. Deploy open rules from pdapp/firestore.rules or fix security rules in the Firebase console.'
          : err?.message || 'Could not save event.';
      setFormError(msg);
    }
  };

  const isAdmin = teachers.some((t) => t.role === 'Administrator');

  return (
    <DetailPage title={title}>
      <section className="events-manager">
        <p className="events-page-hint">
          {mode === 'past'
            ? 'Only events dated before today appear here. Events for today or later belong under Future Events.'
            : 'Only events dated today or later appear here. Earlier dates belong under Past Events.'}
        </p>
        {filtered.length === 0 ? (
          <p className="events-empty-message">
            No {mode === 'past' ? 'past' : 'future'} events yet. Click + to add one.
          </p>
        ) : (
          <div className="accordion-list">
            {filtered.map((event) => (
              <details key={event.id} className="event-accordion-item">
                <summary>
                  <span>{event.name}</span>
                  <span>{formatEventDateField(event.date)}</span>
                </summary>
                <div className="event-accordion-content">
                  <p>
                    <strong>Event:</strong> {event.name}
                  </p>
                  <p>
                    <strong>Date:</strong> {formatEventDateField(event.date)}
                  </p>
                  <p>
                    <strong>Hours:</strong> {event.hours ?? 0}
                  </p>
                  <p>
                    <strong>Certification:</strong>{' '}
                    {event.certification && String(event.certification).trim() !== ''
                      ? event.certification
                      : '—'}
                  </p>
                  {isAdmin ? (
                    <div className="event-admin-actions">
                      <button
                        type="button"
                        className="event-delete-button"
                        onClick={async () => {
                          if (!window.confirm('Delete this event?')) return;
                          try {
                            await deleteEvent(String(event.id));
                          } catch (err) {
                            alert('Delete failed: ' + (err?.message || err));
                          }
                        }}
                      >
                        Delete Event
                      </button>
                    </div>
                  ) : null}
                </div>
              </details>
            ))}
          </div>
        )}

        {isFormOpen ? (
          <form className="event-form-card" onSubmit={handleAddEvent}>
            <label htmlFor={`${mode}-event-name`}>Event Name</label>
            <input
              id={`${mode}-event-name`}
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="Enter event name"
              required
            />

            <label htmlFor={`${mode}-event-date`}>Date</label>
            <input
              id={`${mode}-event-date`}
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              required
            />

            <label htmlFor={`${mode}-event-hours`}>Hours</label>
            <input
              id={`${mode}-event-hours`}
              type="number"
              min="0"
              step="0.5"
              value={eventHours}
              onChange={(e) => setEventHours(e.target.value)}
              required
            />

            <label htmlFor={`${mode}-event-cert`}>Certification (optional)</label>
            <input
              id={`${mode}-event-cert`}
              type="text"
              value={eventCert}
              onChange={(e) => setEventCert(e.target.value)}
              placeholder="e.g. First Aid refresher"
            />

            {formError ? <p className="calendar-signup-error">{formError}</p> : null}

            <div className="event-form-actions">
              <button className="event-action-button" type="submit">
                Add Event
              </button>
              <button
                className="event-action-button ghost"
                type="button"
                onClick={() => setIsFormOpen(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        <button
          className="add-event-fab"
          type="button"
          onClick={() => setIsFormOpen((prev) => !prev)}
          aria-label={`Add ${mode} event`}
        >
          +
        </button>
      </section>
    </DetailPage>
  );
}

function App() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/teachers" element={<TeachersPage />} />
        <Route path="/past-events" element={<EventsManagerPage mode="past" />} />
        <Route path="/future-events" element={<EventsManagerPage mode="future" />} />
      </Route>
      <Route element={<TeacherLayout />}>
        <Route path="/teacher" element={<TeacherDashboardPage />} />
        <Route path="/teacher/calendar" element={<TeacherCalendarPage />} />
      </Route>
    </Routes>
  );
}

export default App;
