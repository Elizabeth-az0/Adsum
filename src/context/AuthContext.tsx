import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';

interface AuthContextType {
    user: User | null;
    login: (username: string, password: string) => boolean;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock initial users for demo purposes if local storage is empty
const INITIAL_USERS: User[] = [
    {
        id: '1',
        username: 'director',
        password: '123',
        name: 'Director Principal',
        role: 'DIRECTOR',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Director',
    },
    {
        id: '2',
        username: 'profesor',
        password: '123',
        name: 'Profesor Demo',
        role: 'PROFESSOR',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Profesor',
    },
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('asistencia_user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    const login = (username: string, password: string) => {
        // In a real app, we would validate against a backend or the DataContext users list.
        // For this standalone demo, we'll check against our hardcoded initial users AND any users in localStorage (if we were syncing users there).
        // For simplicity in this step, let's use the hardcoded ones plus check if DataContext has more (but we can't access DataContext here easily without circular dep if not careful).
        // Let's just use a simple check against a merged list from localStorage if available.

        const storedUsersStr = localStorage.getItem('asistencia_data');
        let allUsers = [...INITIAL_USERS];

        if (storedUsersStr) {
            const data = JSON.parse(storedUsersStr);
            if (data.users && Array.isArray(data.users)) {
                // Merge or use data.users. For simplicity, let's assume data.users is the source of truth if it exists.
                // But we need to ensure the initial demo users exist there too.
                // We will handle data initialization in DataContext.
                // Here we will just read from localStorage 'asistencia_data' to find users.
                allUsers = data.users;
            }
        }

        const foundUser = allUsers.find(u => u.username === username && u.password === password);

        if (foundUser) {
            const { password, ...userWithoutPassword } = foundUser;
            setUser(userWithoutPassword as User);
            localStorage.setItem('asistencia_user', JSON.stringify(userWithoutPassword));
            return true;
        }
        return false;
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('asistencia_user');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
