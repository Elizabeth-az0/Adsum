import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AppData, ClassGroup, Student, AttendanceRecord, User } from '../types';
import { useAuth } from './AuthContext';

interface DataContextType {
    data: AppData;
    isLoading: boolean;
    error: string | null;
    saveData: (newData: AppData) => void;
    resetData: () => void;
    addClass: (newClass: Omit<ClassGroup, 'id' | 'studentIds'>, user: User | null) => void;
    deleteClass: (classId: string, user: User | null) => void;
    updateClass: (id: string, updatedClass: Partial<ClassGroup>, user: User | null) => void;
    addStudentToClass: (classId: string, student: Omit<Student, 'id' | 'attendanceHistory' | 'risk'>, user: User | null) => void;
    removeStudentFromClass: (classId: string, studentId: string, user: User | null) => void;
    updateUser: (id: string, updatedUser: Partial<User>) => void;
    saveAttendance: (record: AttendanceRecord, user?: User | null) => void;
    deleteAttendance: (classId: string, date: string, user?: User | null) => void;
    getClassStats: (classId: string) => { present: number; absent: number; justified: number; total: number };
}

const defaultData: AppData = {
    users: [
        {
            id: 'director-1',
            username: 'director',
            name: 'Director',
            password: 'admin',
            role: 'DIRECTOR',
            avatar: 'https://ui-avatars.com/api/?name=Director&background=random'
        }
    ],
    classes: [],
    students: {},
    attendance: []
};

const DataContext = createContext<DataContextType | undefined>(undefined);

const calculateAttendanceStats = (studentId: string, attendance: AttendanceRecord[]) => {
    let present = 0;
    let absent = 0;
    let justified = 0;
    let total = 0;

    attendance.forEach(record => {
        const studentRecord = record.records.find(r => r.studentId === studentId);
        if (studentRecord) {
            total++;
            if (studentRecord.status === 'PRESENT') present++;
            if (studentRecord.status === 'ABSENT') absent++;
            if (studentRecord.status === 'JUSTIFIED') justified++;
        }
    });

    return { present, absent, justified, total };
};

const isAtRisk = (stats: { present: number; total: number }) => {
    if (stats.total === 0) return false;
    const rate = stats.present / stats.total;
    return rate < 0.75;
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { logout } = useAuth();
    const [data, setDataState] = useState<AppData>(defaultData);
    const [isLoading, setIsLoading] = useState(true);

    const saveData = useCallback((newData: AppData) => {
        setDataState(newData);
        localStorage.setItem('adsum_data', JSON.stringify(newData));
    }, []);

    useEffect(() => {
        const stored = localStorage.getItem('adsum_data');
        if (stored) {
            try {
                setDataState(JSON.parse(stored));
            } catch (e) {
                console.error('Error parsing stored data', e);
            }
        }
        setIsLoading(false);
    }, []);

    const resetData = useCallback(() => {
        localStorage.removeItem('adsum_data');
        setDataState(defaultData);
        logout();
    }, [logout]);

    const addClass = useCallback((newClass: Omit<ClassGroup, 'id' | 'studentIds'>) => {
        setDataState((prev: AppData) => {
            const cls = { ...newClass, id: Math.random().toString(36).substr(2, 9), studentIds: [] };
            const next = { ...prev, classes: [...prev.classes, cls] };
            localStorage.setItem('adsum_data', JSON.stringify(next));
            return next;
        });
    }, []);

    const deleteClass = useCallback((classId: string) => {
        setDataState((prev: AppData) => {
            const next = { ...prev, classes: prev.classes.filter(c => c.id !== classId) };
            localStorage.setItem('adsum_data', JSON.stringify(next));
            return next;
        });
    }, []);

    const updateClass = useCallback((id: string, updatedClass: Partial<ClassGroup>) => {
        setDataState((prev: AppData) => {
            const next = {
                ...prev,
                classes: prev.classes.map(c => c.id === id ? { ...c, ...updatedClass } : c)
            };
            localStorage.setItem('adsum_data', JSON.stringify(next));
            return next;
        });
    }, []);

    const addStudentToClass = useCallback((classId: string, studentProps: Omit<Student, 'id' | 'attendanceHistory' | 'risk'>) => {
        setDataState((prev: AppData) => {
            const studentId = Math.random().toString(36).substr(2, 9);
            const newStudent: Student = {
                ...studentProps,
                id: studentId,
                attendanceHistory: { present: 0, absent: 0, justified: 0, total: 0 },
                risk: false
            };

            const next = {
                ...prev,
                students: { ...prev.students, [studentId]: newStudent },
                classes: prev.classes.map(c => c.id === classId ? { ...c, studentIds: [...c.studentIds, studentId] } : c)
            };
            localStorage.setItem('adsum_data', JSON.stringify(next));
            return next;
        });
    }, []);

    const removeStudentFromClass = useCallback((classId: string, studentId: string) => {
        setDataState((prev: AppData) => {
            const nextStudents = { ...prev.students };
            delete nextStudents[studentId];

            const next = {
                ...prev,
                students: nextStudents,
                classes: prev.classes.map(c => c.id === classId ? { ...c, studentIds: c.studentIds.filter(id => id !== studentId) } : c)
            };
            localStorage.setItem('adsum_data', JSON.stringify(next));
            return next;
        });
    }, []);

    const updateUser = useCallback((id: string, updatedUser: Partial<User>) => {
        setDataState((prev: AppData) => {
            const next = {
                ...prev,
                users: prev.users.map(u => u.id === id ? { ...u, ...updatedUser } : u)
            };
            localStorage.setItem('adsum_data', JSON.stringify(next));
            return next;
        });
    }, []);

    const saveAttendance = useCallback((record: AttendanceRecord) => {
        setDataState((prev: AppData) => {
            const filteredAttendance = prev.attendance.filter(a => !(a.classId === record.classId && a.date === record.date));
            const newAttendance = [...filteredAttendance, record];

            const nextStudents = { ...prev.students };
            const classObj = prev.classes.find(c => c.id === record.classId);
            if (classObj) {
                classObj.studentIds.forEach(studentId => {
                    const stats = calculateAttendanceStats(studentId, newAttendance);
                    const risk = isAtRisk(stats);
                    if (nextStudents[studentId]) {
                        nextStudents[studentId] = {
                            ...nextStudents[studentId],
                            attendanceHistory: stats,
                            risk
                        };
                    }
                });
            }

            const next = { ...prev, attendance: newAttendance, students: nextStudents };
            localStorage.setItem('adsum_data', JSON.stringify(next));
            return next;
        });
    }, []);

    const deleteAttendance = useCallback((classId: string, date: string) => {
        setDataState((prev: AppData) => {
            const newAttendance = prev.attendance.filter(a => !(a.classId === classId && a.date === date));

            const nextStudents = { ...prev.students };
            const classObj = prev.classes.find(c => c.id === classId);
            if (classObj) {
                classObj.studentIds.forEach(studentId => {
                    const stats = calculateAttendanceStats(studentId, newAttendance);
                    const risk = isAtRisk(stats);
                    if (nextStudents[studentId]) {
                        nextStudents[studentId] = {
                            ...nextStudents[studentId],
                            attendanceHistory: stats,
                            risk
                        };
                    }
                });
            }

            const next = { ...prev, attendance: newAttendance, students: nextStudents };
            localStorage.setItem('adsum_data', JSON.stringify(next));
            return next;
        });
    }, []);

    const getClassStats = useCallback((classId: string) => {
        let present = 0;
        let absent = 0;
        let justified = 0;
        let total = 0;

        data.attendance.filter(a => a.classId === classId).forEach(record => {
            record.records.forEach(r => {
                total++;
                if (r.status === 'PRESENT') present++;
                if (r.status === 'ABSENT') absent++;
                if (r.status === 'JUSTIFIED') justified++;
            });
        });

        return { present, absent, justified, total };
    }, [data.attendance]);

    return (
        <DataContext.Provider value={{
            data, isLoading, error: null,
            saveData, resetData, addClass, deleteClass, updateClass,
            addStudentToClass, removeStudentFromClass, updateUser,
            saveAttendance, deleteAttendance, getClassStats
        }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};
