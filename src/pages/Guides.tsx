import React, { useState } from 'react';
import {
    LayoutDashboard,
    CheckSquare,
    Users,
    User as UserIcon,
    FileText,
    Settings,
    ChevronDown,
    ChevronUp,
    BookOpen
} from 'lucide-react';
import { Link } from 'react-router-dom';

const guidesList = [
    {
        id: 'dashboard',
        title: 'Dashboard Principal',
        description: 'Visión general y accesos rápidos a las funciones principales.',
        image: '/guias/dashboard 1.png',
        icon: LayoutDashboard
    },
    {
        id: 'asistencia',
        title: 'Toma de Asistencia',
        description: 'Cómo visualizar y registrar la asistencia diaria de los alumnos.',
        image: '/guias/Asistencia.png',
        icon: CheckSquare
    },
    {
        id: 'aulas',
        title: 'Gestión de Aulas',
        description: 'Administración de grados, secciones y sus respectivos tutores.',
        image: '/guias/gestion de aulas.png',
        icon: Users
    },
    {
        id: 'profesores',
        title: 'Gestión de Profesores',
        description: 'Sección para administrar a los docentes, agregar nuevos o editar sus datos.',
        image: '/guias/profesores.png',
        icon: UserIcon
    },
    {
        id: 'reportes',
        title: 'Reportes',
        description: 'Visualización y generación de reportes detallados y alumnos en riesgo.',
        image: '/guias/reportes.png',
        icon: FileText
    },
    {
        id: 'ajustes',
        title: 'Ajustes',
        description: 'Configuración personal de la cuenta y tamaño de las fuentes.',
        image: '/guias/ajustes.png',
        icon: Settings
    }
];

const Guides: React.FC = () => {
    const [openGuide, setOpenGuide] = useState<string | null>('dashboard');

    const toggleGuide = (id: string) => {
        setOpenGuide(openGuide === id ? null : id);
    };

    return (
        <div className="max-w-5xl mx-auto py-8 px-4 animate-in fade-in duration-300">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl shadow-sm">
                    <BookOpen className="w-8 h-8" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Guías y Tutoriales</h1>
                    <p className="text-lg text-slate-500 mt-1">
                        Aprende a usar cada sección de la aplicación paso a paso
                    </p>
                </div>
            </div>

            <div className="space-y-4 mb-12">
                {guidesList.map((guide) => {
                    const Icon = guide.icon;
                    const isOpen = openGuide === guide.id;

                    return (
                        <div
                            key={guide.id}
                            className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden ${isOpen ? 'border-indigo-200 shadow-md ring-1 ring-indigo-50' : 'border-slate-100 shadow-sm hover:border-slate-200 hover:shadow-md'
                                }`}
                        >
                            <button
                                onClick={() => toggleGuide(guide.id)}
                                className="w-full flex items-center justify-between p-6 text-left focus:outline-none"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-xl transition-colors ${isOpen ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-50 text-slate-600'
                                        }`}>
                                        <Icon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h2 className={`text-xl font-bold transition-colors ${isOpen ? 'text-indigo-900' : 'text-slate-800'
                                            }`}>
                                            {guide.title}
                                        </h2>
                                        <p className="text-slate-500 mt-1">{guide.description}</p>
                                    </div>
                                </div>
                                <div className={`p-2 rounded-full transition-colors ${isOpen ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400'
                                    }`}>
                                    {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                </div>
                            </button>

                            {isOpen && (
                                <div className="px-6 pb-6 animate-in slide-in-from-top-4 duration-300">
                                    <div className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50 p-2 md:p-4">
                                        <img
                                            src={guide.image}
                                            alt={`Guía de ${guide.title}`}
                                            className="w-full h-auto rounded-lg shadow-sm border border-slate-200"
                                            loading="lazy"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="text-center">
                <Link
                    to="/settings"
                    className="inline-flex items-center justify-center px-8 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 transition-all shadow-sm"
                >
                    Volver a Ajustes
                </Link>
            </div>
        </div>
    );
};

export default Guides;
