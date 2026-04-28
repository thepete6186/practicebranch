import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
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
export const DEFAULT_GROUP_CODE = '222222';
export const OFFICIAL_COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina', 'Armenia',
  'Australia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium',
  'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria',
  'Burkina Faso', 'Burundi', 'Cabo Verde', 'Cambodia', 'Cameroon', 'Canada', 'Central African Republic', 'Chad',
  'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica', "Cote d'Ivoire", 'Croatia', 'Cuba', 'Cyprus',
  'Czechia', 'Democratic Republic of the Congo', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador',
  'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji', 'Finland',
  'France', 'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea',
  'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq',
  'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Kuwait',
  'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania',
  'Luxembourg', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania',
  'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique',
  'Myanmar', 'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria',
  'North Korea', 'North Macedonia', 'Norway', 'Oman', 'Pakistan', 'Palau', 'Palestine', 'Panama',
  'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia',
  'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino',
  'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore',
  'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Spain',
  'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria', 'Tajikistan', 'Tanzania', 'Thailand',
  'Timor-Leste', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu', 'Uganda',
  'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu',
  'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe',
];

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

function groupCodeMatchesDocument(docGroupCode, activeGroupCode) {
  const normalizedDocCode = String(docGroupCode || '').trim();
  const normalizedActiveCode = String(activeGroupCode || '').trim();
  if (!normalizedActiveCode) return true;
  if (normalizedDocCode) return normalizedDocCode === normalizedActiveCode;
  return normalizedActiveCode === DEFAULT_GROUP_CODE;
}

export function subscribeTeachers(onData, onError, options = {}) {
  const activeGroupCode = String(options.groupCode || '').trim();
  return onSnapshot(
    teachersCol(),
    (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((row) => groupCodeMatchesDocument(row.groupCode, activeGroupCode));
      list.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
      onData(list);
    },
    onError
  );
}

export function subscribeEvents(onData, onError, options = {}) {
  const activeGroupCode = String(options.groupCode || '').trim();
  return onSnapshot(
    eventsCol(),
    (snap) => {
      const list = snap.docs
        .map((d) => mapEventDoc(d))
        .filter((row) => groupCodeMatchesDocument(row.groupCode, activeGroupCode));
      list.sort((a, b) => (eventDateMillis(b) || 0) - (eventDateMillis(a) || 0));
      onData(list);
    },
    onError
  );
}

export function subscribeEventSignups(onData, onError, options = {}) {
  const activeGroupCode = String(options.groupCode || '').trim();
  return onSnapshot(
    signupsCol(),
    (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((row) => groupCodeMatchesDocument(row.groupCode, activeGroupCode));
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
    groupCode: data.groupCode || '',
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
    groupCode: String(data.groupCode || '').trim() || DEFAULT_GROUP_CODE,
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

export async function signupTeacherForEvent(teacherId, eventId, groupCode = DEFAULT_GROUP_CODE) {
  const id = signupDocId(eventId, teacherId);
  await setDoc(doc(db, 'eventSignups', id), {
    teacherId,
    eventId,
    groupCode: String(groupCode || '').trim() || DEFAULT_GROUP_CODE,
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

export async function administratorGroupCodeExists(groupCode) {
  const normalized = String(groupCode || '').trim();
  if (!normalized) return false;
  const q = query(collection(db, 'administrators'), where('groupCode', '==', normalized));
  const snap = await getDocs(q);
  return !snap.empty;
}

export async function getTeacherByEmail(email) {
  const normalized = String(email || '').trim();
  if (!normalized) return null;
  const q = query(teachersCol(), where('email', '==', normalized));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const first = snap.docs[0];
  return { id: first.id, ...first.data() };
}

export async function getAdministratorByEmail(email) {
  const normalized = String(email || '').trim();
  if (!normalized) return null;
  const q = query(collection(db, 'administrators'), where('email', '==', normalized));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const first = snap.docs[0];
  return { id: first.id, ...first.data() };
}

export async function assignLegacyDataToDefaultGroupCode(defaultCode = DEFAULT_GROUP_CODE) {
  const normalized = String(defaultCode || '').trim();
  if (!normalized) return;

  const migrateCollection = async (colName) => {
    const snap = await getDocs(collection(db, colName));
    const updates = snap.docs
      .filter((d) => {
        const code = String(d.data()?.groupCode || '').trim();
        return !code;
      })
      .map((d) => updateDoc(d.ref, { groupCode: normalized }));
    await Promise.all(updates);
  };

  await Promise.all([
    migrateCollection('teachers'),
    migrateCollection('events'),
    migrateCollection('eventSignups'),
  ]);
}

export async function awardCompletedEventHours(groupCode = DEFAULT_GROUP_CODE) {
  const activeGroupCode = String(groupCode || '').trim() || DEFAULT_GROUP_CODE;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const signupsSnap = await getDocs(signupsCol());
  const pendingSignups = signupsSnap.docs.filter((signupDoc) => {
    const data = signupDoc.data() || {};
    if (data.hoursAwarded) return false;
    return groupCodeMatchesDocument(data.groupCode, activeGroupCode);
  });

  if (!pendingSignups.length) return;

  const eventCache = new Map();
  const teacherCache = new Map();
  const batch = writeBatch(db);
  let updatesCount = 0;

  for (const signupDoc of pendingSignups) {
    const signup = signupDoc.data() || {};
    const eventId = String(signup.eventId || '').trim();
    const teacherId = String(signup.teacherId || '').trim();
    if (!eventId || !teacherId) continue;

    let eventData = eventCache.get(eventId);
    if (eventData === undefined) {
      const eventSnap = await getDoc(doc(db, 'events', eventId));
      eventData = eventSnap.exists() ? eventSnap.data() : null;
      eventCache.set(eventId, eventData);
    }
    if (!eventData) continue;

    const eventDate = dateFieldToJsDate(eventData.date);
    if (!eventDate) continue;
    const normalizedEventDate = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
    if (normalizedEventDate >= today) continue;

    let teacherExists = teacherCache.get(teacherId);
    if (teacherExists === undefined) {
      const teacherSnap = await getDoc(doc(db, 'teachers', teacherId));
      teacherExists = teacherSnap.exists();
      teacherCache.set(teacherId, teacherExists);
    }
    if (!teacherExists) continue;

    const awardedHours = Number(eventData.hours) || 0;
    if (awardedHours <= 0) {
      batch.update(signupDoc.ref, {
        hoursAwarded: true,
        awardedHours: 0,
        awardedAt: serverTimestamp(),
      });
      updatesCount += 1;
      continue;
    }

    batch.update(doc(db, 'teachers', teacherId), {
      hours: increment(awardedHours),
    });
    batch.update(signupDoc.ref, {
      hoursAwarded: true,
      awardedHours,
      awardedAt: serverTimestamp(),
    });
    updatesCount += 2;
  }

  if (updatesCount > 0) {
    await batch.commit();
  }
}
