import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, Search, UserPlus, Users, AlertTriangle } from 'lucide-react';

const Classes: React.FC = () => {
    const { data, addStudentToClass, removeStudentFromClass } = useData();
    const { user } = useAuth();

    const myClasses = data.classes.filter(c =>
        user?.role === 'DIRECTOR' || c.professorId === user?.id
    );

    const [selectedClassId, setSelectedClassId] = useState<string>(myClasses[0]?.id || '');
    const [newStudentName, setNewStudentName] = useState('');
    const [newStudentLastName, setNewStudentLastName] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const selectedClass = data.classes.find(c => c.id === selectedClassId);

    const students = selectedClass?.studentIds
        .map(id => data.students[id])
        .filter(s => s && (s.firstName.toLowerCase().includes(searchTerm.toLowerCase()) || s.lastName.toLowerCase().includes(searchTerm.toLowerCase()))) || [];

    const handleAddStudent = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedClassId && newStudentName && newStudentLastName) {
            // Check for duplicates
            const isDuplicate = selectedClass?.studentIds.some(id => {
                const s = data.students[id];
                return s && s.firstName.toLowerCase() === newStudentName.toLowerCase() &&
                    s.lastName.toLowerCase() === newStudentLastName.toLowerCase();
            });

            if (isDuplicate) {
                alert('Ya existe un estudiante con este nombre en la clase.');
                return;
            }

            addStudentToClass(selectedClassId, {
                firstName: newStudentName,
                lastName: newStudentLastName,
                avatar: '' // Will be generated
            });
            setNewStudentName('');
            setNewStudentLastName('');
        }
    };

    if (myClasses.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <AlertTriangle className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No tienes aulas asignadas</h3>
                <p className="text-slate-500 max-w-md">
                    Crea aulas en el panel de administración para comenzar a gestionar tus clases.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-2xl font-bold text-slate-900">Gestión de Aulas</h1>

                <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="w-full md:w-auto px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                >
                    {myClasses.map(c => (
                        <option key={c.id} value={c.id}>{c.name} - {c.room}</option>
                    ))}
                </select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Add Student Form */}
                <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 sticky top-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-primary-50 text-primary-600 rounded-lg">
                                <UserPlus className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-slate-900">Inscribir Estudiante</h3>
                        </div>

                        <form onSubmit={handleAddStudent} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                                <input
                                    type="text"
                                    value={newStudentName}
                                    onChange={(e) => setNewStudentName(e.target.value)}
                                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    placeholder="Ej. Juan"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Apellido</label>
                                <input
                                    type="text"
                                    value={newStudentLastName}
                                    onChange={(e) => setNewStudentLastName(e.target.value)}
                                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    placeholder="Ej. Pérez"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-slate-900 text-white py-3 rounded-xl font-medium hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                            >
                                <Plus className="w-5 h-5" />
                                Agregar Estudiante
                            </button>
                        </form>
                    </div>
                </div>

                {/* Student List */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                                    <Users className="w-5 h-5" />
                                </div>
                                <h3 className="font-bold text-slate-900">Estudiantes Inscritos ({students.length})</h3>
                            </div>

                            <div className="relative w-full sm:w-auto">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full sm:w-64 pl-9 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                                />
                            </div>
                        </div>

                        <div className="divide-y divide-slate-100">
                            {students.length > 0 ? (
                                students.map(student => (
                                    <div key={student.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500">
                                                {student.firstName[0]}{student.lastName[0]}
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900">{student.firstName} {student.lastName}</p>
                                                <p className="text-xs text-slate-500">ID: {student.id}</p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => {
                                                if (window.confirm(`¿Eliminar a ${student.firstName} de esta clase?`)) {
                                                    removeStudentFromClass(selectedClassId, student.id);
                                                }
                                            }}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                            title="Eliminar"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="p-12 text-center text-slate-500">
                                    No hay estudiantes en esta clase.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Classes;
