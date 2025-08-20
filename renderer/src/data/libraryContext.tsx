// renderer/src/data/libraryContext.tsx
import React, { createContext, useContext, useState } from 'react';
import { Library } from './library';

interface LibraryContextType {
    library: Library;
    loadLibrary: () => Promise<Library>;
    updateLibrary: () => void;
}

const LibraryContext = createContext<LibraryContextType | null>(null);

export const LibraryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [library, setLibrary] = useState<Library>(new Library());

    const loadLibrary = async () => {
        const newLibrary = await Library.create();
        setLibrary(newLibrary);
        return newLibrary; // Return the library
    };


    const updateLibrary = async () => {
        await library.saveLibrary();
    };

    return (
        <LibraryContext.Provider value={{ library, loadLibrary, updateLibrary }}>
            {children}
        </LibraryContext.Provider>
    );
};

export const useLibrary = () => {
    const context = useContext(LibraryContext);
    if (!context) {
        throw new Error('useLibrary must be used within a LibraryProvider');
    }
    return context;
};