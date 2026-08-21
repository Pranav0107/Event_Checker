# Event Check-In System

A production-quality, full-stack event check-in system built with React (Vite), Node.js (Express), and Neon Postgres.

## Setup Instructions

1. **Clone the repository** (or use the provided directory).
2. **Database Setup (Neon)**:
   - Ensure you have a Neon Postgres database.
   - Run the schema from `backend/schema.sql` against your Neon database to create the necessary tables and indexes.
3. **Environment Variables**:
   - In `/backend`, copy `.env.example` to `.env` and fill in `DATABASE_URL`, `JWT_SECRET`, and `ANTHROPIC_API_KEY`.
   - In `/frontend`, copy `.env.example` to `.env` and ensure `VITE_API_URL` points to your backend.
4. **Install Dependencies**:
   - `cd backend && npm install`
   - `cd frontend && npm install`
5. **Run the Application**:
   - Backend: `npm run dev` (starts on port 3001)
   - Frontend: `npm run dev` (starts on Vite's default port)

## Architecture & Required Write-Ups

### 1. QR Anti-Sharing Tradeoff
We opted to use **Rotating Tokens (Server-Side Validated)**. The client requests a new token every 15 seconds, and this updates the unique `qr_token` column in the database for their registration.
- **Why this tradeoff?** It provides maximum security against screenshots. If an attendee screenshots their QR code and sends it to a friend, the code will become invalid on the server side within 15 seconds.
- **Drawback**: It requires attendees to have an active internet connection to load their QR code at the door.

### 2. Offline Sync Race (Station A/B)
We use a **First-Timestamp-Wins** strategy. 
If an attendee is scanned offline at Station A, and then online at Station B before Station A syncs:
- Station B records the check-in immediately.
- When Station A comes online, the sync endpoint checks the `client_timestamp`. Since Station A's scan actually happened *earlier* than Station B's, the sync logic accepts Station A's scan as the "true" check-in time and updates `checked_in_at`. 
- Both events are recorded in `check_in_events` for a complete audit trail.

### 3. Undo / Waitlist Interaction
When an organizer clicks "Undo Check-in", the attendee reverts back to `registered` status. 
- **Waitlist Logic**: Undoing a check-in **does not** promote a waitlisted user. The undone attendee is still registered and holds their capacity slot. Waitlist promotions *only* occur via atomic SQL transactions when a `registered` attendee explicitly cancels their registration.

## Deliverables Completed
- [x] Full-stack architecture (React + Node + Neon)
- [x] DB-level duplicate check-in & capacity limits (`SELECT ... FOR UPDATE` row locks)
- [x] Proof script (`proof/concurrency.js`)
- [x] Rotating QR codes for Anti-Sharing
- [x] Offline-first scanning (queue in localStorage, idempotent sync)
- [x] AI Insights (Anthropic API integration with graceful fallback)
- [x] Roles, rate limiting, and undo/waitlist logic