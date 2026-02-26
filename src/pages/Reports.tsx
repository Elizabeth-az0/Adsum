import React, { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertTriangle, RefreshCw } from 'lucide-react';

const Reports: React.FC = () => {
    const { data, resetData } = useData();
    const { user } = useAuth();
    const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month'>('week');

    const myClasses = data.classes.filter(c =>
        user?.role === 'DIRECTOR' || c.professorId === user?.id
    );
    const myClassIds = myClasses.map(c => c.id);

    // Risk List
    const riskStudents = useMemo(() => {
        return Object.values(data.students)
            .filter(s => s.risk && myClassIds.some(cid => data.classes.find(c => c.id === cid)?.studentIds.includes(s.id)))
            .sort((a, b) => (a.attendanceHistory.present / a.attendanceHistory.total) - (b.attendanceHistory.present / b.attendanceHistory.total));
    }, [data.students, myClassIds, data.classes]);

    // Chart Data
    const chartData = useMemo(() => {
        // Pie Chart Data (Aggregate)
        let totalPresent = 0;
        let totalAbsent = 0;
        let totalJustified = 0;

        // Bar Chart Data (Trend - Last 5 days)
        const last5Days = Array.from({ length: 5 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (4 - i));
            return d.toISOString().split('T')[0];
        });

        const trendData = last5Days.map(date => {
            const dayRecords = data.attendance.filter(r => r.date === date && myClassIds.includes(r.classId));
            let p = 0, a = 0, j = 0;
            dayRecords.forEach(rec => {
                rec.records.forEach(r => {
                    if (r.status === 'PRESENT') p++;
                    if (r.status === 'ABSENT') a++;
                    if (r.status === 'JUSTIFIED') j++;
                });
            });
            return {
                name: new Date(date).toLocaleDateString('es-ES', { weekday: 'short' }),
                Presentes: p,
                Ausentes: a,
                Justificados: j
            };
        });

        // Aggregate totals from all history for Pie Chart
        // Or should it respect the time filter? Requirement says "Métricas Clave: Asistencia histórica total".
        // Let's use historical total for Pie Chart as per requirement implies "proporción histórica".

        Object.values(data.students).forEach(s => {
            // Only count if student is in my classes
            if (myClassIds.some(cid => data.classes.find(c => c.id === cid)?.studentIds.includes(s.id))) {
                totalPresent += s.attendanceHistory.present;
                totalAbsent += s.attendanceHistory.absent;
                totalJustified += s.attendanceHistory.justified;
            }
        });

        const pieData = [
            { name: 'Presentes', value: totalPresent, color: '#22c55e' },
            { name: 'Ausentes', value: totalAbsent, color: '#ef4444' },
            { name: 'Justificados', value: totalJustified, color: '#f59e0b' },
        ].filter(d => d.value > 0);

        return { trendData, pieData };
    }, [data.attendance, data.students, myClassIds, data.classes]);

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
                {/* Bar Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-900 mb-6">Tendencia de Asistencia (Últimos 5 días)</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData.trendData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend />
                                <Bar dataKey="Presentes" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Ausentes" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Justificados" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Pie Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-900 mb-6">Proporción Histórica</h3>
                    <div className="h-[300px] w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
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
                    </div>
                </div>
            </div>

            {/* Risk List */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900">Estudiantes en Riesgo</h3>
                        <p className="text-sm text-slate-500">Asistencia por debajo del 75%</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-100 text-slate-500 text-sm">
                                <th className="pb-4 font-medium">Estudiante</th>
                                <th className="pb-4 font-medium">Asistencia</th>
                                <th className="pb-4 font-medium">Faltas</th>
                                <th className="pb-4 font-medium">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {riskStudents.length > 0 ? (
                                riskStudents.map(student => {
                                    const rate = Math.round((student.attendanceHistory.present / student.attendanceHistory.total) * 100);
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
                                            <td className="py-4">
                                                <span className="font-bold text-red-600">{rate}%</span>
                                            </td>
                                            <td className="py-4 text-slate-600">{student.attendanceHistory.absent}</td>
                                            <td className="py-4">
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                                    Crítico
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={4} className="py-8 text-center text-slate-500">
                                        No hay estudiantes en riesgo. ¡Buen trabajo!
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Panic Button */}
            <div className="flex justify-end pt-8 border-t border-slate-200">
                <button
                    onClick={() => {
                        if (window.confirm('¿Estás seguro de que deseas reiniciar todos los datos? Esta acción no se puede deshacer.')) {
                            resetData();
                        }
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
                >
                    <RefreshCw className="w-4 h-4" />
                    Reiniciar Datos de Demostración
                </button>
            </div>
        </div>
    );
};

export default Reports;
