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
    professor_id TEXT NOT NULL REFERENCES users(id),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE students (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    class_id TEXT NOT NULL REFERENCES classes(id),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE attendance (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES students(id),
    class_id TEXT NOT NULL REFERENCES classes(id),
    date TEXT NOT NULL,
    status TEXT CHECK(status IN ('PRESENT', 'ABSENT', 'JUSTIFIED')) NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(class_id, student_id, date)
);

CREATE INDEX idx_attendance_class_date ON attendance (class_id, date);
CREATE INDEX idx_students_class_id ON students (class_id);
CREATE INDEX idx_classes_professor_id ON classes (professor_id);

-- Hash SHA-256 for '123' password is 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3'
INSERT INTO users (id, name, username, password_hash, role) VALUES 
('1', 'Director Principal', 'director', 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', 'DIRECTOR');

INSERT INTO users (id, name, username, password_hash, role) VALUES 
('2', 'Profesor Demo', 'profesor', 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', 'PROFESSOR');
