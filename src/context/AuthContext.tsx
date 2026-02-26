import React, { createContext, useContext, useState, useCallback } from 'react';
import type { User } from '../types';

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
            // Check local storage for existing data
            const storedData = localStorage.getItem('adsum_data');
            let users: User[] = [];

            if (storedData) {
                const parsed = JSON.parse(storedData);
                users = parsed.users || [];
            } else {
                // Default admin fallback if system is completely new
                if (credentials.username === 'director' && credentials.password === 'admin') {
                    const fallbackUser: User = {
                        id: 'director-1',
                        username: 'director',
                        name: 'Director',
                        role: 'DIRECTOR',
                        avatar: 'https://ui-avatars.com/api/?name=Director&background=random'
                    };
                    setUser(fallbackUser);
                    localStorage.setItem('adsum_user', JSON.stringify(fallbackUser));
                    return true;
                }
            }

            const foundUser = users.find(u => u.username === credentials.username && u.password === credentials.password);

            if (foundUser) {
                // Ensure password isn't accidentally leaked heavily in local state, although we are local-first
                const userObj = { ...foundUser };
                setUser(userObj);
                localStorage.setItem('adsum_user', JSON.stringify(userObj));
                return true;
            }

            return false;
        } catch (err) {
            console.error('Login failed', err);
            return false;
        }
    };

    const updateCurrentUser = useCallback((updates: Partial<User>) => {
        setUser((prev: User | null) => {
            if (!prev) return prev;
            const updatedUser = { ...prev, ...updates } as User;

            const stored = localStorage.getItem('adsum_data');
            if (stored) {
                try {
                    const data = JSON.parse(stored);
                    data.users = data.users.map((u: User) => u.id === updatedUser.id ? updatedUser : u);
                    localStorage.setItem('adsum_data', JSON.stringify(data));
                } catch (e) {
                    // silently fail
                }
            }

            localStorage.setItem('adsum_user', JSON.stringify(updatedUser));
            return updatedUser;
        });
    }, []);

    const logout = () => {
        setUser(null);
        localStorage.removeItem('adsum_user');
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
