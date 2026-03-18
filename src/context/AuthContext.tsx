import React, { createContext, useContext, useState, useCallback } from 'react';
import type { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
    user: User | null;
    login: (credentials: any) => Promise<boolean>;
    logout: () => void;
    updateCurrentUser: (updatedUser: Partial<User>) => void;
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
                const userObj = { ...data.user };
                setUser(userObj);
                localStorage.setItem('adsum_user', JSON.stringify(userObj));
                localStorage.setItem('adsum_token', data.token);
                return true;
            }
            return false;
        } catch (err) {
            console.error('Login failed', err);
            throw err; 
        }
    };

    const updateCurrentUser = useCallback(async (updates: Partial<User>) => {
        setUser((prev: User | null) => {
            if (!prev) return prev;
            const updatedUser = { ...prev, ...updates } as User;
            localStorage.setItem('adsum_user', JSON.stringify(updatedUser));
            return updatedUser;
        });

        if (user) {
            try {
                await api.updateUser(user.id, updates);
            } catch (err) {
                console.error('Failed to update user on backend', err);
            }
        }
    }, [user]);

    const logout = () => {
        setUser(null);
        localStorage.removeItem('adsum_user');
        localStorage.removeItem('adsum_token');
        window.location.href = '#/login';
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, updateCurrentUser, isAuthenticated: !!user }}>
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
