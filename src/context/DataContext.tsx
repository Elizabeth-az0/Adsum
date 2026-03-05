import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AppData, ClassGroup, Student, AttendanceRecord, User } from '../types';
import { useAuth } from './AuthContext';
import { api } from '../services/api';

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

const defaultData: AppData = { users: [], classes: [], students: {}, attendance: [] };

const DataContext = createContext<DataContextType | undefined>(undefined);

const calculateAttendanceStats = (studentId: string, attendance: AttendanceRecord[]) => {
    let present = 0, absent = 0, justified = 0, total = 0;
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

const isAtRisk = (stats: { absent: number }) => stats.absent >= 10;

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { logout, user } = useAuth();
    const [data, setDataState] = useState<AppData>(defaultData);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        const loadInitialData = async () => {
            if (!user) {
                if (mounted) setIsLoading(false);
                return;
            }
            try {
                const [usersRaw, classesRaw, allAttendanceRaw] = await Promise.all([
                    user.role === 'DIRECTOR' ? api.getUsers() : Promise.resolve([]),
                    api.getClasses(),
                    api.getAttendance() // Fetch full relevant attendance history in 1 query!
                ]);

                const loadedClasses = classesRaw.map((c: any) => {
                    const gradeParts = (c.grade || '').split('|');
                    return {
                        id: c.id,
                        name: c.name,
                        grado: gradeParts[0] || c.grade,
                        seccion: gradeParts[1] || 'A',
                        professorId: c.professor_id,
                        studentIds: []
                    };
                });

                const studentsDict: Record<string, Student> = {};
                const attendanceRecords: AttendanceRecord[] = [];

                // Group all raw attendance rows by classId then date
                const recordsByClassAndDate: Record<string, Record<string, any[]>> = {};
                allAttendanceRaw.forEach((row: any) => {
                    if (!recordsByClassAndDate[row.class_id]) recordsByClassAndDate[row.class_id] = {};
                    if (!recordsByClassAndDate[row.class_id][row.date]) recordsByClassAndDate[row.class_id][row.date] = [];
                    recordsByClassAndDate[row.class_id][row.date].push({ studentId: row.student_id, status: row.status });
                });

                // Generate unified attendanceRecords
                Object.entries(recordsByClassAndDate).forEach(([cId, dates]) => {
                    Object.entries(dates).forEach(([date, recs]) => {
                        attendanceRecords.push({
                            id: crypto.randomUUID(),
                            date,
                            classId: cId,
                            records: recs
                        });
                    });
                });

                await Promise.all(loadedClasses.map(async (cls: ClassGroup) => {
                    try {
                        const studentsListRaw = await api.getStudents(cls.id); // Students can stay, though they could be optimized too if needed.

                        studentsListRaw.forEach((st: any) => {
                            cls.studentIds.push(st.id);
                            const nameParts = (st.name || '').split(' ');
                            studentsDict[st.id] = {
                                id: st.id,
                                firstName: nameParts[0] || '',
                                lastName: nameParts.slice(1).join(' '),
                                attendanceHistory: { present: 0, absent: 0, justified: 0, total: 0 },
                                risk: false
                            };
                        });
                    } catch (err) {
                        console.error('Error loading class data context', err);
                    }
                }));

                // Calculate stats
                Object.values(studentsDict).forEach(st => {
                    const stats = calculateAttendanceStats(st.id, attendanceRecords);
                    st.attendanceHistory = stats;
                    st.risk = isAtRisk(stats);
                });

                if (mounted) {
                    setDataState({ users: usersRaw, classes: loadedClasses, students: studentsDict, attendance: attendanceRecords });
                }
            } catch (err: any) {
                console.error("Failed to load initial data", err);
                if (err.message === 'UNAUTHORIZED') {
                    resetData();
                }
            } finally {
                if (mounted) setIsLoading(false);
            }
        };

        setIsLoading(true);
        loadInitialData();

        return () => { mounted = false; };
    }, [user]);

    const saveData = useCallback((newData: AppData) => setDataState(newData), []);

    const resetData = useCallback(() => {
        setDataState(defaultData);
        logout();
    }, [logout]);

    const addClass = useCallback(async (newClass: Omit<ClassGroup, 'id' | 'studentIds'>) => {
        try {
            const gradeStr = `${newClass.grado}|${newClass.seccion}`;
            const res = await api.createClass({ name: newClass.name, grade: gradeStr, professor_id: newClass.professorId });
            setDataState(prev => {
                const cls = { ...newClass, id: res.id, studentIds: [] };
                return { ...prev, classes: [...prev.classes, cls] };
            });
        } catch (e) { alert('Error: ' + (e as Error).message); }
    }, []);

    const deleteClass = useCallback(async (classId: string) => {
        try {
            await api.deleteClass(classId);
            setDataState(prev => ({ ...prev, classes: prev.classes.filter(c => c.id !== classId) }));
        } catch (e) { alert('Error: ' + (e as Error).message); }
    }, []);

    const updateClass = useCallback(async (id: string, updatedClass: Partial<ClassGroup>) => {
        try {
            const dataToUpdate: any = {};
            if (updatedClass.name) dataToUpdate.name = updatedClass.name;
            if (updatedClass.grado || updatedClass.seccion) {
                // To safely update grade, we might need current class state.
                const gradeStr = `${updatedClass.grado || ''}|${updatedClass.seccion || 'A'}`;
                dataToUpdate.grade = gradeStr;
            }
            if (updatedClass.professorId) dataToUpdate.professor_id = updatedClass.professorId;

            await api.updateClass(id, dataToUpdate);
            setDataState(prev => ({
                ...prev,
                classes: prev.classes.map(c => c.id === id ? { ...c, ...updatedClass } : c)
            }));
        } catch (e) { alert('Error: ' + (e as Error).message); }
    }, []);

    const addStudentToClass = useCallback(async (classId: string, studentProps: Omit<Student, 'id' | 'attendanceHistory' | 'risk'>) => {
        try {
            const res = await api.createStudent({
                name: `${studentProps.firstName} ${studentProps.lastName}`.trim(),
                class_id: classId
            });
            setDataState(prev => {
                const newStudent: Student = {
                    ...studentProps,
                    id: res.id,
                    attendanceHistory: { present: 0, absent: 0, justified: 0, total: 0 },
                    risk: false
                };
                return {
                    ...prev,
                    students: { ...prev.students, [res.id]: newStudent },
                    classes: prev.classes.map(c => c.id === classId ? { ...c, studentIds: [...c.studentIds, res.id] } : c)
                };
            });
        } catch (e) { alert('Error: ' + (e as Error).message); }
    }, []);

    const removeStudentFromClass = useCallback(async (classId: string, studentId: string) => {
        try {
            await api.deleteStudent(studentId);
            setDataState(prev => {
                const nextStudents = { ...prev.students };
                delete nextStudents[studentId];
                return {
                    ...prev,
                    students: nextStudents,
                    classes: prev.classes.map(c => c.id === classId ? { ...c, studentIds: c.studentIds.filter(id => id !== studentId) } : c)
                };
            });
        } catch (e) { alert('Error: ' + (e as Error).message); }
    }, []);

    const updateUser = useCallback(async (id: string, updatedUser: Partial<User>) => {
        // Handled in AuthContext for current user, but if Director updates others:
        try {
            if (updatedUser.name || updatedUser.role || updatedUser.password) {
                await api.updateUser(id, updatedUser);
            }
            setDataState(prev => ({
                ...prev,
                users: prev.users.map(u => u.id === id ? { ...u, ...updatedUser } : u)
            }));
        } catch (e) { alert('Error: ' + (e as Error).message); }
    }, []);

    const saveAttendance = useCallback(async (record: AttendanceRecord) => {
        try {
            await api.saveAttendance({
                class_id: record.classId,
                date: record.date,
                records: record.records.map(r => ({ student_id: r.studentId, status: r.status }))
            });

            setDataState(prev => {
                const filteredAttendance = prev.attendance.filter(a => !(a.classId === record.classId && a.date === record.date));
                const newAttendance = [...filteredAttendance, record];

                const nextStudents = { ...prev.students };
                const classObj = prev.classes.find(c => c.id === record.classId);
                if (classObj) {
                    classObj.studentIds.forEach(studentId => {
                        const stats = calculateAttendanceStats(studentId, newAttendance);
                        if (nextStudents[studentId]) {
                            nextStudents[studentId] = {
                                ...nextStudents[studentId],
                                attendanceHistory: stats,
                                risk: isAtRisk(stats)
                            };
                        }
                    });
                }
                return { ...prev, attendance: newAttendance, students: nextStudents };
            });
        } catch (e) { alert('Error: ' + (e as Error).message); throw e; }
    }, []);

    const deleteAttendance = useCallback(async (classId: string, date: string) => {
        try {
            await api.deleteAttendance(classId, date);
            setDataState(prev => {
                const newAttendance = prev.attendance.filter(a => !(a.classId === classId && a.date === date));
                const nextStudents = { ...prev.students };
                const classObj = prev.classes.find(c => c.id === classId);
                if (classObj) {
                    classObj.studentIds.forEach(studentId => {
                        const stats = calculateAttendanceStats(studentId, newAttendance);
                        if (nextStudents[studentId]) {
                            nextStudents[studentId] = {
                                ...nextStudents[studentId],
                                attendanceHistory: stats,
                                risk: isAtRisk(stats)
                            };
                        }
                    });
                }
                return { ...prev, attendance: newAttendance, students: nextStudents };
            });
        } catch (e) { alert('Error: ' + (e as Error).message); throw e; }
    }, []);

    const getClassStats = useCallback((classId: string) => {
        let present = 0, absent = 0, justified = 0, total = 0;
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
    if (context === undefined) throw new Error('useData must be used within a DataProvider');
    return context;
};
