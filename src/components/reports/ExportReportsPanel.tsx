import React, { useState, useEffect, useCallback } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

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

    const handleExport = (e: React.MouseEvent) => {
        e.preventDefault();
        if (!reportData) return;

        setIsLoading(true);
        console.log('Iniciando exportación en formato:', exportFormat);

        try {
            if (exportFormat === 'pdf') {
                exportToPDF();
            } else {
                exportToExcel();
            }
        } catch (err: any) {
            console.error('Error crítico al exportar:', err);
            setFetchError(`Error al exportar: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const exportToPDF = () => {
        if (!reportData) return;
        const doc = new jsPDF();
        const { classInfo, period, students, detailedAttendance } = reportData;
        const monthName = new Date(`${period.year}-${period.month}-01T12:00:00`).toLocaleString('es-ES', { month: 'long' });

        const totalPresent = students.reduce((acc, s) => acc + s.present, 0);
        const totalAbsent = students.reduce((acc, s) => acc + s.absent, 0);
        const totalJustified = students.reduce((acc, s) => acc + s.justified, 0);

        doc.setFillColor(11, 83, 141);
        doc.rect(14, 15, 182, 25, 'F');

        doc.setFontSize(18);
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.text("REPORTE FORMAL DE ASISTENCIA", 20, 25);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const TitleType = reportType === 'summary' ? `Resumen Mensual` :
            reportType === 'history' ? `Historial Detallado` : `Calendario de Asistencia`;
        doc.text(`${TitleType} - ${classInfo.name} (${classInfo.grade.replace('|', ' ')})`, 20, 32);

        doc.setFontSize(8);
        doc.text("PERIODO", 190, 23, { align: "right" });
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        const periodStrStr = `${monthName.toUpperCase()} ${period.year}`;
        doc.text(periodStrStr, 190, 31, { align: "right" });

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("RESUMEN GENERAL", 14, 52);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Total Estudiantes: ${students.length}`, 14, 58);
        doc.text(`Presentes Totales: ${totalPresent}`, 60, 58);
        doc.text(`Ausentes Totales: ${totalAbsent}`, 110, 58);
        doc.text(`Justificados Totales: ${totalJustified}`, 155, 58);

        doc.setDrawColor(200, 200, 200);
        doc.line(14, 62, 196, 62);

        if (reportType === 'summary') {
            const tableData = students.map((s) => [
                s.studentName,
                s.present,
                s.absent,
                s.justified,
                `${s.percent}%`
            ]);

            autoTable(doc, {
                startY: 68,
                head: [['ESTUDIANTE', 'PRESENTES', 'AUSENTES', 'JUSTIFICADOS', '% ASISTENCIA']],
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: [11, 83, 141], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
                bodyStyles: { textColor: [0, 0, 0], fontSize: 9 }
            });
        } else if (reportType === 'history') {
            const tableData = detailedAttendance.map((a) => [
                new Date(a.date + 'T12:00:00').toLocaleDateString('es-ES'),
                students.find((s) => s.studentId === a.student_id)?.studentName || 'Estudiante',
                a.status === 'PRESENT' ? 'Presente' : a.status === 'ABSENT' ? 'Ausente' : 'Justificado'
            ]);

            autoTable(doc, {
                startY: 68,
                head: [['FECHA', 'ESTUDIANTE', 'ESTADO']],
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: [11, 83, 141], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
                bodyStyles: { textColor: [0, 0, 0], fontSize: 9 }
            });
        } else if (reportType === 'calendar') {
            const activeDays = Array.from(new Set(detailedAttendance.map((a) => new Date(a.date + 'T12:00:00').getUTCDate()))).sort((a, b) => a - b);

            const head = [['ESTUDIANTE', ...activeDays.map(d => `${d}`)]];
            const body = students.map((s) => {
                const row = [s.studentName.split(' ')[0]];
                activeDays.forEach(day => {
                    const att = detailedAttendance.find(a => a.student_id === s.studentId && new Date(a.date + 'T12:00:00').getUTCDate() === day);
                    row.push(att ? (att.status === 'PRESENT' ? 'P' : att.status === 'ABSENT' ? 'A' : 'J') : '-');
                });
                return row;
            });

            autoTable(doc, {
                startY: 68,
                head: head,
                body: body,
                theme: 'grid',
                headStyles: { fillColor: [11, 83, 141], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9, halign: 'center' },
                bodyStyles: { textColor: [0, 0, 0], fontSize: 8, halign: 'center' },
                columnStyles: { 0: { halign: 'left', minCellWidth: 30 } }
            });
        }

        doc.save(`Reporte_Asistencia_${classInfo.name.replace(/\s+/g, '_')}_${period.month}_${period.year}.pdf`);
    };

    const exportToExcel = () => {
        if (!reportData) return;
        const { classInfo, period, students, detailedAttendance } = reportData;
        let dataToExport: any[] = [];

        if (reportType === 'summary') {
            dataToExport = students.map((s) => ({
                'Estudiante': s.studentName,
                'Presentes': s.present,
                'Ausentes': s.absent,
                'Justificados': s.justified,
                '% Asistencia': s.percent
            }));
        } else if (reportType === 'history') {
            dataToExport = detailedAttendance.map((a) => ({
                'Fecha': a.date,
                'Estudiante': students.find((s) => s.studentId === a.student_id)?.studentName || 'Estudiante',
                'Estado': a.status === 'PRESENT' ? 'Presente' : a.status === 'ABSENT' ? 'Ausente' : 'Justificado'
            }));
        } else {
            const activeDays = Array.from(new Set(detailedAttendance.map(a => new Date(a.date).getUTCDate()))).sort((a, b) => a - b);
            dataToExport = students.map(s => {
                const row: Record<string, string | number> = { 'Estudiante': s.studentName };
                activeDays.forEach(day => {
                    const att = detailedAttendance.find(a => a.student_id === s.studentId && new Date(a.date).getUTCDate() === day);
                    row[`Día ${day}`] = att ? (att.status === 'PRESENT' ? 'P' : att.status === 'ABSENT' ? 'A' : 'J') : '-';
                });
                return row;
            });
        }

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Asistencia");
        XLSX.writeFile(wb, `Reporte_Asistencia_${classInfo.name.replace(/\s+/g, '_')}_${period.month}_${period.year}.xlsx`);
    };

    return (
        <div className="space-y-8 pb-12">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-primary-50 text-primary-600 rounded-lg">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Exportación de Reportes</h2>
                        <p className="text-sm text-slate-500">Configura y descarga informes detallados de asistencia</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {/* Aula */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Aula</label>
                        <select
                            value={selectedClassId}
                            onChange={(e) => setSelectedClassId(e.target.value)}
                            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-slate-900"
                        >
                            <option value="">Seleccionar aula</option>
                            {availableClasses.map(c => (
                                <option key={c.id} value={c.id}>{c.name} - {c.grado} {c.seccion}</option>
                            ))}
                        </select>
                    </div>

                    {/* Mes */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Mes</label>
                        <select
                            value={month}
                            onChange={(e) => setMonth(e.target.value)}
                            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-slate-900"
                        >
                            {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(m => (
                                <option key={m} value={m}>
                                    {new Date(`2024-${m}-01T12:00:00`).toLocaleString('es-ES', { month: 'long' })}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Año */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Año</label>
                        <select
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-slate-900"
                        >
                            <option value="2024">2024</option>
                            <option value="2025">2025</option>
                            <option value="2026">2026</option>
                        </select>
                    </div>

                    {/* Tipo de Reporte */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Reporte</label>
                        <select
                            value={reportType}
                            onChange={(e) => setReportType(e.target.value)}
                            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-slate-900"
                        >
                            <option value="summary">Resumen mensual</option>
                            <option value="history">Historial detallado</option>
                            <option value="calendar">Calendario de asistencia</option>
                        </select>
                    </div>
                </div>

                {fetchError && (
                    <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 flex items-center gap-3">
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-medium">{fetchError}</span>
                    </div>
                )}

                <div className="flex flex-col md:flex-row items-center gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-100 justify-between">
                    <div className="space-y-2 text-center md:text-left">
                        <p className="block text-sm font-medium text-slate-700">Formato de Exportación</p>
                        <div className="flex items-center justify-center md:justify-start gap-4 mt-1">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="format"
                                    value="pdf"
                                    checked={exportFormat === 'pdf'}
                                    onChange={() => setExportFormat('pdf')}
                                    className="w-4 h-4 text-primary-600 border-slate-300 focus:ring-primary-500 cursor-pointer"
                                />
                                <span className="font-medium text-slate-700 cursor-pointer">PDF (.pdf)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="format"
                                    value="excel"
                                    checked={exportFormat === 'excel'}
                                    onChange={() => setExportFormat('excel')}
                                    className="w-4 h-4 text-primary-600 border-slate-300 focus:ring-primary-500 cursor-pointer"
                                />
                                <span className="font-medium text-slate-700 cursor-pointer">Excel (.xlsx)</span>
                            </label>
                        </div>
                    </div>

                    <button
                        onClick={handleExport}
                        disabled={!reportData || isLoading}
                        className={`w-full md:w-auto px-6 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors ${!reportData || isLoading
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm shadow-primary-600/20'
                            }`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        {isLoading ? 'Generando...' : 'Exportar ahora'}
                    </button>
                </div>
            </div>

            {isLoading && (
                <div className="flex items-center justify-center p-4">
                    <span className="text-primary-600 font-medium animate-pulse">Generando reporte...</span>
                </div>
            )}
        </div>
    );
};

export default ExportReportsPanel;
