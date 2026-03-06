DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS classes;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT CHECK(role IN ('DIRECTOR', 'PROFESSOR')) NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE classes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    grade TEXT NOT NULL,
    professor_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE students (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE attendance (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    status TEXT CHECK(status IN ('PRESENT', 'ABSENT', 'JUSTIFIED')) NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(class_id, student_id, date)
);

CREATE INDEX idx_attendance_class_date ON attendance (class_id, date);
CREATE INDEX idx_attendance_student_id ON attendance (student_id);
CREATE INDEX idx_attendance_date ON attendance (date);
CREATE INDEX idx_students_class_id ON students (class_id);
CREATE INDEX idx_classes_professor_id ON classes (professor_id);

-- Hash SHA-256 for 'admin' password is '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918'
INSERT INTO users (id, name, username, password_hash, role) VALUES 
('1', 'Director Principal', 'director', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'DIRECTOR');
