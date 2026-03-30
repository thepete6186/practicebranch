import './App.css';
import { Link, Outlet, Route, Routes } from 'react-router-dom';
import { Fragment, useState } from 'react';

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

function AdminHeader() {
  return (
    <header className="admin-header">
      <div className="brand-group">
        <p className="brand-eyebrow">Professional Development Tracker</p>
        <h1 className="brand-title">Administrator Dashboard</h1>
      </div>

      <div className="admin-meta">
        <div className="meta-item">
          <span className="meta-label">Teacher</span>
          <span className="meta-value">Jane Doe</span>
        </div>

        <div className="meta-item">
          <span className="meta-label">Role</span>
          <span className="meta-value">Admin</span>
        </div>

        <div className="meta-item">
          <span className="meta-label">Department</span>
          <span className="meta-value">Professional Learning</span>
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

function TeacherHeader() {
  return (
    <header className="admin-header teacher-header-accent">
      <div className="brand-group">
        <p className="brand-eyebrow">Professional Development Tracker</p>
        <h1 className="brand-title">My Dashboard</h1>
      </div>

      <div className="admin-meta">
        <div className="meta-item">
          <span className="meta-label">Name</span>
          <span className="meta-value">Jane Doe</span>
        </div>

        <div className="meta-item">
          <span className="meta-label">Role</span>
          <span className="meta-value">Teacher</span>
        </div>

        <div className="meta-item">
          <span className="meta-label">Department</span>
          <span className="meta-value">Mathematics</span>
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
  return (
    <div className="app-shell">
      <AdminHeader />
      <div className="app-shell-body">
        <Outlet />
      </div>
    </div>
  );
}

function TeacherLayout() {
  return (
    <div className="app-shell">
      <TeacherHeader />
      <div className="app-shell-body">
        <Outlet />
      </div>
    </div>
  );
}

function DashboardPage() {
  return (
    <main className="admin-main-grid">
      <section className="panel-card calendar-panel">
        <MonthCalendar variant="compact" />
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
            <ul className="teacher-list">
              <li>Jane Doe</li>
              <li>Michael Reed</li>
              <li>Anika Patel</li>
              <li>Jordan Kim</li>
            </ul>
          </section>
        </Link>

        <section className="events-split-grid">
          <Link className="panel-link" to="/past-events">
            <section className="panel-card">
              <h2 className="panel-title">Past Events</h2>
              <p className="empty-inline-note">No events yet.</p>
            </section>
          </Link>

          <Link className="panel-link" to="/future-events">
            <section className="panel-card">
              <h2 className="panel-title">Future Events</h2>
              <p className="empty-inline-note">No events yet.</p>
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
          calendarFullscreen
            ? 'detail-card detail-card--calendar'
            : 'panel-card detail-card'
        }
      >
        <div
          className={
            calendarFullscreen
              ? 'panel-heading-row calendar-page-toolbar'
              : 'panel-heading-row'
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

function MonthCalendar({ variant = 'compact' }) {
  const today = new Date();
  const [view, setView] = useState(() => ({
    year: today.getFullYear(),
    month: today.getMonth(),
  }));

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
        {showWeekColumn ? (
          <>
            <div className="calendar-grid-corner" aria-hidden="true" />
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="calendar-day-head">
                {label}
              </div>
            ))}
            {weeks.map((week) => (
              <Fragment key={calendarDayKey(week[0])}>
                <div className="calendar-week-label">CW {isoWeekNumber(week[0])}</div>
                {week.map((dayDate) => {
                  const inMonth = dayDate.getMonth() === month;
                  return (
                    <div
                      key={calendarDayKey(dayDate)}
                      className={[
                        'calendar-cell-pro',
                        !inMonth ? 'is-other-month' : '',
                        isTodayCell(dayDate) ? 'is-today' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <span className="calendar-cell-date">{dayDate.getDate()}</span>
                    </div>
                  );
                })}
              </Fragment>
            ))}
          </>
        ) : (
          <>
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="calendar-day-head">
                {label}
              </div>
            ))}
            {weeks.map((week) => (
              <Fragment key={calendarDayKey(week[0])}>
                {week.map((dayDate) => {
                  const inMonth = dayDate.getMonth() === month;
                  return (
                    <div
                      key={calendarDayKey(dayDate)}
                      className={[
                        'calendar-cell-pro',
                        !inMonth ? 'is-other-month' : '',
                        isTodayCell(dayDate) ? 'is-today' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <span className="calendar-cell-date">{dayDate.getDate()}</span>
                    </div>
                  );
                })}
              </Fragment>
            ))}
          </>
        )}
      </div>
    </section>
  );
}

function TeacherDashboardPage() {
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
          <dl className="teacher-info-grid">
            <div>
              <dt>Full name</dt>
              <dd>Jane Doe</dd>
            </div>
            <div>
              <dt>School email</dt>
              <dd>jane.doe@schooldistrict.edu</dd>
            </div>
            <div>
              <dt>Department</dt>
              <dd>Mathematics</dd>
            </div>
            <div>
              <dt>Campus</dt>
              <dd>Riverside High School</dd>
            </div>
          </dl>
        </section>

        <section className="panel-card teacher-section-card">
          <div className="program-menu" aria-label="Programs">
            <div className="program-block">
              <h3 className="program-subtitle">Signed up:</h3>
              <ul className="program-list" />
            </div>
            <div className="program-block">
              <h3 className="program-subtitle">Completed:</h3>
              <ul className="program-list" />
            </div>
          </div>
        </section>

        <section className="panel-card teacher-stats-card">
          <div className="teacher-stat">
            <span className="teacher-stat-label">Hours attended</span>
            <strong className="teacher-stat-value">24.5</strong>
            <span className="teacher-stat-hint">This school year</span>
          </div>
          <div className="teacher-stat-divider" aria-hidden="true" />
          <div className="teacher-stat">
            <span className="teacher-stat-label">Certificates earned</span>
            <strong className="teacher-stat-value">3</strong>
            <span className="teacher-stat-hint">All time</span>
          </div>
        </section>
      </section>
    </main>
  );
}

function CalendarPage() {
  return (
    <DetailPage title="Calendar" calendarFullscreen>
      <MonthCalendar variant="large" />
    </DetailPage>
  );
}

function TeacherCalendarPage() {
  return (
    <DetailPage title="Calendar" backTo="/teacher" backLabel="Back to my dashboard" calendarFullscreen>
      <MonthCalendar variant="large" />
    </DetailPage>
  );
}

function TeachersPage() {
  return (
    <DetailPage title="Teacher View">
      <ul className="teacher-list detail-list">
        <li>Jane Doe</li>
        <li>Michael Reed</li>
        <li>Anika Patel</li>
        <li>Jordan Kim</li>
      </ul>
    </DetailPage>
  );
}

function PastEventsPage() {
  const [events, setEvents] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');

  const handleAddEvent = (e) => {
    e.preventDefault();
    const trimmedName = eventName.trim();
    if (!trimmedName || !eventDate) {
      return;
    }

    setEvents((prev) => [
      ...prev,
      {
        id: `${trimmedName}-${eventDate}-${Date.now()}`,
        name: trimmedName,
        date: eventDate,
      },
    ]);
    setEventName('');
    setEventDate('');
    setIsFormOpen(false);
  };

  return (
    <DetailPage title="Past Events">
      <section className="events-manager">
        {events.length === 0 ? (
          <p className="events-empty-message">
            No past events yet. Click + to add an event and date.
          </p>
        ) : (
          <div className="accordion-list">
            {events.map((event) => (
              <details key={event.id} className="event-accordion-item">
                <summary>
                  <span>{event.name}</span>
                  <span>{new Date(event.date).toLocaleDateString()}</span>
                </summary>
                <div className="event-accordion-content">
                  <p>
                    <strong>Event:</strong> {event.name}
                  </p>
                  <p>
                    <strong>Date:</strong> {new Date(event.date).toLocaleDateString()}
                  </p>
                </div>
              </details>
            ))}
          </div>
        )}

        {isFormOpen ? (
          <form className="event-form-card" onSubmit={handleAddEvent}>
            <label htmlFor="past-event-name">Event Name</label>
            <input
              id="past-event-name"
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="Enter event name"
              required
            />

            <label htmlFor="past-event-date">Date</label>
            <input
              id="past-event-date"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              required
            />

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
          aria-label="Add past event"
        >
          +
        </button>
      </section>
    </DetailPage>
  );
}

function FutureEventsPage() {
  const [events, setEvents] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');

  const handleAddEvent = (e) => {
    e.preventDefault();
    const trimmedName = eventName.trim();
    if (!trimmedName || !eventDate) {
      return;
    }

    setEvents((prev) => [
      ...prev,
      {
        id: `${trimmedName}-${eventDate}-${Date.now()}`,
        name: trimmedName,
        date: eventDate,
      },
    ]);
    setEventName('');
    setEventDate('');
    setIsFormOpen(false);
  };

  return (
    <DetailPage title="Future Events">
      <section className="events-manager">
        {events.length === 0 ? (
          <p className="events-empty-message">
            No future events yet. Click + to add an event and date.
          </p>
        ) : (
          <div className="accordion-list">
            {events.map((event) => (
              <details key={event.id} className="event-accordion-item">
                <summary>
                  <span>{event.name}</span>
                  <span>{new Date(event.date).toLocaleDateString()}</span>
                </summary>
                <div className="event-accordion-content">
                  <p>
                    <strong>Event:</strong> {event.name}
                  </p>
                  <p>
                    <strong>Date:</strong> {new Date(event.date).toLocaleDateString()}
                  </p>
                </div>
              </details>
            ))}
          </div>
        )}

        {isFormOpen ? (
          <form className="event-form-card" onSubmit={handleAddEvent}>
            <label htmlFor="future-event-name">Event Name</label>
            <input
              id="future-event-name"
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="Enter event name"
              required
            />

            <label htmlFor="future-event-date">Date</label>
            <input
              id="future-event-date"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              required
            />

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
          aria-label="Add future event"
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
        <Route path="/past-events" element={<PastEventsPage />} />
        <Route path="/future-events" element={<FutureEventsPage />} />
      </Route>
      <Route element={<TeacherLayout />}>
        <Route path="/teacher" element={<TeacherDashboardPage />} />
        <Route path="/teacher/calendar" element={<TeacherCalendarPage />} />
      </Route>
    </Routes>
  );
}

export default App;
