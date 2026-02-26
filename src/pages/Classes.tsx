import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, Search, UserPlus, Users, AlertTriangle, School, X, Pencil } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

const Classes: React.FC = () => {
    const { data, addStudentToClass, removeStudentFromClass, addClass, updateClass, deleteClass } = useData();
    const { user } = useAuth();

    const isDirector = user?.role === 'DIRECTOR';
    const [activeTab, setActiveTab] = useState<'students' | 'manage_classes'>(isDirector ? 'manage_classes' : 'students');

    const myClasses = data.classes.filter(c =>
        user?.role === 'DIRECTOR' || c.professorId === user?.id
    );

    const [selectedClassId, setSelectedClassId] = useState<string>(myClasses[0]?.id || '');
    const [newStudentName, setNewStudentName] = useState('');
    const [newStudentLastName, setNewStudentLastName] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Class Form State for Director
    const [newClass, setNewClass] = useState({ name: '', grado: '', seccion: '', professorId: '' });
    const [editingClassId, setEditingClassId] = useState<string | null>(null);

    // Deletion Modal States
    const [classToDelete, setClassToDelete] = useState<string | null>(null);
    const [studentToRemove, setStudentToRemove] = useState<string | null>(null);

    const selectedClass = data.classes.find(c => c.id === selectedClassId);

    const students = selectedClass?.studentIds
        .map(id => data.students[id])
        .filter(s => s && (s.firstName.toLowerCase().includes(searchTerm.toLowerCase()) || s.lastName.toLowerCase().includes(searchTerm.toLowerCase()))) || [];

    const handleAddStudent = (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (selectedClassId && newStudentName && newStudentLastName) {
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
                    avatar: ''
                }, user);
                setNewStudentName('');
                setNewStudentLastName('');
            }
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleAddClass = (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingClassId) {
                updateClass(editingClassId, {
                    name: newClass.name,
                    grado: newClass.grado,
                    seccion: newClass.seccion,
                    professorId: newClass.professorId
                }, user);
                setEditingClassId(null);
                alert('Aula actualizada con éxito');
            } else {
                if (newClass.professorId) {
                    addClass({
                        name: newClass.name,
                        grado: newClass.grado,
                        seccion: newClass.seccion,
                        professorId: newClass.professorId,
                        studentIds: []
                    }, user);
                    alert('Aula creada con éxito');
                }
            }
            setNewClass({ name: '', grado: '', seccion: '', professorId: '' });
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleEditClass = (classToEdit: any) => {
        setEditingClassId(classToEdit.id);
        setNewClass({
            name: classToEdit.name,
            grado: classToEdit.grado,
            seccion: classToEdit.seccion,
            professorId: classToEdit.professorId
        });
    };

    const cancelEditClass = () => {
        setEditingClassId(null);
        setNewClass({ name: '', grado: '', seccion: '', professorId: '' });
    };

    if (myClasses.length === 0 && !isDirector) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <AlertTriangle className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No tienes aulas asignadas</h3>
                <p className="text-slate-500 max-w-md">
                    El director debe asignarte un aula para comenzar a gestionar tus clases.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-2xl font-bold text-slate-900">Gestión de Aulas</h1>
            </div>

            {isDirector && (
                <div className="flex gap-4 border-b border-slate-200">
                    <button
                        onClick={() => setActiveTab('manage_classes')}
                        className={`pb-4 px-2 font-medium transition-colors relative ${activeTab === 'manage_classes' ? 'text-primary-600' : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        Aulas y Asignaciones
                        {activeTab === 'manage_classes' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-t-full" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('students')}
                        className={`pb-4 px-2 font-medium transition-colors relative ${activeTab === 'students' ? 'text-primary-600' : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        Inscripción de Estudiantes
                        {activeTab === 'students' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-t-full" />}
                    </button>
                </div>
            )}

            {activeTab === 'manage_classes' && isDirector && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Create/Edit Class */}
                    <div className="lg:col-span-1">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 sticky top-8">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary-50 text-primary-600 rounded-lg">
                                        <School className="w-5 h-5" />
                                    </div>
                                    <h3 className="font-bold text-slate-900">{editingClassId ? 'Editar Aula' : 'Crear Aula'}</h3>
                                </div>
                                {editingClassId && (
                                    <button onClick={cancelEditClass} className="text-slate-400 hover:text-slate-600">
                                        <X className="w-5 h-5" />
                                    </button>
                                )}
                            </div>

                            <form onSubmit={handleAddClass} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Descriptivo</label>
                                    <input
                                        type="text"
                                        value={newClass.name}
                                        onChange={e => setNewClass({ ...newClass, name: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        placeholder="Ej. Matemáticas Básica"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Grado</label>
                                    <input
                                        type="text"
                                        value={newClass.grado}
                                        onChange={e => setNewClass({ ...newClass, grado: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        placeholder="Ej. 1ro Secundaria"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Sección / Sala</label>
                                    <input
                                        type="text"
                                        value={newClass.seccion}
                                        onChange={e => setNewClass({ ...newClass, seccion: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        placeholder="Ej. A"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Profesor Asignado</label>
                                    <select
                                        value={newClass.professorId}
                                        onChange={e => setNewClass({ ...newClass, professorId: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                                        required
                                    >
                                        <option value="">Seleccionar Profesor</option>
                                        {data.users.filter(u => u.role === 'PROFESSOR').map(u => (
                                            <option key={u.id} value={u.id}>{u.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <button
                                    type="submit"
                                    className="w-full bg-slate-900 text-white py-3 rounded-xl font-medium hover:bg-slate-800 transition-colors"
                                >
                                    {editingClassId ? 'Actualizar Aula' : 'Crear Aula'}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Class List */}
                    <div className="lg:col-span-2 space-y-4">
                        {data.classes.map(c => {
                            const professor = data.users.find(u => u.id === c.professorId);
                            return (
                                <div key={c.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
                                    <div>
                                        <h4 className="font-bold text-slate-900">{c.name}</h4>
                                        <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                                            <span className="font-medium text-slate-600">{c.grado}</span>
                                            <span className="text-slate-300">•</span>
                                            <span>Sección {c.seccion}</span>
                                            <span className="text-slate-300">•</span>
                                            <span>Prof. {professor?.name || 'Sin asignar'}</span>
                                            <span className="text-slate-300">•</span>
                                            <span>{c.studentIds.length} Estudiantes</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleEditClass(c)}
                                            className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                        >
                                            <Pencil className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => setClassToDelete(c.id)}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {activeTab === 'students' && (
                <>
                    <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
                        <span className="font-medium text-slate-700">Seleccionar Aula:</span>
                        <select
                            value={selectedClassId}
                            onChange={(e) => setSelectedClassId(e.target.value)}
                            className="w-full md:w-auto min-w-[250px] px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                        >
                            {myClasses.length > 0 ? (
                                myClasses.map(c => (
                                    <option key={c.id} value={c.id}>{c.grado} {c.seccion} - {c.name}</option>
                                ))
                            ) : (
                                <option value="">No hay aulas disponibles</option>
                            )}
                        </select>
                    </div>
                    {selectedClassId ? (
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
                                                        onClick={() => setStudentToRemove(student.id)}
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
                    ) : (
                        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
                            Selecciona o crea un aula para inscribir alumnos.
                        </div>
                    )}
                </>
            )}
            {/* Edit Class Modal */}
            {editingClassId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden scale-in animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-primary-50">
                            <h2 className="text-xl font-bold text-primary-900 flex items-center gap-2">
                                <Pencil className="w-5 h-5" />
                                Editar Aula
                            </h2>
                            <button onClick={cancelEditClass} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6">
                            <form onSubmit={handleAddClass} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Descriptivo</label>
                                    <input
                                        type="text"
                                        value={newClass.name}
                                        onChange={e => setNewClass({ ...newClass, name: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Grado</label>
                                    <input
                                        type="text"
                                        value={newClass.grado}
                                        onChange={e => setNewClass({ ...newClass, grado: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Sección / Sala</label>
                                    <input
                                        type="text"
                                        value={newClass.seccion}
                                        onChange={e => setNewClass({ ...newClass, seccion: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Profesor Asignado</label>
                                    <select
                                        value={newClass.professorId}
                                        onChange={e => setNewClass({ ...newClass, professorId: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        required
                                    >
                                        <option value="">Seleccionar Profesor</option>
                                        {data.users.filter(u => u.role === 'PROFESSOR').map(u => (
                                            <option key={u.id} value={u.id}>{u.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="pt-4 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={cancelEditClass}
                                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors shadow-sm shadow-primary-600/20"
                                    >
                                        Actualizar
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={!!classToDelete}
                title="Eliminar Aula"
                message="¿Estás seguro de que deseas eliminar esta aula? Se quitará a todos los alumnos asignados. Esta acción no se puede deshacer."
                onConfirm={() => {
                    if (classToDelete) {
                        try {
                            deleteClass(classToDelete, user);
                            setClassToDelete(null);
                        } catch (e: any) { alert(e.message); }
                    }
                }}
                onCancel={() => setClassToDelete(null)}
            />

            <ConfirmModal
                isOpen={!!studentToRemove}
                title="Remover Estudiante"
                message="¿Remover a este estudiante del aula actual? Sus registros de asistencia podrían verse afectados."
                onConfirm={() => {
                    if (studentToRemove && selectedClassId) {
                        try {
                            removeStudentFromClass(selectedClassId, studentToRemove, user);
                            setStudentToRemove(null);
                        } catch (e: any) { alert(e.message); }
                    }
                }}
                onCancel={() => setStudentToRemove(null)}
            />
        </div>
    );
};

export default Classes;
