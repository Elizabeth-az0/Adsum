import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Trash2, Check, X, Clock, Save, CheckCircle2, ArrowLeft, Search, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { cn, getLocalISODate } from '../lib/utils';
import type { AttendanceRecord } from '../types';
import ConfirmModal from '../components/ConfirmModal';
import { useOfflineSync } from '../hooks/useOfflineSync';

const StudentCard = React.memo(({
    student,
    status,
    onStatusChange,
    index
}: {
    student: any,
    status?: 'PRESENT' | 'ABSENT' | 'JUSTIFIED',
    onStatusChange: (id: string, status: 'PRESENT' | 'ABSENT' | 'JUSTIFIED') => void,
    index: number
}) => {
    return (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both" style={{ animationDelay: `${Math.min(index * 20, 500)}ms` }}>
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-xl font-bold text-slate-500 shrink-0">
                {student.firstName[0]}{student.lastName[0]}
            </div>

            <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-900 truncate">{student.firstName} {student.lastName}</h3>
                <div className="flex gap-2 mt-3">
                    <button
                        onClick={() => onStatusChange(student.id, 'PRESENT')}
                        className={cn(
                            "flex-1 py-2 rounded-lg flex justify-center items-center transition-all",
                            status === 'PRESENT'
                                ? "bg-green-500 text-white shadow-md shadow-green-500/20"
                                : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                        )}
                        title="Presente"
                    >
                        <Check className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => onStatusChange(student.id, 'ABSENT')}
                        className={cn(
                            "flex-1 py-2 rounded-lg flex justify-center items-center transition-all",
                            status === 'ABSENT'
                                ? "bg-red-500 text-white shadow-md shadow-red-500/20"
                                : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                        )}
                        title="Ausente"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => onStatusChange(student.id, 'JUSTIFIED')}
                        className={cn(
                            "flex-1 py-2 rounded-lg flex justify-center items-center transition-all",
                            status === 'JUSTIFIED'
                                ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                                : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                        )}
                        title="Justificado"
                    >
                        <Clock className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
});

const Attendance: React.FC = () => {
    const [searchParams] = useSearchParams();
    const classIdParam = searchParams.get('classId');
    const { data, saveAttendance, deleteAttendance } = useData();
    const { user } = useAuth();
    const syncStatus = useOfflineSync();

    const [selectedClassId, setSelectedClassId] = useState<string>(classIdParam || '');
    const [selectedDate, setSelectedDate] = useState<string>(getLocalISODate());
    const [attendanceState, setAttendanceState] = useState<Record<string, 'PRESENT' | 'ABSENT' | 'JUSTIFIED'>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState<string>('');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // las clases de este profe (o todas si es dire)
    const myClasses = data.classes.filter(c =>
        user?.role === 'DIRECTOR' || c.professorId === user?.id
    );

    useEffect(() => {
        if (classIdParam) {
            setSelectedClassId(classIdParam);
        }
    }, [classIdParam]);

    // traemos los datos cuando se elige otra clase o se cambia la fecha
    useEffect(() => {
        if (selectedClassId) {
            const cls = data.classes.find(c => c.id === selectedClassId);
            if (cls) {
                const existingRecord = data.attendance.find(r => r.classId === selectedClassId && r.date === selectedDate);

                if (existingRecord) {
                    const loadedState: Record<string, 'PRESENT' | 'ABSENT' | 'JUSTIFIED'> = {};
                    existingRecord.records.forEach(r => {
                        loadedState[r.studentId] = r.status as 'PRESENT' | 'ABSENT' | 'JUSTIFIED';
                    });
                    setAttendanceState(loadedState);
                } else {
                    setAttendanceState({});
                }
                setError('');
                setSuccess('');
            }
        }
    }, [selectedClassId, selectedDate, data.classes, data.attendance]);

    const selectedClass = data.classes.find(c => c.id === selectedClassId);

    const students = useMemo(() => {
        if (!selectedClass) return [];
        return selectedClass.studentIds
            .map(id => data.students[id])
            .filter(s => s && (s.firstName.toLowerCase().includes(searchTerm.toLowerCase()) || s.lastName.toLowerCase().includes(searchTerm.toLowerCase())));
    }, [selectedClass, data.students, searchTerm]);

    const stats = useMemo(() => {
        let present = 0, absent = 0, justified = 0;
        Object.values(attendanceState).forEach(status => {
            if (status === 'PRESENT') present++;
            if (status === 'ABSENT') absent++;
            if (status === 'JUSTIFIED') justified++;
        });
        return { present, absent, justified };
    }, [attendanceState]);

    const handleStatusChange = React.useCallback((studentId: string, status: 'PRESENT' | 'ABSENT' | 'JUSTIFIED') => {
        setAttendanceState(prev => ({ ...prev, [studentId]: status }));
    }, []);

    const markAllPresent = () => {
        if (!selectedClass) return;
        const newState: Record<string, 'PRESENT' | 'ABSENT' | 'JUSTIFIED'> = {};
        selectedClass.studentIds.forEach(id => newState[id] = 'PRESENT');
        setAttendanceState(prev => ({ ...prev, ...newState }));
    };

    const handleSave = async () => {
        if (!selectedClass || isSaving) return;

        if (selectedClass.studentIds.length === 0) {
            setError('No hay estudiantes en esta clase para registrar asistencia.');
            setSuccess('');
            return;
        }

        const missing = selectedClass.studentIds.some(id => !attendanceState[id]);
        if (missing) {
            setError('Por favor, registra la asistencia de todos los estudiantes antes de guardar.');
            setSuccess('');
            return;
        }

        setIsSaving(true);
        const record: AttendanceRecord = {
            id: Math.random().toString(36).substr(2, 9),
            date: selectedDate,
            classId: selectedClass.id,
            records: Object.entries(attendanceState).map(([studentId, status]) => ({
                studentId,
                status: status as 'PRESENT' | 'ABSENT' | 'JUSTIFIED'
            }))
        };

        try {
            await saveAttendance(record, user);
            setError('');
            setSuccess('Asistencia guardada correctamente.');
            setTimeout(() => {
                setSuccess('');
                setSelectedClassId(''); // lo devolvemos a la lista
            }, 2000);
        } catch (err: any) {
            if (err.message === 'OFFLINE_SAVED') {
                setError('');
                setSuccess('Sin conexión. La asistencia se guardará y se sincronizará automáticamente cuando vuelva internet.');
                setTimeout(() => {
                    setSuccess('');
                    setSelectedClassId('');
                }, 4000);
            } else {
                setError(err.message || 'Hubo un error al guardar la asistencia.');
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = () => {
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!selectedClass) return;
        try {
            await deleteAttendance(selectedClass.id, selectedDate, user);
            setAttendanceState({});
            setSuccess('Registro eliminado correctamente.');
            setError('');
            setIsDeleteModalOpen(false);
            setTimeout(() => {
                setSuccess('');
                setSelectedClassId(''); // de vuelta al inicio
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'Hubo un error al eliminar el registro.');
            setIsDeleteModalOpen(false);
        }
    };

    const hasRecordToday = Object.keys(attendanceState).length > 0 && data.attendance.some(r => r.classId === selectedClassId && r.date === selectedDate && r.records && r.records.length > 0);

    const renderSyncIndicator = () => (
        <div className={cn(
            "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors",
            syncStatus === 'Sincronizado' ? "bg-green-50 text-green-700 border-green-200" :
                syncStatus === 'Pendiente de sincronizar' ? "bg-amber-50 text-amber-700 border-amber-200" :
                    "bg-red-50 text-red-700 border-red-200"
        )}>
            {syncStatus === 'Sincronizado' ? <Wifi className="w-3.5 h-3.5" /> :
                syncStatus === 'Pendiente de sincronizar' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> :
                    <WifiOff className="w-3.5 h-3.5" />}
            {syncStatus}
        </div>
    );

    // si no hay clase elegida mostramos las tarjetas
    if (!selectedClassId || !selectedClass) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Seleccionar Aula</h1>
                        <p className="text-slate-500">
                            {user?.role === 'DIRECTOR' ? 'Vista de Director (Todas las aulas)' : 'Tus aulas asignadas'}
                        </p>
                    </div>
                    {renderSyncIndicator()}
                </div>
                {myClasses.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
                        <p className="text-slate-500">No hay aulas disponibles.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {myClasses.map(cls => (
                            <button
                                key={cls.id}
                                onClick={() => {
                                    setSelectedClassId(cls.id);
                                    setError('');
                                    setSuccess('');
                                }}
                                className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow text-left flex flex-col gap-2"
                            >
                                <div className="flex justify-between items-start w-full">
                                    <h3 className="text-xl font-bold text-slate-900">{cls.name}</h3>
                                    <span className="text-sm font-medium bg-primary-50 text-primary-700 px-3 py-1 rounded-full">
                                        {cls.grado} {cls.seccion}
                                    </span>
                                </div>
                                <p className="text-slate-500 text-sm mt-2">{cls.studentIds.length} Estudiantes</p>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                {renderSyncIndicator()}
            </div>

            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200">
                    {error}
                </div>
            )}
            {success && (
                <div className="bg-green-50 text-green-700 p-4 rounded-xl border border-green-200">
                    {success}
                </div>
            )}


            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-4">
                    <button onClick={() => setSelectedClassId('')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">{selectedClass.name}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                max={getLocalISODate()}
                                className="text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6 mt-4 md:mt-0 flex-wrap">
                    <div className="flex gap-4 text-sm font-medium">
                        <div className="flex items-center gap-2 text-green-600">
                            <span className="bg-green-100 px-2 py-1 rounded-lg">{stats.present}</span>
                            <span>Presentes</span>
                        </div>
                        <div className="flex items-center gap-2 text-red-600">
                            <span className="bg-red-100 px-2 py-1 rounded-lg">{stats.absent}</span>
                            <span>Ausentes</span>
                        </div>
                        <div className="flex items-center gap-2 text-amber-600">
                            <span className="bg-amber-100 px-2 py-1 rounded-lg">{stats.justified}</span>
                            <span>Justif.</span>
                        </div>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
                        {hasRecordToday && (
                            <button
                                onClick={handleDelete}
                                className="flex-1 md:flex-none border border-red-200 text-red-600 hover:bg-red-50 px-4 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                            >
                                <Trash2 className="w-5 h-5" />
                                <span className="hidden md:inline">Eliminar</span>
                            </button>
                        )}
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className={cn(
                                "flex-1 md:flex-none bg-primary-600 text-white px-6 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-none",
                                isSaving ? "opacity-50 cursor-not-allowed" : "hover:bg-primary-700"
                            )}
                        >
                            <Save className="w-5 h-5" />
                            {isSaving ? 'Guardando...' : hasRecordToday ? 'Actualizar' : 'Guardar'}
                        </button>
                    </div>
                </div>
            </div>


            <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar estudiante..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                    />
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                    <select
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        className="w-full md:w-auto px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                    >
                        {myClasses.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>

                    <button
                        onClick={markAllPresent}
                        className="whitespace-nowrap px-4 py-3 bg-white border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-none"
                    >
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        Marcar Todos Presentes
                    </button>
                </div>
            </div>


            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {students.map((student, idx) => (
                    <StudentCard
                        key={student.id}
                        student={student}
                        status={attendanceState[student.id]}
                        onStatusChange={handleStatusChange}
                        index={idx}
                    />
                ))}
            </div>

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                title="Eliminar Registro"
                message={`¿Seguro que deseas eliminar el registro de asistencia del ${selectedDate} para esta clase? Esta acción no se puede deshacer y los reportes se actualizarán.`}
                onConfirm={confirmDelete}
                onCancel={() => setIsDeleteModalOpen(false)}
            />
        </div>
    );
};

export default Attendance;
