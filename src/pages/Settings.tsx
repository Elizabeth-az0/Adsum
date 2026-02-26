import React, { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { BookOpen, Type, User as UserIcon, Check } from 'lucide-react';
import { Link } from 'react-router-dom';

const Settings: React.FC = () => {
    const { fontSize, setFontSize } = useSettings();
    const { user, updateCurrentUser } = useAuth();
    const { updateUser } = useData();

    const [name, setName] = useState(user?.name || '');
    const [successMessage, setSuccessMessage] = useState('');

    const handleUpdateProfile = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim() && user) {
            const updatedName = name.trim();
            updateUser(user.id, { name: updatedName });
            updateCurrentUser({ name: updatedName });
            setSuccessMessage('Nombre actualizado correctamente');
            setTimeout(() => setSuccessMessage(''), 3000);
        }
    };
    const { fontSize, setFontSize } = useSettings();

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-slate-900">Ajustes</h1>

            {/* Profile Section (Only for Director) */}
            {user?.role === 'DIRECTOR' && (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 mb-8 animate-in fade-in duration-200">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                            <UserIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Perfil</h2>
                            <p className="text-slate-500">Actualiza tus datos personales.</p>
                        </div>
                    </div>

                    <form onSubmit={handleUpdateProfile} className="max-w-md space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                                placeholder="Tu nombre"
                                required
                            />
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                type="submit"
                                className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
                            >
                                Guardar Cambios
                            </button>
                            {successMessage && (
                                <span className="text-green-600 text-sm font-medium flex items-center gap-1 animate-in slide-in-from-left duration-200">
                                    <Check className="w-4 h-4" />
                                    {successMessage}
                                </span>
                            )}
                        </div>
                    </form>
                </div>
            )}

            {/* Font Size Section */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 transition-all duration-200 ease-in-out">
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-primary-50 text-primary-600 rounded-xl">
                        <Type className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Tamaño del Texto</h2>
                        <p className="text-slate-500">Ajusta el tamaño del texto para que sea más fácil de leer.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                        onClick={() => setFontSize('normal')}
                        className={`p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${fontSize === 'normal'
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-slate-100 hover:border-slate-200 text-slate-600'
                            }`}
                    >
                        <span className="text-base font-medium">Normal</span>
                        <span className="text-sm opacity-70">Tamaño estándar</span>
                    </button>

                    <button
                        onClick={() => setFontSize('large')}
                        className={`p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${fontSize === 'large'
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-slate-100 hover:border-slate-200 text-slate-600'
                            }`}
                    >
                        <span className="text-xl font-medium">Grande</span>
                        <span className="text-base opacity-70">Más fácil de ver</span>
                    </button>

                    <button
                        onClick={() => setFontSize('xl')}
                        className={`p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${fontSize === 'xl'
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-slate-100 hover:border-slate-200 text-slate-600'
                            }`}
                    >
                        <span className="text-2xl font-medium">Extra Grande</span>
                        <span className="text-lg opacity-70">Máxima visibilidad</span>
                    </button>
                </div>

                <div className="mt-8 p-6 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="font-medium text-slate-900 mb-2">Vista Previa:</p>
                    <p className="text-slate-600">
                        Así es como se verá el texto en la aplicación. Si necesitas que sea más grande, selecciona una de las opciones de arriba.
                    </p>
                </div>
            </div>

            {/* Guides Section */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                        <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Guías y Ayuda</h2>
                        <p className="text-slate-500">Aprende a usar todas las funciones de la aplicación.</p>
                    </div>
                </div>

                <Link
                    to="/guides"
                    className="block w-full p-6 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors text-center"
                >
                    <span className="text-xl font-bold block mb-2">Ver Guías y Tutoriales</span>
                    <span className="opacity-90">Haz clic aquí para ver instrucciones paso a paso</span>
                </Link>
            </div>
        </div>
    );
};

export default Settings;
