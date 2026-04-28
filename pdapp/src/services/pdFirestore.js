import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';

export const TEACHER_CAMPUSES = ['Tai Tam', 'Repulse Bay'];
export const TEACHER_ROLES = ['Teacher', 'Administrator'];

const teachersCol = () => collection(db, 'teachers');
const eventsCol = () => collection(db, 'events');
const signupsCol = () => collection(db, 'eventSignups');

/** Ensure Timestamp API after round-trip / mixed SDK data. */
function coerceFirestoreTimestamp(val) {
  if (!val) return null;
  if (typeof val.toMillis === 'function') return val;
  if (typeof val.seconds === 'number') {
    return new Timestamp(val.seconds, val.nanoseconds || 0);
  }
  return null;
}

function mapEventDoc(d) {
  const data = d.data();
  const date = coerceFirestoreTimestamp(data.date);
  const certifications =
    typeof data.certifications === 'string'
      ? data.certifications
      : typeof data.certification === 'string'
        ? data.certification
        : '';
  return {
    id: d.id,
    ...data,
    certifications,
    ...(date ? { date } : {}),
  };
}

/** @param {string} dateStr YYYY-MM-DD from <input type="date"> */
export function dateInputToTimestamp(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Timestamp.fromDate(new Date(y, m - 1, d));
}

export function startOfTodayTimestamp() {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return Timestamp.fromDate(t);
}

/** Milliseconds for sorting/filtering; supports Firestore Timestamp and plain {seconds,nanoseconds}. */
export function eventDateMillis(evOrDateField) {
  const d = evOrDateField?.date !== undefined ? evOrDateField.date : evOrDateField;
  if (!d) return null;
  if (typeof d.toMillis === 'function') return d.toMillis();
  if (typeof d.seconds === 'number') {
    return d.seconds * 1000 + (d.nanoseconds || 0) / 1e6;
  }
  return null;
}

export function dateFieldToJsDate(d) {
  if (!d) return null;
  if (typeof d.toDate === 'function') return d.toDate();
  if (typeof d.seconds === 'number') return new Date(d.seconds * 1000);
  return null;
}

export function formatEventDateField(d) {
  const js = dateFieldToJsDate(d);
  return js ? js.toLocaleDateString() : '—';
}

/** Same calendar key logic as `calendarDayKey` for `Date` objects in App.js */
export function calendarDayKeyFromDateField(ts) {
  const d = dateFieldToJsDate(ts);
  if (!d) return '';
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Local calendar today as YYYY-MM-DD (matches `<input type="date">`). */
export function todayCalendarDateString() {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const day = String(t.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function calendarDateStringFromEvent(ev) {
  const d = dateFieldToJsDate(ev?.date);
  if (!d) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function eventMatchesListMode(mode, ev) {
  const s = calendarDateStringFromEvent(ev);
  if (!s) return false;
  const today = todayCalendarDateString();
  if (mode === 'past') return s < today;
  return s >= today;
}

export function signupDocId(eventId, teacherId) {
  return `${eventId}_${teacherId}`;
}

export function subscribeTeachers(onData, onError) {
  return onSnapshot(
    teachersCol(),
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
      onData(list);
    },
    onError
  );
}

export function subscribeEvents(onData, onError) {
  return onSnapshot(
    eventsCol(),
    (snap) => {
      const list = snap.docs.map((d) => mapEventDoc(d));
      list.sort((a, b) => (eventDateMillis(b) || 0) - (eventDateMillis(a) || 0));
      onData(list);
    },
    onError
  );
}

export function subscribeEventSignups(onData, onError) {
  return onSnapshot(
    signupsCol(),
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      onData(list);
    },
    onError
  );
}

export async function createTeacher(data) {
  const groupCode =
    typeof data.groupCode === 'string' && data.groupCode.trim() !== ''
      ? data.groupCode.trim()
      : '';
  await addDoc(teachersCol(), {
    name: data.name,
    department: data.department,
    age: Number(data.age),
    campus: data.campus,
    email: data.email,
    role: data.role,
    hours: Number(data.hours) || 0,
    groupCode,
  });
}

export async function createAdministrator(data) {
  await addDoc(collection(db, 'administrators'), {
    email: data.email,
    schoolName: data.schoolName,
    country: data.country,
    createdAt: serverTimestamp(),
  });
}

export async function updateTeacher(teacherId, patch) {
  await updateDoc(doc(db, 'teachers', teacherId), patch);
}

export async function createEvent(data) {
  const certifications =
    typeof data.certifications === 'string' && data.certifications.trim() !== ''
      ? data.certifications.trim()
      : '';
  const description =
    typeof data.description === 'string' && data.description.trim() !== ''
      ? data.description.trim()
      : '';

  const docRef = await addDoc(eventsCol(), {
    name: data.name,
    date: data.date,
    hours: Number(data.hours) || 0,
    certifications,
    // Keep legacy field for backward compatibility with older reads.
    certification: certifications,
    description,
  });

  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw new Error(
      'Firestore did not return the new event after save. Check rules and that the Firestore database exists for this project.'
    );
  }
}

export async function deleteEvent(eventId) {
  // Delete event + any signups referencing it.
  // Note: without Firebase Auth, this is not a secure authorization boundary on its own.
  const batch = writeBatch(db);
  batch.delete(doc(db, 'events', eventId));

  const q = query(signupsCol(), where('eventId', '==', eventId));
  const snap = await getDocs(q);
  snap.docs.forEach((d) => batch.delete(d.ref));

  await batch.commit();
}

export async function signupTeacherForEvent(teacherId, eventId) {
  const id = signupDocId(eventId, teacherId);
  await setDoc(doc(db, 'eventSignups', id), {
    teacherId,
    eventId,
    createdAt: serverTimestamp(),
  });
}

export async function removeTeacherEventSignup(teacherId, eventId) {
  await deleteDoc(doc(db, 'eventSignups', signupDocId(eventId, teacherId)));
}

export async function deleteTeacher(teacherId) {
  await deleteDoc(doc(db, 'teachers', teacherId));
}

/** Check administrators collection for a matching email */
export async function isAdministratorEmail(email) {
  if (!email) return false;
  const q = query(collection(db, 'administrators'), where('email', '==', email));
  const snap = await getDocs(q);
  return !snap.empty;
}
