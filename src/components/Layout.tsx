import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import {
    LayoutDashboard,
    Users,
    ClipboardCheck,
    BarChart3,
    Settings as SettingsIcon,
    LogOut,
    Menu,
    School
} from 'lucide-react';
import { cn } from '../lib/utils';

const Layout: React.FC = () => {
    const { user, logout } = useAuth();
    const { fontSize } = useSettings();
    const location = useLocation();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navigation = [
        { name: 'Inicio', href: '/', icon: LayoutDashboard, roles: ['DIRECTOR', 'PROFESSOR'] },
        { name: 'Asistencia', href: '/attendance', icon: ClipboardCheck, roles: ['DIRECTOR', 'PROFESSOR'] },
        { name: 'Reportes', href: '/reports', icon: BarChart3, roles: ['DIRECTOR', 'PROFESSOR'] },
        { name: 'Gestión Aulas', href: '/classes', icon: Users, roles: ['DIRECTOR', 'PROFESSOR'] },
        { name: 'Profesores', href: '/admin', icon: School, roles: ['DIRECTOR'] },
        { name: 'Ajustes', href: '/settings', icon: SettingsIcon, roles: ['DIRECTOR', 'PROFESSOR'] },
    ];

    const getScale = () => {
        switch (fontSize) {
            case 'large': return '1.15';
            case 'xl': return '1.3';
            default: return '1';
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row" style={{ fontSize: `${getScale()}em` }}>
            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={cn(
                "fixed md:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out md:translate-x-0 flex flex-col",
                isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="p-6 border-b border-slate-100">
                    <div className="flex items-center gap-3 text-primary-600">
                        <div className="p-2 bg-primary-50 rounded-xl">
                            <School className="w-8 h-8" />
                        </div>
                        <span className="text-xl font-bold text-slate-900">Adsum</span>
                    </div>
                </div>

                <div className="p-6 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500">
                            {user?.name[0]}
                        </div>
                        <div className="overflow-hidden">
                            <p className="font-medium text-slate-900 truncate">{user?.name}</p>
                            <p className="text-xs text-slate-500 capitalize">{user?.role.toLowerCase()}</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {navigation
                        .filter(item => item.roles.includes(user?.role || ''))
                        .map((item) => {
                            const isActive = location.pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                                        isActive
                                            ? "bg-primary-50 text-primary-700 font-medium shadow-sm"
                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                    )}
                                >
                                    <item.icon className={cn(
                                        "w-5 h-5 transition-colors",
                                        isActive ? "text-primary-600" : "text-slate-400 group-hover:text-slate-600"
                                    )} />
                                    {item.name}
                                </Link>
                            );
                        })}
                </nav>

                <div className="p-4 border-t border-slate-100">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 w-full text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors group"
                    >
                        <LogOut className="w-5 h-5 text-slate-400 group-hover:text-red-500" />
                        Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
                {/* Mobile Header */}
                <header className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-30">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary-50 text-primary-600 rounded-lg">
                            <School className="w-6 h-6" />
                        </div>
                        <span className="font-bold text-slate-900">Adsum</span>
                    </div>
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                </header>

                <div className="flex-1 overflow-auto p-4 md:p-8">
                    <div key={location.pathname} className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300 ease-in-out">
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Layout;
