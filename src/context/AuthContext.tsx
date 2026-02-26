import React, { createContext, useContext, useState } from 'react';
import type { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
    user: User | null;
    login: (credentials: any) => Promise<boolean>;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(() => {
        const storedUser = localStorage.getItem('adsum_user');
        if (storedUser) return JSON.parse(storedUser);
        return null;
    });

    const login = async (credentials: any) => {
        try {
            const data = await api.login(credentials);
            if (data.token && data.user) {
                localStorage.setItem('adsum_token', data.token);
                // User object passed via JWT/login response
                setUser(data.user);
                localStorage.setItem('adsum_user', JSON.stringify(data.user));
                return true;
            }
            return false;
        } catch (err) {
            console.error('Login failed', err);
            throw err;
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('adsum_user');
        localStorage.removeItem('adsum_token');
        window.location.href = '#/login';
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
