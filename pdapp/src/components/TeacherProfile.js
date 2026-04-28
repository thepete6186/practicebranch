import React, { useState, useEffect } from 'react';
import { usePdData } from '../pdDataContext';
import { updateTeacher, deleteTeacher, isAdministratorEmail } from '../services/pdFirestore';
import { deleteTeacherById } from '../services/pdApi';
import { useAuth } from '../contexts/authContext';
import { useNavigate } from 'react-router-dom';

export default function TeacherProfile() {
  const { selectedTeacher } = usePdData();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [pending, setPending] = useState(false);

  if (!selectedTeacher) return <div style={{padding:12}}>No teacher selected.</div>;

  const changeHours = async (delta) => {
    setPending(true);
    try {
      const newHours = (Number(selectedTeacher.hours) || 0) + delta;
      await updateTeacher(selectedTeacher.id, { hours: newHours });
    } catch (err) {
      // ignore: UI will update from subscription
    } finally {
      setPending(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!currentUser?.email) return;
      try {
        const res = await isAdministratorEmail(currentUser.email);
        if (mounted) setIsAdmin(Boolean(res));
      } catch (e) {}
    })();
    return () => (mounted = false);
  }, [currentUser]);

  const handleDelete = async () => {
    if (!selectedTeacher) return;
    if (!confirm(`Delete teacher ${selectedTeacher.name}? This cannot be undone.`)) return;
    try {
      // Prefer backend delete (enforces admin) when available
      try {
        await deleteTeacherById(selectedTeacher.id, currentUser?.email || 'Teacher');
      } catch (err) {
        // fallback to Firestore delete
        await deleteTeacher(selectedTeacher.id);
      }
      // After delete, navigate to teacher admin list or home
      navigate('/teachers');
    } catch (err) {
      // ignore
    }
  };

  return (
    <div style={{padding:16}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <h2 style={{margin:0}}>{selectedTeacher.name}</h2>
        {isAdmin ? (
          <button onClick={handleDelete} title="Delete teacher" style={{border:'none',background:'transparent',cursor:'pointer'}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 6h18" stroke="#900" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="#900" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M10 11v6" stroke="#900" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 11v6" stroke="#900" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="#900" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        ) : null}
      </div>
      <p><strong>Department:</strong> {selectedTeacher.department}</p>
      <p><strong>Campus:</strong> {selectedTeacher.campus}</p>
      <p><strong>Email:</strong> {selectedTeacher.email}</p>
      <p><strong>Hours:</strong> {selectedTeacher.hours ?? 0}</p>
      <div style={{marginTop:12,display:'flex',gap:8}}>
        <button onClick={() => changeHours(1)} disabled={pending}>+1 hour</button>
        <button onClick={() => changeHours(2)} disabled={pending}>+2 hours</button>
        <button onClick={() => changeHours(-1)} disabled={pending}>-1 hour</button>
      </div>
    </div>
  );
}
