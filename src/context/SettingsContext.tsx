import React, { createContext, useContext, useState, useEffect } from 'react';

type FontSize = 'normal' | 'large' | 'xl';

interface SettingsContextType {
    fontSize: FontSize;
    setFontSize: (size: FontSize) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [fontSize, setFontSizeState] = useState<FontSize>('normal');

    useEffect(() => {
        const storedSize = localStorage.getItem('adsum_font_size') as FontSize;
        if (storedSize) {
            setFontSizeState(storedSize);
        }
    }, []);

    const setFontSize = (size: FontSize) => {
        setFontSizeState(size);
        localStorage.setItem('adsum_font_size', size);
    };

    return (
        <SettingsContext.Provider value={{ fontSize, setFontSize }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
