import React from 'react';
import { BookOpen, Construction } from 'lucide-react';
import { Link } from 'react-router-dom';

const Guides: React.FC = () => {
    return (
        <div className="max-w-4xl mx-auto text-center py-12">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Construction className="w-12 h-12 text-slate-400" />
            </div>

            <h1 className="text-3xl font-bold text-slate-900 mb-4">Guías y Tutoriales</h1>
            <p className="text-xl text-slate-500 mb-8 max-w-2xl mx-auto">
                Estamos preparando guías detalladas con imágenes para explicarte cómo usar cada botón y función de la aplicación.
            </p>

            <div className="bg-blue-50 p-6 rounded-2xl max-w-2xl mx-auto mb-12 border border-blue-100">
                <div className="flex items-center justify-center gap-3 text-blue-700 mb-2">
                    <BookOpen className="w-6 h-6" />
                    <span className="font-bold text-lg">Próximamente</span>
                </div>
                <p className="text-blue-600">
                    Aquí encontrarás explicaciones sencillas y paso a paso.
                </p>
            </div>

            <Link
                to="/settings"
                className="inline-flex items-center justify-center px-8 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors"
            >
                Volver a Ajustes
            </Link>
        </div>
    );
};

export default Guides;
