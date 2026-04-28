import React from 'react';
import { usePdData } from '../pdDataContext';

export default function TeacherList({ selectedId, onSelect, filterDept }) {
  const { teachers } = usePdData();
  const list = filterDept && filterDept !== 'All' ? teachers.filter(t => t.department === filterDept) : teachers;

  return (
    <div className="teacher-list" style={{padding:12}}>
      <h3>Teachers</h3>
      <ul style={{listStyle:'none',padding:0,margin:0}}>
        {list.map((t) => (
          <li key={t.id} style={{marginBottom:8}}>
            <button
              onClick={() => onSelect(t.id)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding:8,
                border: selectedId === t.id ? '2px solid #1e88e5' : '1px solid #ddd',
                borderRadius:6,
                background:'#fff'
              }}
            >
              <div style={{display:'flex',justifyContent:'space-between'}}>
                <strong>{t.name}</strong>
                <span style={{fontSize:12}}>{t.hours ?? 0}h</span>
              </div>
              <div style={{fontSize:12,color:'#666'}}>{t.department || '—'}</div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
