import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Lock, ArrowRight } from 'lucide-react';

const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            // Prevenir errores comunes de tipeo (espacios en blanco accidental o mayusculas)
            const cleanUsername = username.trim().toLowerCase();
            const cleanPassword = password.trim();

            const success = await login({ username: cleanUsername, password: cleanPassword });
            if (success) {
                navigate('/');
            } else {
                setError('Usuario o contraseña incorrectos.');
            }
        } catch (err: any) {
            console.error('Login error detail:', err);
            if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
                setError('No se pudo conectar con el servidor. ¿Está el backend encendido?');
            } else {
                setError('Error al intentar iniciar sesión. Por favor intente de nuevo.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4 relative"
            style={{
                backgroundImage: 'url("/fondo.png")',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}
        >
            <div className="absolute inset-0 bg-primary-900/40 backdrop-blur-[2px]"></div>
            <div className="bg-white border border-slate-100 p-8 rounded-2xl w-full max-w-md text-slate-900 relative z-10 shadow-2xl">
                <div className="flex flex-col items-center mb-8">
                    <img src="/LogoAdsum1.svg" alt="Adsum Logo" className="h-24 w-auto mb-4 xl:-ml-4 translate-x-4" />
                    <h1 className="text-3xl font-bold text-slate-900 text-center">Adsum</h1>
                    <p className="text-slate-500 mt-2 text-center">Control de asistencia</p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl mb-6 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 ml-1">Usuario</label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 placeholder-slate-400 transition-all"
                                placeholder="tu usuario"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 ml-1">Contraseña</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 placeholder-slate-400 transition-all"
                                placeholder="••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-primary-600 text-white py-3.5 rounded-xl font-bold hover:bg-primary-700 transition-all shadow-none flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <>
                                Iniciar Sesión <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
