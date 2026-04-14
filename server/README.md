PD Backend

Simple Express backend with file-based JSON storage (db.json). This is intended as a minimal development backend for the PD front-end.

Usage

1. cd server
2. npm install
3. npm start

Endpoints
- GET /api/teachers
- POST /api/teachers
- PUT /api/teachers/:id
- DELETE /api/teachers/:id  (admin only)

- GET /api/events
- POST /api/events
- PUT /api/events/:id
- DELETE /api/events/:id  (admin only)

Notes on admin actions
 - The server uses a simple header-based role check. Send `x-user-role: Administrator` to perform admin-only actions (deleting teachers/events).
