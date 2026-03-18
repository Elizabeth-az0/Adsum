export type Role = 'DIRECTOR' | 'PROFESSOR';

export interface User {
    id: string;
    username: string;
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
    risk: boolean; 
}

export interface AttendanceRecord {
    id: string;
    date: string; 
    classId: string;
    records: {
        studentId: string;
        status: 'PRESENT' | 'ABSENT' | 'JUSTIFIED';
    }[];
}

export interface ClassGroup {
    id: string;
    name: string; 
    grado: string; 
    seccion: string; 
    professorId: string; 
    studentIds: string[];
}

export interface AppData {
    users: User[];
    classes: ClassGroup[];
    students: Record<string, Student>; 
    attendance: AttendanceRecord[];
}
