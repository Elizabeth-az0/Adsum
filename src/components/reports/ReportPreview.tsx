import React from 'react';

interface ReportData {
    classInfo: {
        id: string;
        name: string;
        grade: string;
    };
    period: {
        month: string;
        year: string;
    };
    students: {
        studentId: string;
        studentName: string;
        present: number;
        absent: number;
        justified: number;
        percent: number;
    }[];
    detailedAttendance: {
        student_id: string;
        date: string;
        status: string;
    }[];
    summary: {
        totalStudents: number;
        avgAttendance: number;
        atRiskStudents: number;
    };
}

interface ReportPreviewProps {
    data: ReportData | null;
    reportType: string;
    isLoading: boolean;
}

const ReportPreview: React.FC<ReportPreviewProps> = ({ data, reportType, isLoading }) => {
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                <p className="text-gray-500 dark:text-gray-400 font-medium">Cargando vista previa...</p>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-500 dark:text-gray-400 font-medium italic text-center">
                    Selecciona un aula y periodo para ver la vista previa del reporte
                </p>
            </div>
        );
    }

    const { classInfo, period, students, detailedAttendance, summary } = data;

    // Helper to get day from date string
    const getDay = (dateStr: string) => new Date(dateStr).getUTCDate();

    // Generate days for calendar view (only days with records)
    const activeDays = Array.from(new Set(detailedAttendance.map((a: any) => getDay(a.date)))).sort((a: any, b: any) => a - b);

    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-800 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Report Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold">Reporte de Asistencia</h2>
                        <p className="text-indigo-100 mt-1">
                            {classInfo.name} • {classInfo.grade.replace('|', ' ')}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-medium uppercase tracking-wider text-indigo-200">Periodo</p>
                        <p className="text-lg font-bold">{new Date(`${period.year}-${period.month}-01T12:00:00`).toLocaleString('es-ES', { month: 'long', year: 'numeric' })}</p>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                        <p className="text-xs text-indigo-100 uppercase font-bold">Total Estudiantes</p>
                        <p className="text-2xl font-black">{summary.totalStudents}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                        <p className="text-xs text-indigo-100 uppercase font-bold">Promedio Asistencia</p>
                        <div className="flex items-baseline">
                            <p className="text-2xl font-black">{summary.avgAttendance}%</p>
                        </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                        <p className="text-xs text-indigo-100 uppercase font-bold">Alumnos en Riesgo</p>
                        <p className="text-2xl font-black">{summary.atRiskStudents}</p>
                    </div>
                </div>
            </div>

            {/* Report Content */}
            <div className="p-6">
                <div className="overflow-x-auto">
                    {reportType === 'summary' && (
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800/50">
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Estudiante</th>
                                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Presentes</th>
                                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Ausentes</th>
                                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Justificados</th>
                                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">% Asistencia</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {students.map((s: any) => (
                                    <tr key={s.studentId} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white capitalize">{s.studentName.toLowerCase()}</td>
                                        <td className="px-4 py-3 text-sm text-center font-medium text-emerald-600 dark:text-emerald-400">{s.present}</td>
                                        <td className="px-4 py-3 text-sm text-center font-medium text-rose-600 dark:text-rose-400">{s.absent}</td>
                                        <td className="px-4 py-3 text-sm text-center font-medium text-amber-600 dark:text-amber-400">{s.justified}</td>
                                        <td className="px-4 py-3 text-right">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${s.percent >= 90 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                s.percent >= 75 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' :
                                                    'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400'
                                                }`}>
                                                {s.percent}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {reportType === 'history' && (
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800/50">
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Fecha</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Estudiante</th>
                                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {detailedAttendance.map((a: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                        <td className="px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                                            {new Date(a.date + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white capitalize">
                                            {students.find((s: any) => s.studentId === a.student_id)?.studentName.toLowerCase() || 'Estudiante'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className={`text-xs font-black px-2 py-0.5 rounded uppercase ${a.status === 'PRESENT' ? 'text-emerald-600 dark:text-emerald-400' :
                                                a.status === 'ABSENT' ? 'text-rose-600 dark:text-rose-400' :
                                                    'text-amber-600 dark:text-amber-400'
                                                }`}>
                                                {a.status === 'PRESENT' ? 'Presente' : a.status === 'ABSENT' ? 'Ausente' : 'Justificado'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {reportType === 'calendar' && (
                        <table className="min-w-full divide-x divide-y divide-gray-200 dark:divide-gray-800 border dark:border-gray-800">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800/50">
                                    <th className="px-3 py-2 text-left text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase border-r dark:border-gray-800">Estudiante</th>
                                    {activeDays.map(day => (
                                        <th key={day} className="px-1 py-2 text-center text-[10px] font-black text-gray-400 border-r dark:border-gray-800 min-w-[24px]">
                                            {day}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {students.map((s: any) => (
                                    <tr key={s.studentId} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                                        <td className="px-3 py-1.5 text-xs font-bold text-gray-900 dark:text-white border-r dark:border-gray-800 capitalize leading-tight">
                                            {s.studentName.toLowerCase().split(' ')[0]} {s.studentName.toLowerCase().split(' ')[1]?.[0]}.
                                        </td>
                                        {activeDays.map(day => {
                                            const att = detailedAttendance.find((a: any) => a.student_id === s.studentId && getDay(a.date) === day);
                                            return (
                                                <td key={day} className="px-1 py-1.5 text-center text-[10px] border-r dark:border-gray-800">
                                                    {att ? (
                                                        <span className={`font-black ${att.status === 'PRESENT' ? 'text-emerald-600' :
                                                            att.status === 'ABSENT' ? 'text-rose-600' :
                                                                'text-amber-600'
                                                            }`}>
                                                            {att.status === 'PRESENT' ? 'P' : att.status === 'ABSENT' ? 'A' : 'J'}
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                            )
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReportPreview;
