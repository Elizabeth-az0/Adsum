export type Role = 'DIRECTOR' | 'PROFESSOR';

export interface User {
    id: string;
    username: string;
    password?: string; // Only used for auth check, not stored in state if possible, or stored securely? LocalStorage is not secure, but per requirements we use it.
    name: string;
    role: Role;
    avatar?: string;
}

export interface Student {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    attendanceHistory: {
        present: number;
        absent: number;
        justified: number;
        total: number;
    };
    risk: boolean; // < 75% attendance
}

export interface AttendanceRecord {
    id: string;
    date: string; // ISO date string YYYY-MM-DD
    classId: string;
    records: {
        studentId: string;
        status: 'PRESENT' | 'ABSENT' | 'JUSTIFIED';
    }[];
}

export interface ClassGroup {
    id: string;
    name: string; // e.g. "Matemáticas 1A"
    grado: string; // e.g. "1ro"
    seccion: string; // e.g. "A"
    professorId: string; // User ID
    studentIds: string[];
}

export interface AppData {
    users: User[];
    classes: ClassGroup[];
    students: Record<string, Student>; // Map for easier access
    attendance: AttendanceRecord[];
}
