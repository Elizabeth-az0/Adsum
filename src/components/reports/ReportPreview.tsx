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
    exportFormat: string;
    isLoading: boolean;
}

const ReportPreview: React.FC<ReportPreviewProps> = ({ data, reportType, exportFormat, isLoading }) => {
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

    const { classInfo, period, students, detailedAttendance } = data;

    // Calcular totales globales para el encabezado
    const totalPresent = students.reduce((acc, s) => acc + s.present, 0);
    const totalAbsent = students.reduce((acc, s) => acc + s.absent, 0);
    const totalJustified = students.reduce((acc, s) => acc + s.justified, 0);

    // Helper to get day from date string
    const getDay = (dateStr: string) => new Date(dateStr + 'T12:00:00').getUTCDate();

    // Generate days for calendar view (only days with records)
    const activeDays = Array.from(new Set(detailedAttendance.map((a) => getDay(a.date)))).sort((a, b) => a - b);

    if (exportFormat === 'excel') {
        return (
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-inner border-2 border-slate-200 dark:border-slate-800 p-8 overflow-hidden font-mono text-xs">
                <div className="mb-4 flex items-center gap-4 text-slate-500 uppercase font-bold tracking-tighter pb-4 border-b border-slate-200 dark:border-slate-800">
                    <div className="bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 rounded text-emerald-700">EXCEL PREVIEW</div>
                    <span>{classInfo.name}</span>
                    <span>{new Date(`${period.year}-${period.month}-01T12:00:00`).toLocaleString('es-ES', { month: 'short', year: 'numeric' })}</span>
                </div>

                <div className="overflow-x-auto border-t border-l border-slate-200 dark:border-slate-700">
                    {reportType === 'summary' && (
                        <table className="min-w-full border-r border-b border-slate-200 dark:border-slate-700">
                            <thead>
                                <tr className="bg-slate-100 dark:bg-slate-800">
                                    <th className="border-r border-b border-slate-200 dark:border-slate-700 p-2 text-left font-black">Estudiante</th>
                                    <th className="border-r border-b border-slate-200 dark:border-slate-700 p-2 text-center font-black">Presentes</th>
                                    <th className="border-r border-b border-slate-200 dark:border-slate-700 p-2 text-center font-black">Ausentes</th>
                                    <th className="border-r border-b border-slate-200 dark:border-slate-700 p-2 text-center font-black">Justificados</th>
                                    <th className="border-b border-slate-200 dark:border-slate-700 p-2 text-right font-black">% Asistencia</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map((s) => (
                                    <tr key={s.studentId}>
                                        <td className="border-r border-b border-slate-200 dark:border-slate-700 p-2 font-medium">{s.studentName}</td>
                                        <td className="border-r border-b border-slate-200 dark:border-slate-700 p-2 text-center">{s.present}</td>
                                        <td className="border-r border-b border-slate-200 dark:border-slate-700 p-2 text-center">{s.absent}</td>
                                        <td className="border-r border-b border-slate-200 dark:border-slate-700 p-2 text-center">{s.justified}</td>
                                        <td className="border-b border-slate-200 dark:border-slate-700 p-2 text-right">{s.percent}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                    {reportType === 'history' && (
                        <table className="min-w-full border-r border-b border-slate-200 dark:border-slate-700">
                            <thead>
                                <tr className="bg-slate-100 dark:bg-slate-800">
                                    <th className="border-r border-b border-slate-200 dark:border-slate-700 p-2 text-left font-black">Fecha</th>
                                    <th className="border-r border-b border-slate-200 dark:border-slate-700 p-2 text-left font-black">Estudiante</th>
                                    <th className="border-b border-slate-200 dark:border-slate-700 p-2 text-left font-black">Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {detailedAttendance.map((a: any, idx: number) => (
                                    <tr key={idx}>
                                        <td className="border-r border-b border-slate-200 dark:border-slate-700 p-2 font-medium">
                                            {a.date}
                                        </td>
                                        <td className="border-r border-b border-slate-200 dark:border-slate-700 p-2 font-medium capitalize">
                                            {students.find((s: any) => s.studentId === a.student_id)?.studentName.toLowerCase() || 'Estudiante'}
                                        </td>
                                        <td className="border-b border-slate-200 dark:border-slate-700 p-2">
                                            {a.status}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {reportType === 'calendar' && (
                        <table className="min-w-full border-r border-b border-slate-200 dark:border-slate-700">
                            <thead>
                                <tr className="bg-slate-100 dark:bg-slate-800">
                                    <th className="border-r border-b border-slate-200 dark:border-slate-700 p-2 text-left font-black">Estudiante</th>
                                    {activeDays.map(day => (
                                        <th key={day} className="border-r border-b border-slate-200 dark:border-slate-700 p-2 text-center font-black">
                                            Día {day}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {students.map((s: any) => (
                                    <tr key={s.studentId}>
                                        <td className="border-r border-b border-slate-200 dark:border-slate-700 p-2 font-medium capitalize">
                                            {s.studentName.toLowerCase()}
                                        </td>
                                        {activeDays.map(day => {
                                            const att = detailedAttendance.find((a: any) => a.student_id === s.studentId && getDay(a.date) === day);
                                            return (
                                                <td key={day} className="border-r border-b border-slate-200 dark:border-slate-700 p-2 text-center">
                                                    {att ? att.status : '-'}
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
        );
    }

    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-800 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Report Header (PDF Version) */}
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

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                        <p className="text-[10px] text-indigo-100 uppercase font-black tracking-widest">Total Alumnos</p>
                        <p className="text-xl font-black">{students.length}</p>
                    </div>
                    <div className="bg-emerald-500/20 backdrop-blur-sm rounded-lg p-3 border border-emerald-400/30">
                        <p className="text-[10px] text-emerald-100 uppercase font-black tracking-widest">Presentes</p>
                        <p className="text-xl font-black">{totalPresent}</p>
                    </div>
                    <div className="bg-rose-500/20 backdrop-blur-sm rounded-lg p-3 border border-rose-400/30">
                        <p className="text-[10px] text-rose-100 uppercase font-black tracking-widest">Ausentes</p>
                        <p className="text-xl font-black">{totalAbsent}</p>
                    </div>
                    <div className="bg-amber-500/20 backdrop-blur-sm rounded-lg p-3 border border-amber-400/30">
                        <p className="text-[10px] text-amber-100 uppercase font-black tracking-widest">Justificados</p>
                        <p className="text-xl font-black">{totalJustified}</p>
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
