// index.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Scene } from './Scene.tsx';
import './styles.css';

function App() {
    return (
        <div style={{ width: '100vw', height: '100vh' }}>
            <Scene />
        </div>
    );
}

const rootElement = document.getElementById('root');
if (rootElement) {
    createRoot(rootElement).render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
}
