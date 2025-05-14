// src/index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom'; 
import 'antd/dist/reset.css';
import './index.css'; // Estilos globales básicos
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <BrowserRouter> {/* <-- 2. Envolver App aquí */}
      <App />
    </BrowserRouter>
  </React.StrictMode>
);