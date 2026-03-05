export type Role = 'DIRECTOR' | 'PROFESSOR';

export interface User {
    id: string;
    username: string;
    password?: string; // ojito, no tan seguro pero toca guardarla acá
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
    risk: boolean; // si tiene 10 o más faltas
}

export interface AttendanceRecord {
    id: string;
    date: string; // fecha formato tranqui YYYY-MM-DD
    classId: string;
    records: {
        studentId: string;
        status: 'PRESENT' | 'ABSENT' | 'JUSTIFIED';
    }[];
}

export interface ClassGroup {
    id: string;
    name: string; // ej. Mates piolas
    grado: string; // ej. 1ro
    seccion: string; // ej. A
    professorId: string; // el id del profe
    studentIds: string[];
}

export interface AppData {
    users: User[];
    classes: ClassGroup[];
    students: Record<string, Student>; // mapeado por id para buscar rápido
    attendance: AttendanceRecord[];
}
