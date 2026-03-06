import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Trash2, Shield, User, Pencil, X } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

const Admin: React.FC = () => {
    const { data, resetData, updateUser, addUser, deleteUser } = useData();
    const { user } = useAuth();

    // info para crear o editar profes
    const [newUser, setNewUser] = useState({ name: '', username: '', password: '', role: 'PROFESSOR' as 'PROFESSOR' | 'DIRECTOR' });
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [userToDelete, setUserToDelete] = useState<string | null>(null);

    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (user?.role !== 'DIRECTOR') {
        return <div className="p-8 text-center text-red-600">Acceso Denegado</div>;
    }

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsSubmitting(true);

        try {
            if (editingUserId) {
                await updateUser(editingUserId, newUser);
                setEditingUserId(null);
                setSuccess('Usuario actualizado con éxito');
            } else {
                await addUser({
                    name: newUser.name,
                    username: newUser.username,
                    password: newUser.password,
                    role: newUser.role
                });
                setSuccess('Usuario creado con éxito');
            }

            setNewUser({ name: '', username: '', password: '', role: 'PROFESSOR' });
        } catch (err: any) {
            setError(err.message || 'Error al guardar el usuario');
        } finally {
            setIsSubmitting(false);
        }
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

    const handleDeleteUser = (userId: string) => {
        const userObj = data.users.find(u => u.id === userId);
        if (!userObj) return;

        if (userId === user?.id) {
            alert('No puedes eliminar tu propio usuario');
            return;
        }

        if (userObj.username === 'director') {
            setError('No puedes eliminar al director principal del sistema.');
            return;
        }

        setUserToDelete(userId);
    };

    const confirmDelete = async () => {
        if (userToDelete) {
            setError('');
            setSuccess('');
            try {
                await deleteUser(userToDelete);
                setUserToDelete(null);
                setSuccess('Usuario eliminado con éxito');
            } catch (err: any) {
                setError(err.message || 'Error al eliminar usuario');
            }
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-slate-900">Gestión de Profesores</h1>
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

            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200">
                    {error}
                </div>
            )}
            {success && (
                <div className="bg-green-50 text-green-700 p-4 rounded-xl border border-green-200">
                    {success}
                </div>
            )}


            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">

                <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 sticky top-8">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary-50 text-primary-600 rounded-lg">
                                    <UserPlus className="w-5 h-5" />
                                </div>
                                <h3 className="font-bold text-slate-900">Crear Profesor</h3>
                            </div>
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
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`w-full text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors ${isSubmitting ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800'}`}
                            >
                                <UserPlus className="w-5 h-5" />
                                {isSubmitting ? 'Guardando...' : 'Crear Profesor'}
                            </button>
                        </form>
                    </div>
                </div>


                <div className="lg:col-span-2 space-y-4">
                    {data.users.filter(u => u.role === 'PROFESSOR').map((u, idx) => (
                        <div key={u.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both" style={{ animationDelay: `${idx * 50}ms` }}>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-lg shrink-0">
                                    {u.name[0]}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-bold text-slate-900 truncate">{u.name}</p>
                                    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 mt-1">
                                        <User className="w-3 h-3" />
                                        <span className="truncate max-w-[120px] sm:max-w-none">{u.username}</span>
                                        <span className="text-slate-300 hidden sm:inline">•</span>
                                        <Shield className="w-3 h-3" />
                                        <span className="capitalize">{u.role.toLowerCase()}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2 self-end sm:self-auto">
                                <button
                                    onClick={() => handleEditUser(u)}
                                    className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                >
                                    <Pencil className="w-5 h-5" />
                                </button>
                                {u.id !== user?.id && u.username !== 'director' && (
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

                {editingUserId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden scale-in animate-in zoom-in-95 duration-200">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-primary-50">
                                <h2 className="text-xl font-bold text-primary-900 flex items-center gap-2">
                                    <Pencil className="w-5 h-5" />
                                    Editar Profesor
                                </h2>
                                <button onClick={cancelEditUser} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="p-6">
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
                                    <div className="pt-4 flex justify-end gap-3">
                                        <button
                                            type="button"
                                            onClick={cancelEditUser}
                                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className={`px-4 py-2 text-white rounded-xl font-medium shadow-sm transition-colors ${isSubmitting ? 'bg-slate-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700 shadow-primary-600/20'}`}
                                        >
                                            {isSubmitting ? 'Actualizando...' : 'Actualizar'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                <ConfirmModal
                    isOpen={!!userToDelete}
                    title="Eliminar Profesor"
                    message="¿Estás seguro de que quieres eliminar a este profesor? Esta acción no se puede deshacer."
                    onConfirm={confirmDelete}
                    onCancel={() => setUserToDelete(null)}
                />
            </div>
        </div>
    );
};

export default Admin;
