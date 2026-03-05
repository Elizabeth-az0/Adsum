import React, { useState, useEffect, useCallback } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import ReportPreview from './ReportPreview';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => jsPDF;
    }
}

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

const ExportReportsPanel: React.FC = () => {
    const { data } = useData();
    const { user } = useAuth();

    const [selectedClassId, setSelectedClassId] = useState('');
    const [month, setMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [reportType, setReportType] = useState('summary');
    const [exportFormat, setExportFormat] = useState('pdf');
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

    // Filter classes based on role
    const availableClasses = data.classes.filter(c =>
        user?.role === 'DIRECTOR' || c.professorId === user?.id
    );

    const fetchReportData = useCallback(async () => {
        if (!selectedClassId) {
            setReportData(null);
            setFetchError(null);
            return;
        }

        setIsLoading(true);
        setFetchError(null);
        try {
            const res = await api.getAttendanceReport(selectedClassId, month, year, reportType);
            if (res.students && res.students.length === 0) {
                setFetchError('No se encontraron estudiantes en esta aula.');
                setReportData(null);
            } else {
                setReportData(res);
            }
        } catch (error: any) {
            console.error('Error fetching report data:', error);
            setFetchError(error.message || 'Error al conectar con el servidor');
            setReportData(null);
        } finally {
            setIsLoading(false);
        }
    }, [selectedClassId, month, year, reportType]);

    useEffect(() => {
        fetchReportData();
    }, [fetchReportData]);

    const handleExport = () => {
        if (!reportData) return;

        if (exportFormat === 'pdf') {
            exportToPDF();
        } else {
            exportToExcel();
        }
    };

    const exportToPDF = () => {
        if (!reportData) return;
        const doc = new jsPDF();
        const { classInfo, period, students, detailedAttendance } = reportData;
        const monthName = new Date(`${period.year}-${period.month}-01T12:00:00`).toLocaleString('es-ES', { month: 'long' });

        // Header
        doc.setFontSize(22);
        doc.setTextColor(63, 70, 229); // Indigo-600
        doc.text("Asistencia Escolar - Adsum", 14, 20);

        doc.setFontSize(16);
        doc.setTextColor(31, 41, 55); // Gray-800
        doc.text(reportType === 'summary' ? `Resumen Mensual de Asistencia` :
            reportType === 'history' ? `Historial Detallado de Asistencia` :
                `Calendario de Asistencia`, 14, 30);

        doc.setFontSize(11);
        doc.setTextColor(75, 85, 99); // Gray-600
        doc.text(`Aula: ${classInfo.name} (${classInfo.grade.replace('|', ' ')})`, 14, 40);
        doc.text(`Periodo: ${monthName} ${period.year}`, 14, 46);
        doc.text(`Fecha de exportación: ${new Date().toLocaleDateString('es-ES')}`, 14, 52);

        if (reportType === 'summary') {
            const tableData = students.map((s: any) => [
                s.studentName,
                s.present,
                s.absent,
                s.justified,
                `${s.percent}%`
            ]);

            doc.autoTable({
                startY: 60,
                head: [['Estudiante', 'Presentes', 'Ausentes', 'Justificados', '% Asistencia']],
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [249, 250, 251] },
                styles: { fontSize: 10, cellPadding: 3 },
            });
        } else if (reportType === 'history') {
            const tableData = detailedAttendance.map((a: any) => [
                new Date(a.date + 'T12:00:00').toLocaleDateString('es-ES'),
                students.find((s: any) => s.studentId === a.student_id)?.studentName || 'Estudiante',
                a.status === 'PRESENT' ? 'Presente' : a.status === 'ABSENT' ? 'Ausente' : 'Justificado'
            ]);

            doc.autoTable({
                startY: 60,
                head: [['Fecha', 'Estudiante', 'Estado']],
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: [79, 70, 229], textColor: 255 },
                styles: { fontSize: 10 },
            });
        } else if (reportType === 'calendar') {
            const activeDays = Array.from(new Set(detailedAttendance.map((a: { date: string }) => new Date(a.date).getUTCDate()))).sort((a: number, b: number) => a - b);

            const head = [['Estudiante', ...activeDays.map(d => d.toString())]];
            const body = students.map(s => {
                const row: (string | number)[] = [s.studentName.split(' ')[0]];
                activeDays.forEach(day => {
                    const att = detailedAttendance.find(a => a.student_id === s.studentId && new Date(a.date).getUTCDate() === day);
                    row.push(att ? (att.status === 'PRESENT' ? 'P' : att.status === 'ABSENT' ? 'A' : 'J') : '-');
                });
                return row;
            });

            doc.autoTable({
                startY: 60,
                head: head,
                body: body,
                theme: 'grid',
                headStyles: { fillColor: [79, 70, 229], textColor: 255, fontSize: 8 },
                styles: { fontSize: 7, cellPadding: 1, halign: 'center' },
                columnStyles: { 0: { halign: 'left', minCellWidth: 30 } }
            });
        }

        doc.save(`Reporte_${classInfo.name.replace(/\s+/g, '_')}_${month}_${year}.pdf`);
    };

    const exportToExcel = () => {
        if (!reportData) return;
        const { classInfo, students, detailedAttendance } = reportData;
        let dataToExport: any[] = [];

        if (reportType === 'summary') {
            dataToExport = students.map((s: any) => ({
                'Estudiante': s.studentName,
                'Presentes': s.present,
                'Ausentes': s.absent,
                'Justificados': s.justified,
                '% Asistencia': s.percent
            }));
        } else if (reportType === 'history') {
            dataToExport = detailedAttendance.map((a: any) => ({
                'Fecha': a.date,
                'Estudiante': students.find((s: any) => s.studentId === a.student_id)?.studentName || 'Estudiante',
                'Estado': a.status
            }));
        } else {
            const activeDays = Array.from(new Set(detailedAttendance.map(a => new Date(a.date).getUTCDate()))).sort((a, b) => a - b);
            dataToExport = students.map(s => {
                const row: Record<string, string | number> = { 'Estudiante': s.studentName };
                activeDays.forEach(day => {
                    const att = detailedAttendance.find(a => a.student_id === s.studentId && new Date(a.date).getUTCDate() === day);
                    row[`Día ${day}`] = att ? att.status : '-';
                });
                return row;
            });
        }

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Asistencia");
        XLSX.writeFile(wb, `Reporte_${classInfo.name.replace(/\s+/g, '_')}_${month}_${year}.xlsx`);
    };

    return (
        <div className="space-y-8 pb-12">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl shadow-indigo-500/5 overflow-hidden border border-gray-100 dark:border-gray-800 transition-all duration-300">
                <div className="p-8">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-500/30">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Exportación de Reportes</h2>
                            <p className="text-gray-500 dark:text-gray-400 font-medium">Configura y descarga informes detallados de asistencia</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        {/* Aula */}
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 ml-1">Aula</label>
                            <select
                                value={selectedClassId}
                                onChange={(e) => setSelectedClassId(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl px-4 py-3 font-bold text-gray-800 dark:text-white focus:border-indigo-500 focus:ring-0 transition-all cursor-pointer outline-none"
                            >
                                <option value="">Seleccionar aula</option>
                                {availableClasses.map(c => (
                                    <option key={c.id} value={c.id}>{c.name} - {c.grado} {c.seccion}</option>
                                ))}
                            </select>
                        </div>

                        {/* Mes */}
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 ml-1">Mes</label>
                            <select
                                value={month}
                                onChange={(e) => setMonth(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl px-4 py-3 font-bold text-gray-800 dark:text-white focus:border-indigo-500 focus:ring-0 transition-all cursor-pointer outline-none"
                            >
                                {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(m => (
                                    <option key={m} value={m}>
                                        {new Date(`2024-${m}-01T12:00:00`).toLocaleString('es-ES', { month: 'long' })}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Año */}
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 ml-1">Año</label>
                            <select
                                value={year}
                                onChange={(e) => setYear(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl px-4 py-3 font-bold text-gray-800 dark:text-white focus:border-indigo-500 focus:ring-0 transition-all cursor-pointer outline-none"
                            >
                                <option value="2024">2024</option>
                                <option value="2025">2025</option>
                                <option value="2026">2026</option>
                            </select>
                        </div>

                        {/* Tipo de Reporte */}
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 ml-1">Tipo de Reporte</label>
                            <select
                                value={reportType}
                                onChange={(e) => setReportType(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl px-4 py-3 font-bold text-gray-800 dark:text-white focus:border-indigo-500 focus:ring-0 transition-all cursor-pointer outline-none"
                            >
                                <option value="summary">Resumen mensual</option>
                                <option value="history">Historial detallado</option>
                                <option value="calendar">Calendario de asistencia</option>
                            </select>
                        </div>
                    </div>

                    {fetchError && (
                        <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 border-2 border-rose-100 dark:border-rose-900/40 rounded-xl flex items-center gap-3 text-rose-600 dark:text-rose-400 animate-in shake duration-300">
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="font-bold">{fetchError}</span>
                        </div>
                    )}

                    <div className="flex flex-col md:flex-row items-center gap-6 p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border-2 border-indigo-100 dark:border-indigo-900/40">
                        <div className="flex-1 space-y-2 text-center md:text-left">
                            <p className="text-sm font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-tight">Formato de Exportación</p>
                            <div className="flex items-center justify-center md:justify-start gap-4">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                        type="radio"
                                        name="format"
                                        value="pdf"
                                        checked={exportFormat === 'pdf'}
                                        onChange={() => setExportFormat('pdf')}
                                        className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                                    />
                                    <span className="font-bold text-indigo-800 dark:text-indigo-200 group-hover:text-indigo-600 transition-colors">PDF (.pdf)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                        type="radio"
                                        name="format"
                                        value="excel"
                                        checked={exportFormat === 'excel'}
                                        onChange={() => setExportFormat('excel')}
                                        className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                                    />
                                    <span className="font-bold text-indigo-800 dark:text-indigo-200 group-hover:text-indigo-600 transition-colors">Excel (.xlsx)</span>
                                </label>
                            </div>
                        </div>

                        <button
                            onClick={handleExport}
                            disabled={!reportData || isLoading}
                            className={`w-full md:w-auto px-8 py-4 rounded-xl font-black text-lg transition-all flex items-center justify-center gap-2 shadow-xl ${!reportData || isLoading
                                ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed grayscale'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105 active:scale-95 shadow-indigo-500/20'
                                }`}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Exportar ahora
                        </button>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-wider">Vista Previa</h3>
                    {isLoading && <span className="text-indigo-600 dark:text-indigo-400 font-bold animate-pulse">Sincronizando...</span>}
                </div>
                <ReportPreview data={reportData} reportType={reportType} isLoading={isLoading} />
            </div>
        </div>
    );
};

export default ExportReportsPanel;
