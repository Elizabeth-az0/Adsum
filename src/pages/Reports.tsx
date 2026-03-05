import React, { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

const Reports: React.FC = () => {
    const { data, resetData } = useData();
    const { user } = useAuth();
    const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month'>('week');
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);

    const myClasses = data.classes.filter(c =>
        user?.role === 'DIRECTOR' || c.professorId === user?.id
    );
    const myClassIds = myClasses.map(c => c.id);

    // filtramos la asis según el tiempo
    const filteredAttendance = useMemo(() => {
        const now = new Date();
        now.setHours(23, 59, 59, 999);
        const threshold = new Date(now);

        if (timeFilter === 'today') {
            threshold.setHours(0, 0, 0, 0);
        } else if (timeFilter === 'week') {
            threshold.setDate(threshold.getDate() - 7);
        } else if (timeFilter === 'month') {
            threshold.setMonth(threshold.getMonth() - 1);
        }

        return data.attendance.filter(r => {
            const rDate = new Date(r.date + 'T12:00:00'); // Normalize 
            return myClassIds.includes(r.classId) && rDate >= threshold && rDate <= now;
        });
    }, [data.attendance, timeFilter, myClassIds]);

    // los que están en rojo (por el total histórico)
    const riskStudents = useMemo(() => {
        return Object.values(data.students)
            .filter(s => s.risk && myClassIds.some(cid => data.classes.find(c => c.id === cid)?.studentIds.includes(s.id)))
            .sort((a, b) => b.attendanceHistory.absent - a.attendanceHistory.absent);
    }, [data.students, myClassIds, data.classes]);

    // data para los gráficos
    const chartData = useMemo(() => {
        let totalPresent = 0;
        let totalAbsent = 0;
        let totalJustified = 0;

        // barras según el filtro
        let daysToGenerate = 5;
        if (timeFilter === 'today') daysToGenerate = 1;
        if (timeFilter === 'week') daysToGenerate = 7;
        if (timeFilter === 'month') daysToGenerate = 30;

        const trendDays = Array.from({ length: daysToGenerate }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (daysToGenerate - 1 - i));
            return d.toISOString().split('T')[0];
        });

        const trendData = trendDays.map(dateStr => {
            const dayRecords = filteredAttendance.filter(r => r.date === dateStr);
            let p = 0, a = 0, j = 0;
            dayRecords.forEach(rec => {
                rec.records.forEach(r => {
                    if (r.status === 'PRESENT') { p++; totalPresent++; }
                    if (r.status === 'ABSENT') { a++; totalAbsent++; }
                    if (r.status === 'JUSTIFIED') { j++; totalJustified++; }
                });
            });

            // achicamos el texto para que no se amontone
            let name = new Date(dateStr + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short' });
            if (timeFilter === 'month') {
                const d = new Date(dateStr + 'T12:00:00');
                name = `${d.getDate()}/${d.getMonth() + 1}`;
            }

            return { name, Presentes: p, Ausentes: a, Justificados: j };
        });

        const pieData = [
            { name: 'Presentes', value: totalPresent, color: '#22c55e' },
            { name: 'Ausentes', value: totalAbsent, color: '#ef4444' },
            { name: 'Justificados', value: totalJustified, color: '#f59e0b' },
        ].filter(d => d.value > 0);

        return { trendData, pieData };
    }, [filteredAttendance, timeFilter]);

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-2xl font-bold text-slate-900">Reportes y Estadísticas</h1>

                <div className="flex gap-2 bg-white p-1 rounded-xl border border-slate-200">
                    {(['today', 'week', 'month'] as const).map(filter => (
                        <button
                            key={filter}
                            onClick={() => setTimeFilter(filter)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${timeFilter === filter
                                ? 'bg-primary-100 text-primary-700'
                                : 'text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            {filter === 'today' ? 'Hoy' : filter === 'week' ? 'Semana' : 'Mes'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-900 mb-6">Tendencia de Asistencia</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height={300} minWidth={0} minHeight={0}>
                            <BarChart data={chartData.trendData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend />
                                <Bar dataKey="Presentes" fill="#22c55e" radius={[4, 4, 0, 0]} stackId={timeFilter === 'month' ? "a" : undefined} />
                                <Bar dataKey="Ausentes" fill="#ef4444" radius={[4, 4, 0, 0]} stackId={timeFilter === 'month' ? "a" : undefined} />
                                <Bar dataKey="Justificados" fill="#f59e0b" radius={[4, 4, 0, 0]} stackId={timeFilter === 'month' ? "a" : undefined} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>


                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-900 mb-6">Proporción en el periodo</h3>
                    <div className="h-[300px] w-full flex items-center justify-center">
                        {chartData.pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300} minWidth={0} minHeight={0}>
                                <PieChart>
                                    <Pie
                                        data={chartData.pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {chartData.pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-slate-500">No hay datos de asistencia para el periodo seleccionado.</p>
                        )}
                    </div>
                </div>
            </div>


            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900">Estudiantes con más faltas</h3>
                        <p className="text-sm text-slate-500">10 o más faltas acumuladas (Máx. permitido: 30)</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-100 text-slate-500 text-sm">
                                <th className="pb-4 font-medium">Estudiante</th>
                                <th className="pb-4 font-medium">Clase</th>
                                <th className="pb-4 font-medium">Faltas totales</th>
                                <th className="pb-4 font-medium">Asistencia</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {riskStudents.length > 0 ? (
                                riskStudents.map(student => {
                                    const rawRate = student.attendanceHistory.total ? (student.attendanceHistory.present / student.attendanceHistory.total) * 100 : 0;
                                    const rate = Math.round(rawRate);
                                    return (
                                        <tr key={student.id} className="group hover:bg-slate-50 transition-colors">
                                            <td className="py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500">
                                                        {student.firstName[0]}{student.lastName[0]}
                                                    </div>
                                                    <span className="font-medium text-slate-900">{student.firstName} {student.lastName}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 text-slate-600">
                                                {data.classes.find(c => c.studentIds.includes(student.id))?.name || 'N/A'}
                                            </td>
                                            <td className="py-4">
                                                <span className="font-bold text-red-600">{student.attendanceHistory.absent} / 30</span>
                                            </td>
                                            <td className="py-4 text-slate-600">
                                                {rate}%
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={4} className="py-8 text-center text-slate-500">
                                        No hay estudiantes con 10 o más faltas.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>


            <div className="flex justify-end pt-8 border-t border-slate-200">
                <button
                    onClick={() => setIsResetModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
                >
                    <RefreshCw className="w-4 h-4" />
                    Reiniciar Datos de Demostración
                </button>
            </div>

            <ConfirmModal
                isOpen={isResetModalOpen}
                title="Reiniciar Datos"
                message="¿Estás seguro de que deseas reiniciar todos los datos? Esta acción borrará todas las aulas, alumnos y asistencias, restaurando todo a los valores de fábrica. No se puede deshacer."
                onConfirm={() => {
                    setIsResetModalOpen(false);
                    resetData();
                }}
                onCancel={() => setIsResetModalOpen(false)}
            />
        </div>
    );
};

export default Reports;
