-- Users table (both organizers and attendees)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('organizer', 'attendee')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  capacity INT NOT NULL CHECK (capacity > 0),
  created_by INT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Registrations table
CREATE TABLE IF NOT EXISTS registrations (
  id SERIAL PRIMARY KEY,
  event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  attendee_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL CHECK (status IN ('registered', 'waitlisted', 'checked_in', 'cancelled')),
  qr_token VARCHAR(255) UNIQUE NOT NULL,
  checked_in_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(event_id, attendee_id) -- Prevent double registration
);

CREATE INDEX idx_registrations_qr_token ON registrations(qr_token);
CREATE INDEX idx_registrations_event_id ON registrations(event_id);
CREATE INDEX idx_registrations_status ON registrations(status);
CREATE INDEX idx_registrations_created_at ON registrations(created_at);

-- Check-in Events table (Audit trail)
CREATE TABLE IF NOT EXISTS check_in_events (
  id SERIAL PRIMARY KEY,
  registration_id INT NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL CHECK (action IN ('check_in', 'undo')),
  source VARCHAR(50) NOT NULL CHECK (source IN ('qr_scan', 'manual', 'offline_sync')),
  station_id VARCHAR(255),
  client_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  server_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  performed_by INT REFERENCES users(id)
);
