const API_URL = import.meta.env.VITE_API_URL || 'https://adsum-api.elizabethgaldames35.workers.dev/api';

const getHeaders = () => {
    const token = localStorage.getItem('adsum_token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

export const api = {
    // Auth
    login: async (credentials: any) => {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials)
        });
        if (!res.ok) throw new Error('Credenciales inválidas');
        return res.json();
    },

    // Users
    getUsers: async () => {
        const res = await fetch(`${API_URL}/users`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Error al cargar usuarios');
        return res.json();
    },
    createUser: async (user: any) => {
        const res = await fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(user)
        });
        if (!res.ok) throw new Error('Error al crear usuario');
        return res.json();
    },
    updateUser: async (id: string, user: any) => {
        const res = await fetch(`${API_URL}/users/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(user)
        });
        if (!res.ok) throw new Error('Error al actualizar usuario');
        return res.json();
    },
    deleteUser: async (id: string) => {
        const res = await fetch(`${API_URL}/users/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!res.ok) throw new Error('Error al eliminar usuario');
        return res.json();
    },

    // Classes
    getClasses: async () => {
        const res = await fetch(`${API_URL}/classes`, { headers: getHeaders() });
        if (!res.ok) {
            if (res.status === 401) throw new Error('UNAUTHORIZED');
            throw new Error('Error al cargar clases');
        }
        return res.json();
    },
    createClass: async (data: any) => {
        const res = await fetch(`${API_URL}/classes`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Error al crear clase');
        return res.json();
    },
    updateClass: async (id: string, data: any) => {
        const res = await fetch(`${API_URL}/classes/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Error al actualizar clase');
        return res.json();
    },
    deleteClass: async (id: string) => {
        const res = await fetch(`${API_URL}/classes/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!res.ok) throw new Error('Error al eliminar clase');
        return res.json();
    },

    // Students
    getStudents: async (classId: string, signal?: AbortSignal) => {
        const res = await fetch(`${API_URL}/students/${classId}`, { headers: getHeaders(), signal });
        if (!res.ok) throw new Error('Error al cargar estudiantes');
        return res.json();
    },
    createStudent: async (data: any) => {
        const res = await fetch(`${API_URL}/students`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Error al crear estudiante');
        return res.json();
    },
    deleteStudent: async (id: string) => {
        const res = await fetch(`${API_URL}/students/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!res.ok) throw new Error('Error al eliminar estudiante');
        return res.json();
    },

    // Attendance
    getAttendance: async (classId: string, date: string, signal?: AbortSignal) => {
        const res = await fetch(`${API_URL}/attendance?classId=${classId}&date=${date}`, { headers: getHeaders(), signal });
        if (!res.ok) throw new Error('Error al cargar asistencia');
        return res.json();
    },
    saveAttendance: async (data: { class_id: string, date: string, records: any[] }) => {
        const res = await fetch(`${API_URL}/attendance`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Error al guardar asistencia');
        return res.json();
    },
    deleteAttendance: async (classId: string, date: string) => {
        const res = await fetch(`${API_URL}/attendance/${classId}/${date}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!res.ok) throw new Error('Error al eliminar asistencia');
        return res.json();
    },

    // Reports
    getReports: async (from: string, to: string, signal?: AbortSignal) => {
        const res = await fetch(`${API_URL}/reports?from=${from}&to=${to}`, { headers: getHeaders(), signal });
        if (!res.ok) throw new Error('Error al cargar reportes');
        return res.json();
    }
};
