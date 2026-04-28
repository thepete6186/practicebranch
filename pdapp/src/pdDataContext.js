import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  awardCompletedEventHours,
  assignLegacyDataToDefaultGroupCode,
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

export function PdDataProvider({ children, groupCode = '' }) {
  const [teachers, setTeachers] = useState([]);
  const [events, setEvents] = useState([]);
  const [signups, setSignups] = useState([]);
  const [firestoreError, setFirestoreError] = useState(null);
  const [selectedTeacherId, setSelectedTeacherIdState] = useState(readStoredTeacherId);

  useEffect(() => {
    let cancelled = false;
    const onErr = (err) => setFirestoreError(err?.message || 'Firestore error');
    const wrap =
      (setter) =>
      (data) => {
        if (cancelled) return;
        setFirestoreError(null);
        setter(data);
      };

    assignLegacyDataToDefaultGroupCode().catch(() => {
      // keep app usable even if migration is blocked by rules
    });

    const unsubTeachers = subscribeTeachers(wrap(setTeachers), onErr, { groupCode });
    const unsubEvents = subscribeEvents(wrap(setEvents), onErr, { groupCode });
    const unsubSignups = subscribeEventSignups(wrap(setSignups), onErr, { groupCode });
    return () => {
      cancelled = true;
      unsubTeachers();
      unsubEvents();
      unsubSignups();
    };
  }, [groupCode]);

  useEffect(() => {
    if (!groupCode) return;
    if (!signups.length) return;
    awardCompletedEventHours(groupCode).catch(() => {
      // keep UI responsive even if write permissions are restricted
    });
  }, [groupCode, signups.length, events.length]);

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
