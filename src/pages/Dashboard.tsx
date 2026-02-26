import React, { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Users, UserCheck, UserX, AlertTriangle, Calendar, ArrowRight, CheckCircle2, Circle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const { data, getClassStats } = useData();

    const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // Calculate Global Stats
    const stats = useMemo(() => {
        let totalStudents = 0;
        let totalPresent = 0;
        let totalAbsent = 0;
        let riskCount = 0;

        // Filter classes based on role
        const myClasses = data.classes.filter(c =>
            user?.role === 'DIRECTOR' || c.professorId === user?.id
        );

        // Get unique students from my classes to avoid double counting if student is in multiple classes (though logic below simplifies this)
        // For simplicity, we'll iterate through students map and check if they belong to any of my classes
        const myStudentIds = new Set<string>();
        myClasses.forEach(c => c.studentIds.forEach(id => myStudentIds.add(id)));

        myStudentIds.forEach(id => {
            const s = data.students[id];
            if (s) {
                totalStudents++;
                if (s.risk) riskCount++;
                // For daily stats, we need to check today's attendance records
                // This is a bit complex as 'attendanceHistory' is aggregate.
                // We need to look at 'attendance' array for today.
            }
        });

        // Calculate today's attendance
        const todayISO = new Date().toISOString().split('T')[0];
        const todaysRecords = data.attendance.filter(r => r.date === todayISO);

        // Filter records for my classes
        const myClassIds = myClasses.map(c => c.id);
        const myTodaysRecords = todaysRecords.filter(r => myClassIds.includes(r.classId));

        myTodaysRecords.forEach(record => {
            record.records.forEach(r => {
                if (r.status === 'PRESENT') totalPresent++;
                if (r.status === 'ABSENT') totalAbsent++;
            });
        });

        // If no attendance taken today, these will be 0.
        // Attendance % is based on history for the KPI card usually, or today?
        // Requirement says: "Métricas del día en tiempo real: porcentaje de asistencia global"
        // So it implies today's attendance.

        const attendanceRate = (totalPresent + totalAbsent) > 0
            ? Math.round((totalPresent / (totalPresent + totalAbsent)) * 100)
            : 0;

        return {
            attendanceRate,
            present: totalPresent,
            absent: totalAbsent,
            risk: riskCount
        };
    }, [data, user]);

    const myClasses = data.classes.filter(c =>
        user?.role === 'DIRECTOR' || c.professorId === user?.id
    );

    const todayISO = new Date().toISOString().split('T')[0];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Hola, {(user?.name || user?.username)?.split(' ')[0]} 👋</h1>
                    <div className="flex items-center gap-2 text-slate-500 mt-1">
                        <Calendar className="w-4 h-4" />
                        <span className="capitalize">{today}</span>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                            <Users className="w-6 h-6" />
                        </div>
                        <span className={cn("text-sm font-bold px-2 py-1 rounded-lg", stats.attendanceRate >= 90 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>
                            {stats.attendanceRate}% Hoy
                        </span>
                    </div>
                    <p className="text-slate-500 text-sm font-medium">Asistencia Global</p>
                    <h3 className="text-3xl font-bold text-slate-900 mt-1">{stats.attendanceRate}%</h3>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                            <UserCheck className="w-6 h-6" />
                        </div>
                    </div>
                    <p className="text-slate-500 text-sm font-medium">Presentes Hoy</p>
                    <h3 className="text-3xl font-bold text-slate-900 mt-1">{stats.present}</h3>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                            <UserX className="w-6 h-6" />
                        </div>
                    </div>
                    <p className="text-slate-500 text-sm font-medium">Ausentes Hoy</p>
                    <h3 className="text-3xl font-bold text-slate-900 mt-1">{stats.absent}</h3>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        {stats.risk > 0 && (
                            <span className="flex h-3 w-3 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                        )}
                    </div>
                    <p className="text-slate-500 text-sm font-medium">Estudiantes en Riesgo</p>
                    <h3 className="text-3xl font-bold text-slate-900 mt-1">{stats.risk}</h3>
                </div>
            </div>

            {/* Classes List */}
            <div>
                <h2 className="text-xl font-bold text-slate-900 mb-4">Todas las Aulas</h2>
                {myClasses.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {myClasses.map(cls => {
                            const isTaken = data.attendance.some(r => r.classId === cls.id && r.date === todayISO);
                            const stats = getClassStats(cls.id);
                            const attendancePct = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;

                            return (
                                <div key={cls.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="font-bold text-lg text-slate-900">{cls.name}</h3>
                                            <p className="text-slate-500 text-sm">{cls.room}</p>
                                        </div>
                                        {isTaken ? (
                                            <div className="text-green-500">
                                                <CheckCircle2 className="w-6 h-6" />
                                            </div>
                                        ) : (
                                            <div className="text-slate-300">
                                                <Circle className="w-6 h-6" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="mb-6">
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="text-slate-500">Asistencia Histórica</span>
                                            <span className="font-bold text-slate-900">{attendancePct}%</span>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={cn("h-full rounded-full", attendancePct >= 90 ? "bg-green-500" : attendancePct >= 75 ? "bg-amber-500" : "bg-red-500")}
                                                style={{ width: `${attendancePct}%` }}
                                            />
                                        </div>
                                    </div>

                                    <Link
                                        to={isTaken ? `/reports` : `/attendance?classId=${cls.id}`}
                                        className={cn(
                                            "w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-colors",
                                            isTaken
                                                ? "bg-slate-50 text-slate-600 hover:bg-slate-100"
                                                : "bg-primary-600 text-white hover:bg-primary-700"
                                        )}
                                    >
                                        {isTaken ? 'Ver Reporte' : 'Registrar Asistencia'}
                                        {!isTaken && <ArrowRight className="w-4 h-4" />}
                                    </Link>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Calendar className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">No tienes aulas asignadas</h3>
                        <p className="text-slate-500 mb-6">Crea usuarios y asigna aulas en el panel de administración.</p>
                        <Link
                            to="/admin"
                            className="inline-flex items-center justify-center px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
                        >
                            Ir a Administración
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
