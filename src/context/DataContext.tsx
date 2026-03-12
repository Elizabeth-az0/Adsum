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
    addClass: (newClass: Omit<ClassGroup, 'id' | 'studentIds'>, user: User | null) => Promise<void>;
    deleteClass: (classId: string, user: User | null) => Promise<void>;
    updateClass: (id: string, updatedClass: Partial<ClassGroup>, user: User | null) => Promise<void>;
    addStudentToClass: (classId: string, student: Omit<Student, 'id' | 'attendanceHistory' | 'risk'>, user: User | null) => void;
    removeStudentFromClass: (classId: string, studentId: string, user: User | null) => void;
    updateUser: (id: string, updatedUser: Partial<User> & { password?: string }) => Promise<void>;
    addUser: (newUser: Omit<User, 'id' | 'avatar' | 'classes'> & { password?: string }) => Promise<void>;
    deleteUser: (id: string) => Promise<void>;
    saveAttendance: (record: AttendanceRecord, user?: User | null) => Promise<void>;
    deleteAttendance: (classId: string, date: string, user?: User | null) => Promise<void>;
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
        const controller = new AbortController();
        const signal = controller.signal;
        let mounted = true;

        const loadInitialData = async () => {
            if (!user) {
                if (mounted) setIsLoading(false);
                return;
            }
            try {
                const initData = await api.getInitData(signal);

                const usersRaw = initData.users || [];
                const classesRaw = initData.classes || [];
                const studentsRaw = initData.students || [];
                const attendanceRaw = initData.attendance || [];

                const loadedClasses: ClassGroup[] = classesRaw.map((c: any) => {
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

                // agrupamos todo por clase y fecha
                const recordsByClassAndDate: Record<string, Record<string, any[]>> = {};
                attendanceRaw.forEach((row: any) => {
                    if (!recordsByClassAndDate[row.class_id]) recordsByClassAndDate[row.class_id] = {};
                    if (!recordsByClassAndDate[row.class_id][row.date]) recordsByClassAndDate[row.class_id][row.date] = [];
                    recordsByClassAndDate[row.class_id][row.date].push({ studentId: row.student_id, status: row.status });
                });

                // armamos el array final con las asistencias
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

                // asosiamos estudiantes a clases global
                studentsRaw.forEach((st: any) => {
                    const cls = loadedClasses.find(c => c.id === st.class_id);
                    if (cls) {
                        cls.studentIds.push(st.id);
                    }
                    const nameParts = (st.name || '').split(' ');
                    studentsDict[st.id] = {
                        id: st.id,
                        firstName: nameParts[0] || '',
                        lastName: nameParts.slice(1).join(' '),
                        attendanceHistory: { present: 0, absent: 0, justified: 0, total: 0 },
                        risk: false
                    };
                });

                // sacamos las cuentas de las faltas
                Object.values(studentsDict).forEach(st => {
                    const stats = calculateAttendanceStats(st.id, attendanceRecords);
                    st.attendanceHistory = stats;
                    st.risk = isAtRisk(stats);
                });

                if (mounted) {
                    setDataState({ users: usersRaw, classes: loadedClasses, students: studentsDict, attendance: attendanceRecords });
                }
            } catch (err: any) {
                if (err.name === 'AbortError') return;
                console.error("Failed to load initial data", err);
                if (err.message === 'UNAUTHORIZED' && mounted) {
                    resetData();
                }
            } finally {
                if (mounted) setIsLoading(false);
            }
        };

        setIsLoading(true);
        loadInitialData();

        return () => {
            mounted = false;
            controller.abort();
        };
    }, [user]);

    const saveData = useCallback((newData: AppData) => setDataState(newData), []);

    const resetData = useCallback(() => {
        setDataState(defaultData);
        logout();
    }, [logout]);

    const addClass = useCallback(async (newClass: Omit<ClassGroup, 'id' | 'studentIds'>) => {
        const gradeStr = `${newClass.grado}|${newClass.seccion}`;
        const res = await api.createClass({ name: newClass.name, grade: gradeStr, professor_id: newClass.professorId });
        setDataState(prev => {
            const cls = { ...newClass, id: res.id, studentIds: [] };
            return { ...prev, classes: [...prev.classes, cls] };
        });
    }, []);

    const deleteClass = useCallback(async (classId: string) => {
        await api.deleteClass(classId);
        setDataState(prev => {
            const nextStudents = { ...prev.students };
            const classToDelete = prev.classes.find(c => c.id === classId);
            if (classToDelete) {
                classToDelete.studentIds.forEach(id => delete nextStudents[id]);
            }
            return {
                ...prev,
                classes: prev.classes.filter(c => c.id !== classId),
                students: nextStudents,
                attendance: prev.attendance.filter(a => a.classId !== classId)
            };
        });
    }, []);

    const updateClass = useCallback(async (id: string, updatedClass: Partial<ClassGroup>) => {
        const dataToUpdate: any = {};
        if (updatedClass.name) dataToUpdate.name = updatedClass.name;
        if (updatedClass.grado || updatedClass.seccion) {
            // armamos el string del grado por si aca
            const gradeStr = `${updatedClass.grado || ''}|${updatedClass.seccion || 'A'}`;
            dataToUpdate.grade = gradeStr;
        }
        if (updatedClass.professorId) dataToUpdate.professor_id = updatedClass.professorId;

        await api.updateClass(id, dataToUpdate);
        setDataState(prev => ({
            ...prev,
            classes: prev.classes.map(c => c.id === id ? { ...c, ...updatedClass } : c)
        }));
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
        } catch (e) { throw e; }
    }, []);

    const removeStudentFromClass = useCallback(async (classId: string, studentId: string) => {
        try {
            await api.deleteStudent(studentId);
            setDataState(prev => {
                const nextStudents = { ...prev.students };
                delete nextStudents[studentId];

                // Limpiamos de la asistencia también para no ver fantasmas en los reportes
                const nextAttendance = prev.attendance.map(a => ({
                    ...a,
                    records: a.records.filter(r => r.studentId !== studentId)
                }));

                return {
                    ...prev,
                    students: nextStudents,
                    classes: prev.classes.map(c => c.id === classId ? { ...c, studentIds: c.studentIds.filter(id => id !== studentId) } : c),
                    attendance: nextAttendance
                };
            });
        } catch (e) { throw e; }
    }, []);

    const updateUser = useCallback(async (id: string, updatedUser: Partial<User> & { password?: string }) => {
        // el dire cambia info de otros profes por acá
        try {
            if (updatedUser.name || updatedUser.role || updatedUser.password) {
                await api.updateUser(id, updatedUser);
            }
            setDataState(prev => {
                const updatedProps = { ...updatedUser };
                delete updatedProps.password; // Don't save password in local state
                return {
                    ...prev,
                    users: prev.users.map(u => u.id === id ? { ...u, ...updatedProps } : u)
                };
            });
        } catch (e) { throw e; }
    }, []);

    const addUser = useCallback(async (newUser: Omit<User, 'id' | 'avatar' | 'classes'> & { password?: string }) => {
        try {
            const res = await api.createUser(newUser);
            setDataState(prev => ({
                ...prev,
                users: [...prev.users, res]
            }));
        } catch (e) { throw e; }
    }, []);

    const deleteUser = useCallback(async (id: string) => {
        try {
            await api.deleteUser(id);
            setDataState(prev => ({
                ...prev,
                users: prev.users.filter(u => u.id !== id)
            }));
        } catch (e) { throw e; }
    }, []);

    const saveAttendance = useCallback(async (record: AttendanceRecord) => {
        try {
            if (!record.records || record.records.length === 0) {
                throw new Error('Sin estudiantes para registrar');
            }

            if (!navigator.onLine) {
                const { saveToOfflineQueue } = await import('../lib/offlineQueue');
                await saveToOfflineQueue({
                    id: crypto.randomUUID(),
                    classId: record.classId,
                    date: record.date,
                    records: record.records.map(r => ({ studentId: r.studentId, status: r.status as "PRESENT" | "ABSENT" | "JUSTIFIED" })),
                    timestamp: Date.now()
                });

                window.dispatchEvent(new Event('sync-offline-triggered'));

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

                throw new Error('OFFLINE_SAVED');
            }

            try {
                await api.saveAttendance({
                    class_id: record.classId,
                    date: record.date,
                    records: record.records.map(r => ({ student_id: r.studentId, status: r.status }))
                });
            } catch (apiError: any) {
                // If it's a network error or explicitly offline, fallback to queue
                if (!navigator.onLine || apiError.message === 'Failed to fetch' || apiError.name === 'TypeError') {
                    const { saveToOfflineQueue } = await import('../lib/offlineQueue');
                    await saveToOfflineQueue({
                        id: crypto.randomUUID(),
                        classId: record.classId,
                        date: record.date,
                        records: record.records.map(r => ({ studentId: r.studentId, status: r.status as "PRESENT" | "ABSENT" | "JUSTIFIED" })),
                        timestamp: Date.now()
                    });

                    window.dispatchEvent(new Event('sync-offline-triggered'));

                    // Update state locally since we saved to the queue 
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

                    // Throw specific error for UI to show nice offline message
                    const offlineError = new Error('OFFLINE_SAVED');
                    offlineError.name = 'OFFLINE_SAVED';
                    throw offlineError;
                }
                throw apiError; // It's a real API logic error, bubble up
            }

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
        } catch (e) { throw e; }
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
        } catch (e) { throw e; }
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
            addStudentToClass, removeStudentFromClass, updateUser, addUser, deleteUser,
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
