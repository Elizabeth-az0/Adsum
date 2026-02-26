import React, { createContext, useContext, useState, useEffect } from 'react';
import type { AppData, ClassGroup, Student, AttendanceRecord, User } from '../types';

interface DataContextType {
    data: AppData;
    addClass: (newClass: Omit<ClassGroup, 'id'>) => void;
    addStudentToClass: (classId: string, student: Omit<Student, 'id' | 'attendanceHistory' | 'risk'>) => void;
    removeStudentFromClass: (classId: string, studentId: string) => void;
    saveAttendance: (record: AttendanceRecord) => void;
    saveData: (newData: AppData) => void;
    resetData: () => void;
    getClassStats: (classId: string) => { present: number; absent: number; justified: number; total: number };
    updateUser: (id: string, updatedUser: Partial<User>) => void;
    updateClass: (id: string, updatedClass: Partial<ClassGroup>) => void;
    deleteAttendance: (classId: string, date: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const INITIAL_DATA: AppData = {
    users: [
        {
            id: '1',
            username: 'director',
            password: '123',
            name: 'Director Principal',
            role: 'DIRECTOR',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Director',
        },
        {
            id: '2',
            username: 'profesor',
            password: '123',
            name: 'Profesor Demo',
            role: 'PROFESSOR',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Profesor',
        },
    ],
    classes: [
        {
            id: 'c1',
            name: 'Matemáticas 1A',
            room: 'Aula 101',
            professorId: '2',
            studentIds: ['s1', 's2', 's3', 's4', 's5'],
        },
        {
            id: 'c2',
            name: 'Historia 2B',
            room: 'Aula 204',
            professorId: '2',
            studentIds: ['s6', 's7'],
        },
    ],
    students: {
        's1': { id: 's1', firstName: 'Ana', lastName: 'García', risk: false, attendanceHistory: { present: 10, absent: 0, justified: 0, total: 10 }, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ana' },
        's2': { id: 's2', firstName: 'Carlos', lastName: 'López', risk: true, attendanceHistory: { present: 5, absent: 5, justified: 0, total: 10 }, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos' },
        's3': { id: 's3', firstName: 'Maria', lastName: 'Rodriguez', risk: false, attendanceHistory: { present: 9, absent: 1, justified: 0, total: 10 }, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maria' },
        's4': { id: 's4', firstName: 'Juan', lastName: 'Perez', risk: false, attendanceHistory: { present: 8, absent: 2, justified: 0, total: 10 }, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Juan' },
        's5': { id: 's5', firstName: 'Sofia', lastName: 'Martinez', risk: false, attendanceHistory: { present: 10, absent: 0, justified: 0, total: 10 }, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sofia' },
        's6': { id: 's6', firstName: 'Luis', lastName: 'Hernandez', risk: false, attendanceHistory: { present: 10, absent: 0, justified: 0, total: 10 }, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Luis' },
        's7': { id: 's7', firstName: 'Elena', lastName: 'Diaz', risk: true, attendanceHistory: { present: 4, absent: 6, justified: 0, total: 10 }, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elena' },
    },
    attendance: [],
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [data, setData] = useState<AppData>(INITIAL_DATA);

    useEffect(() => {
        const storedData = localStorage.getItem('asistencia_data');
        if (storedData) {
            setData(JSON.parse(storedData));
        } else {
            // Initialize with demo data
            localStorage.setItem('asistencia_data', JSON.stringify(INITIAL_DATA));
        }
    }, []);

    const saveData = (newData: AppData) => {
        setData(newData);
        localStorage.setItem('asistencia_data', JSON.stringify(newData));
    };

    const addClass = (newClass: Omit<ClassGroup, 'id'>) => {
        const id = Math.random().toString(36).substr(2, 9);
        const classWithId = { ...newClass, id, studentIds: [] };
        saveData({ ...data, classes: [...data.classes, classWithId] });
    };

    const addStudentToClass = (classId: string, student: Omit<Student, 'id' | 'attendanceHistory' | 'risk'>) => {
        const studentId = Math.random().toString(36).substr(2, 9);
        const newStudent: Student = {
            ...student,
            id: studentId,
            attendanceHistory: { present: 0, absent: 0, justified: 0, total: 0 },
            risk: false,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${student.firstName}`,
        };

        const updatedClasses = data.classes.map(c => {
            if (c.id === classId) {
                return { ...c, studentIds: [...c.studentIds, studentId] };
            }
            return c;
        });

        saveData({
            ...data,
            students: { ...data.students, [studentId]: newStudent },
            classes: updatedClasses,
        });
    };

    const removeStudentFromClass = (classId: string, studentId: string) => {
        const updatedClasses = data.classes.map(c => {
            if (c.id === classId) {
                return { ...c, studentIds: c.studentIds.filter(id => id !== studentId) };
            }
            return c;
        });
        saveData({ ...data, classes: updatedClasses });
    };

    const updateUser = (id: string, updatedUser: Partial<User>) => {
        const updatedUsers = data.users.map(u =>
            u.id === id ? { ...u, ...updatedUser } : u
        );
        saveData({ ...data, users: updatedUsers });
    };

    const updateClass = (id: string, updatedClass: Partial<ClassGroup>) => {
        const updatedClasses = data.classes.map(c =>
            c.id === id ? { ...c, ...updatedClass } : c
        );
        saveData({ ...data, classes: updatedClasses });
    };

    const saveAttendance = (record: AttendanceRecord) => {
        const updatedStudents = { ...data.students };

        // Check if updating an existing record based on classId and date
        const existingRecordIndex = data.attendance.findIndex(r => r.classId === record.classId && r.date === record.date);
        let newAttendance = [...data.attendance];

        if (existingRecordIndex >= 0) {
            const existingRecord = newAttendance[existingRecordIndex];

            // Revert old student stats
            existingRecord.records.forEach(r => {
                const student = updatedStudents[r.studentId];
                if (student) {
                    const history = { ...student.attendanceHistory };
                    history.total -= 1;
                    if (r.status === 'PRESENT') history.present -= 1;
                    if (r.status === 'ABSENT') history.absent -= 1;
                    if (r.status === 'JUSTIFIED') history.justified -= 1;

                    const attendanceRate = history.total > 0 ? history.present / history.total : 0;
                    const risk = attendanceRate < 0.75;

                    updatedStudents[r.studentId] = {
                        ...student,
                        attendanceHistory: history,
                        risk,
                    };
                }
            });
            newAttendance[existingRecordIndex] = record;
        } else {
            newAttendance.push(record);
        }

        // Apply new student stats
        record.records.forEach(r => {
            const student = updatedStudents[r.studentId];
            if (student) {
                const history = { ...student.attendanceHistory };
                history.total += 1;
                if (r.status === 'PRESENT') history.present += 1;
                if (r.status === 'ABSENT') history.absent += 1;
                if (r.status === 'JUSTIFIED') history.justified += 1;

                const attendanceRate = history.total > 0 ? history.present / history.total : 0;
                const risk = attendanceRate < 0.75;

                updatedStudents[r.studentId] = {
                    ...student,
                    attendanceHistory: history,
                    risk,
                };
            }
        });

        saveData({ ...data, attendance: newAttendance, students: updatedStudents });
    };

    const deleteAttendance = (classId: string, date: string) => {
        const existingRecordIndex = data.attendance.findIndex(r => r.classId === classId && r.date === date);
        if (existingRecordIndex === -1) return;

        const updatedStudents = { ...data.students };
        const existingRecord = data.attendance[existingRecordIndex];

        // Revert old student stats
        existingRecord.records.forEach(r => {
            const student = updatedStudents[r.studentId];
            if (student) {
                const history = { ...student.attendanceHistory };
                history.total -= 1;
                if (r.status === 'PRESENT') history.present -= 1;
                if (r.status === 'ABSENT') history.absent -= 1;
                if (r.status === 'JUSTIFIED') history.justified -= 1;

                const attendanceRate = history.total > 0 ? history.present / history.total : 0;
                const risk = attendanceRate < 0.75;

                updatedStudents[r.studentId] = {
                    ...student,
                    attendanceHistory: history,
                    risk,
                };
            }
        });

        const newAttendance = data.attendance.filter(r => !(r.classId === classId && r.date === date));
        saveData({ ...data, attendance: newAttendance, students: updatedStudents });
    };

    const resetData = () => {
        saveData(INITIAL_DATA);
        window.location.reload();
    };

    const getClassStats = (classId: string) => {
        const classGroup = data.classes.find(c => c.id === classId);
        if (!classGroup) return { present: 0, absent: 0, justified: 0, total: 0 };

        let present = 0, absent = 0, justified = 0, total = 0;

        classGroup.studentIds.forEach(sid => {
            const s = data.students[sid];
            if (s) {
                present += s.attendanceHistory.present;
                absent += s.attendanceHistory.absent;
                justified += s.attendanceHistory.justified;
                total += s.attendanceHistory.total;
            }
        });

        return { present, absent, justified, total };
    };

    return (
        <DataContext.Provider value={{ data, addClass, addStudentToClass, removeStudentFromClass, saveAttendance, saveData, resetData, getClassStats, updateUser, updateClass, deleteAttendance }}>
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
