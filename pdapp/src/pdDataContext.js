import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  subscribeEvents,
  subscribeEventSignups,
  subscribeTeachers,
} from './services/pdFirestore';

const STORAGE_KEY = 'pdapp_selected_teacher_id';

function readStoredTeacherId() {
  try {
    return localStorage.getItem(STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function writeStoredTeacherId(id) {
  try {
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

const PdDataContext = createContext(null);

export function PdDataProvider({ children }) {
  const [teachers, setTeachers] = useState([]);
  const [events, setEvents] = useState([]);
  const [signups, setSignups] = useState([]);
  const [firestoreError, setFirestoreError] = useState(null);
  const [selectedTeacherId, setSelectedTeacherIdState] = useState(readStoredTeacherId);

  useEffect(() => {
    const onErr = (err) => setFirestoreError(err?.message || 'Firestore error');
    const wrap =
      (setter) =>
      (data) => {
        setFirestoreError(null);
        setter(data);
      };
    const unsubTeachers = subscribeTeachers(wrap(setTeachers), onErr);
    const unsubEvents = subscribeEvents(wrap(setEvents), onErr);
    const unsubSignups = subscribeEventSignups(wrap(setSignups), onErr);
    return () => {
      unsubTeachers();
      unsubEvents();
      unsubSignups();
    };
  }, []);

  useEffect(() => {
    if (!teachers.length) return;
    const exists = teachers.some((t) => t.id === selectedTeacherId);
    if (exists) return;
    const firstTeacher = teachers.find((t) => t.role === 'Teacher') || teachers[0];
    if (firstTeacher) {
      setSelectedTeacherIdState(firstTeacher.id);
      writeStoredTeacherId(firstTeacher.id);
    }
  }, [teachers, selectedTeacherId]);

  const setSelectedTeacherId = (id) => {
    setSelectedTeacherIdState(id);
    writeStoredTeacherId(id);
  };

  const selectedTeacher = useMemo(
    () => teachers.find((t) => t.id === selectedTeacherId) || null,
    [teachers, selectedTeacherId]
  );

  const eventsById = useMemo(() => {
    const m = new Map();
    events.forEach((e) => m.set(e.id, e));
    return m;
  }, [events]);

  const signedUpEventIdsForSelected = useMemo(() => {
    if (!selectedTeacherId) return new Set();
    return new Set(
      signups.filter((s) => s.teacherId === selectedTeacherId).map((s) => s.eventId)
    );
  }, [signups, selectedTeacherId]);

  const value = useMemo(
    () => ({
      teachers,
      events,
      signups,
      firestoreError,
      selectedTeacherId,
      setSelectedTeacherId,
      selectedTeacher,
      eventsById,
      signedUpEventIdsForSelected,
    }),
    [
      teachers,
      events,
      signups,
      firestoreError,
      selectedTeacherId,
      selectedTeacher,
      eventsById,
      signedUpEventIdsForSelected,
    ]
  );

  return <PdDataContext.Provider value={value}>{children}</PdDataContext.Provider>;
}

export function usePdData() {
  const ctx = useContext(PdDataContext);
  if (!ctx) {
    throw new Error('usePdData must be used within PdDataProvider');
  }
  return ctx;
}
