import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Trash2, Shield, School, User, Pencil, X } from 'lucide-react';

const Admin: React.FC = () => {
    const { data, addClass, saveData, resetData, updateUser, updateClass } = useData();
    const { user } = useAuth();

    const [activeTab, setActiveTab] = useState<'users' | 'classes'>('users');

    // User Form State
    const [newUser, setNewUser] = useState({ name: '', username: '', password: '', role: 'PROFESSOR' as 'PROFESSOR' | 'DIRECTOR' });
    const [editingUserId, setEditingUserId] = useState<string | null>(null);

    // Class Form State
    const [newClass, setNewClass] = useState({ name: '', room: '', professorId: '' });
    const [editingClassId, setEditingClassId] = useState<string | null>(null);

    if (user?.role !== 'DIRECTOR') {
        return <div className="p-8 text-center text-red-600">Acceso Denegado</div>;
    }

    const handleAddUser = (e: React.FormEvent) => {
        e.preventDefault();

        if (editingUserId) {
            updateUser(editingUserId, newUser);
            setEditingUserId(null);
            alert('Usuario actualizado con éxito');
        } else {
            const id = Math.random().toString(36).substr(2, 9);
            const userToAdd = {
                ...newUser,
                id,
                avatar: `https://ui-avatars.com/api/?name=${newUser.name}&background=random`
            };

            saveData({
                ...data,
                users: [...data.users, userToAdd]
            });
            alert('Usuario creado con éxito');
        }

        setNewUser({ name: '', username: '', password: '', role: 'PROFESSOR' });
    };

    const handleEditUser = (userToEdit: any) => {
        setEditingUserId(userToEdit.id);
        setNewUser({
            name: userToEdit.name,
            username: userToEdit.username,
            password: userToEdit.password,
            role: userToEdit.role
        });
    };

    const cancelEditUser = () => {
        setEditingUserId(null);
        setNewUser({ name: '', username: '', password: '', role: 'PROFESSOR' });
    };

    const handleAddClass = (e: React.FormEvent) => {
        e.preventDefault();

        if (editingClassId) {
            updateClass(editingClassId, {
                name: newClass.name,
                room: newClass.room,
                professorId: newClass.professorId
            });
            setEditingClassId(null);
            alert('Clase actualizada con éxito');
        } else {
            if (newClass.professorId) {
                addClass({
                    name: newClass.name,
                    room: newClass.room,
                    professorId: newClass.professorId,
                    studentIds: []
                });
                alert('Clase creada con éxito');
            }
        }
        setNewClass({ name: '', room: '', professorId: '' });
    };

    const handleEditClass = (classToEdit: any) => {
        setEditingClassId(classToEdit.id);
        setNewClass({
            name: classToEdit.name,
            room: classToEdit.room,
            professorId: classToEdit.professorId
        });
    };

    const cancelEditClass = () => {
        setEditingClassId(null);
        setNewClass({ name: '', room: '', professorId: '' });
    };

    const handleDeleteUser = (userId: string) => {
        if (userId === user.id) {
            alert('No puedes eliminar tu propio usuario');
            return;
        }
        if (window.confirm('¿Eliminar usuario?')) {
            saveData({
                ...data,
                users: data.users.filter(u => u.id !== userId)
            });
        }
    };

    const handleDeleteClass = (classId: string) => {
        if (window.confirm('¿Eliminar clase?')) {
            saveData({
                ...data,
                classes: data.classes.filter(c => c.id !== classId)
            });
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-900">Panel de Administración</h1>
                <button
                    onClick={() => {
                        if (window.confirm('¿Estás seguro de que quieres restablecer todos los datos? Se perderán los cambios.')) {
                            resetData();
                        }
                    }}
                    className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                >
                    Restablecer Datos
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('users')}
                    className={`pb-4 px-2 font-medium transition-colors relative ${activeTab === 'users' ? 'text-primary-600' : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    Usuarios
                    {activeTab === 'users' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-t-full" />}
                </button>
                <button
                    onClick={() => setActiveTab('classes')}
                    className={`pb-4 px-2 font-medium transition-colors relative ${activeTab === 'classes' ? 'text-primary-600' : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    Aulas y Asignaciones
                    {activeTab === 'classes' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-t-full" />}
                </button>
            </div>

            {activeTab === 'users' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Create/Edit User */}
                    <div className="lg:col-span-1">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 sticky top-8">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary-50 text-primary-600 rounded-lg">
                                        <UserPlus className="w-5 h-5" />
                                    </div>
                                    <h3 className="font-bold text-slate-900">{editingUserId ? 'Editar Usuario' : 'Crear Usuario'}</h3>
                                </div>
                                {editingUserId && (
                                    <button onClick={cancelEditUser} className="text-slate-400 hover:text-slate-600">
                                        <X className="w-5 h-5" />
                                    </button>
                                )}
                            </div>

                            <form onSubmit={handleAddUser} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
                                    <input
                                        type="text"
                                        value={newUser.name}
                                        onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Usuario</label>
                                    <input
                                        type="text"
                                        value={newUser.username}
                                        onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
                                    <input
                                        type="password"
                                        value={newUser.password}
                                        onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
                                    <select
                                        value={newUser.role}
                                        onChange={e => setNewUser({ ...newUser, role: e.target.value as 'PROFESSOR' | 'DIRECTOR' })}
                                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                                    >
                                        <option value="PROFESSOR">Profesor</option>
                                        <option value="DIRECTOR">Director</option>
                                    </select>
                                </div>
                                <button
                                    type="submit"
                                    className="w-full bg-slate-900 text-white py-3 rounded-xl font-medium hover:bg-slate-800 transition-colors"
                                >
                                    {editingUserId ? 'Actualizar Usuario' : 'Crear Usuario'}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* User List */}
                    <div className="lg:col-span-2 space-y-4">
                        {data.users.map(u => (
                            <div key={u.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-lg">
                                        {u.name[0]}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900">{u.name}</p>
                                        <div className="flex items-center gap-2 text-sm text-slate-500">
                                            <User className="w-3 h-3" />
                                            <span>{u.username}</span>
                                            <span className="text-slate-300">•</span>
                                            <Shield className="w-3 h-3" />
                                            <span className="capitalize">{u.role.toLowerCase()}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleEditUser(u)}
                                        className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                    >
                                        <Pencil className="w-5 h-5" />
                                    </button>
                                    {u.id !== user.id && (
                                        <button
                                            onClick={() => handleDeleteUser(u.id)}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
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
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de la Clase</label>
                                    <input
                                        type="text"
                                        value={newClass.name}
                                        onChange={e => setNewClass({ ...newClass, name: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        placeholder="Ej. Matemáticas 1A"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Salón / Aula</label>
                                    <input
                                        type="text"
                                        value={newClass.room}
                                        onChange={e => setNewClass({ ...newClass, room: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        placeholder="Ej. Aula 101"
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
                                            <span>{c.room}</span>
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
                                            onClick={() => handleDeleteClass(c.id)}
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
        </div>
    );
};

export default Admin;
