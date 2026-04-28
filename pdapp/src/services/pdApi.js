export async function deleteTeacherById(id, roleHeader = 'Teacher') {
  const res = await fetch(`${process.env.REACT_APP_PD_API_HOST || 'http://localhost:4000'}/api/teachers/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', 'x-user-role': roleHeader },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || 'Failed to delete teacher');
  }
  return res.json();
}
