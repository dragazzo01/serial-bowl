// MultiWindowManager.tsx
import React, { useState, useEffect, useRef } from 'react';
//import * as remote from '@electron/remote';

interface MultiWindowManagerProps {
    mainComponent: React.ReactNode;
    sideComponent: React.ReactNode | null;
    onClose: () => void;
    defaultSideWindowWidth?: number;
}

const MultiWindowManager: React.FC<MultiWindowManagerProps> = ({
    mainComponent,
    sideComponent,
    onClose,
    defaultSideWindowWidth = 400,
}) => {
    const [sideWindowOpen, setSideWindowOpen] = useState(true);
    const [sideWindowWidth, setSideWindowWidth] = useState(defaultSideWindowWidth);
    const isResizing = useRef(false);
    const startX = useRef(0);
    const startWidth = useRef(0);
    const mainWindowRef = useRef<HTMLDivElement>(null);
    const sideWindowRef = useRef<HTMLDivElement>(null);

    // Handle resizing
    const startResize = (e: React.MouseEvent) => {
        isResizing.current = true;
        startX.current = e.clientX;
        startWidth.current = sideWindowWidth;
        document.addEventListener('mousemove', handleResize);
        document.addEventListener('mouseup', stopResize);
    };

    const handleResize = (e: MouseEvent) => {
        if (!isResizing.current) return;
        const newWidth = startWidth.current + (startX.current - e.clientX);
        // Set min and max width constraints
        const constrainedWidth = Math.max(200, Math.min(window.innerWidth - 200, newWidth));
        setSideWindowWidth(constrainedWidth);
    };

    const stopResize = () => {
        isResizing.current = false;
        document.removeEventListener('mousemove', handleResize);
        document.removeEventListener('mouseup', stopResize);
    };

    // Clean up event listeners
    useEffect(() => {
        return () => {
            document.removeEventListener('mousemove', handleResize);
            document.removeEventListener('mouseup', stopResize);
        };
    }, []);


    // Clean up event listeners
    useEffect(() => {
        if (sideComponent) {
            setSideWindowOpen(true);
        } else {
            setSideWindowOpen(false);
            setSideWindowWidth(defaultSideWindowWidth);
        }
    }, [sideComponent]);

    return (
        <div className="multi-window-container" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
            {/* Main Window */}
            <div
                ref={mainWindowRef}
                className="main-window"
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    width: sideWindowOpen ? `calc(100% - ${sideWindowWidth}px)` : '100%',
                    transition: 'width 0.2s ease',
                }}
            >
                {mainComponent}
            </div>

            {/* Side Window */}
            {sideWindowOpen && (
                <>
                    {/* Resize handle */}
                    <div
                        className="resize-handle"
                        onMouseDown={startResize}
                        style={{
                            width: '5px',
                            cursor: 'col-resize',
                            backgroundColor: '#ddd',
                            height: '100%',
                        }}
                    />

                    <div
                        ref={sideWindowRef}
                        className="side-window"
                        style={{
                            width: `${sideWindowWidth}px`,
                            height: '100%',
                            overflowY: 'auto',
                            backgroundColor: '#f5f5f5',
                            borderLeft: '1px solid #ccc',
                            position: 'relative',
                        }}
                    >
                        {/* Close button */}
                        <button
                            onClick={onClose}
                            style={{
                                position: 'absolute',
                                top: '10px',
                                right: '10px',
                                background: '#ff5f56',
                                border: 'none',
                                borderRadius: '50%',
                                width: '16px',
                                height: '16px',
                                cursor: 'pointer',
                                zIndex: 100,
                            }}
                            title="Close window"
                        />

                        {/* Side window content */}
                        <div style={{ padding: '20px' }}>
                            {sideComponent}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default MultiWindowManager;