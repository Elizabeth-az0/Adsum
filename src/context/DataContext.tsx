import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AppData, ClassGroup, Student, AttendanceRecord, User } from '../types';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

interface DataContextType {
    data: AppData;
    isLoading: boolean;
    error: string | null;
    loadData: () => Promise<void>;
    addClass: (newClass: Omit<ClassGroup, 'id'>, user: User | null) => Promise<void>;
    deleteClass: (classId: string, user: User | null) => Promise<void>;
    addStudentToClass: (classId: string, student: Omit<Student, 'id' | 'attendanceHistory' | 'risk'>, user: User | null) => Promise<void>;
    removeStudentFromClass: (classId: string, studentId: string, user: User | null) => Promise<void>;
    saveAttendance: (record: AttendanceRecord, user?: User | null) => Promise<void>;
    deleteAttendance: (classId: string, date: string, user?: User | null) => Promise<void>;
    getClassStats: (classId: string) => { present: number; absent: number; justified: number; total: number };
    updateUser: (id: string, updatedUser: Partial<User>) => Promise<void>;
    updateClass: (id: string, updatedClass: Partial<ClassGroup>, user: User | null) => Promise<void>;
    loadAttendanceForClassAndDate: (classId: string, date: string) => Promise<any>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, isAuthenticated, logout } = useAuth();
    const [data, setData] = useState<AppData>({ users: [], classes: [], students: {}, attendance: [] });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const checkAuthError = (err: any) => {
        if (err.message === 'UNAUTHORIZED') {
            logout();
        }
        throw err;
    };

    const loadData = useCallback(async () => {
        if (!isAuthenticated) return;
        setIsLoading(true);
        setError(null);
        try {
            const classesRaw = await api.getClasses().catch(checkAuthError);
            let usersRaw: User[] = [];

            if (user?.role === 'DIRECTOR') {
                usersRaw = await api.getUsers().catch(checkAuthError);
            }

            const studentsMap: Record<string, Student> = {};
            const mappedClasses: ClassGroup[] = [];

            for (const cls of classesRaw) {
                const studentsRaw = await api.getStudents(cls.id).catch(checkAuthError);
                mappedClasses.push({
                    id: cls.id,
                    name: cls.name,
                    grado: cls.grade,
                    seccion: '', // Original backend merging
                    professorId: cls.professor_id,
                    studentIds: studentsRaw.map((s: any) => s.id)
                });
                for (const st of studentsRaw) {
                    studentsMap[st.id] = {
                        id: st.id,
                        firstName: st.name.split(' ')[0],
                        lastName: st.name.split(' ').slice(1).join(' '),
                        risk: false,
                        attendanceHistory: { present: 0, absent: 0, justified: 0, total: 0 },
                        avatar: ''
                    };
                }
            }

            setData({
                users: usersRaw,
                classes: mappedClasses,
                students: studentsMap,
                attendance: [] // We fetch attendance dynamically per class
            });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated, user?.role, logout]);

    useEffect(() => {
        if (isAuthenticated) {
            loadData();
        }
    }, [isAuthenticated, loadData]);

    const addClass = async (newClass: Omit<ClassGroup, 'id'>, user: User | null) => {
        await api.createClass({
            name: newClass.name,
            grade: newClass.grado,
            professor_id: newClass.professorId
        }).catch(checkAuthError);
        await loadData();
    };

    const deleteClass = async (classId: string, user: User | null) => {
        await api.deleteClass(classId).catch(checkAuthError);
        await loadData();
    };

    const addStudentToClass = async (classId: string, student: Omit<Student, 'id' | 'attendanceHistory' | 'risk'>, user: User | null) => {
        await api.createStudent({
            class_id: classId,
            name: `${student.firstName} ${student.lastName}`
        }).catch(checkAuthError);
        await loadData();
    };

    const removeStudentFromClass = async (classId: string, studentId: string, user: User | null) => {
        await api.deleteStudent(studentId).catch(checkAuthError);
        await loadData();
    };

    const updateUser = async (id: string, updatedUser: Partial<User>) => {
        await api.updateUser(id, updatedUser).catch(checkAuthError);
        await loadData();
    };

    const updateClass = async (id: string, updatedClass: Partial<ClassGroup>, user: User | null) => {
        await api.updateClass(id, {
            name: updatedClass.name,
            grade: updatedClass.grado,
            professor_id: updatedClass.professorId
        }).catch(checkAuthError);
        await loadData();
    };

    const loadAttendanceForClassAndDate = async (classId: string, date: string) => {
        const records = await api.getAttendance(classId, date).catch(checkAuthError);
        return records;
    };

    const saveAttendance = async (record: AttendanceRecord, user?: User | null) => {
        await api.saveAttendance({
            class_id: record.classId,
            date: record.date,
            records: record.records.map(r => ({
                student_id: r.studentId,
                status: r.status
            }))
        }).catch(checkAuthError);
    };

    const deleteAttendance = async (classId: string, date: string, user?: User | null) => {
        await api.deleteAttendance(classId, date).catch(checkAuthError);
    };

    const getClassStats = (classId: string) => {
        return { present: 0, absent: 0, justified: 0, total: 0 };
    };

    return (
        <DataContext.Provider value={{
            data, isLoading, error, loadData, addClass, deleteClass, addStudentToClass,
            removeStudentFromClass, saveAttendance, deleteAttendance, getClassStats,
            updateUser, updateClass, loadAttendanceForClassAndDate
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
