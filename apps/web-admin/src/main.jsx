import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          className: 'toast-custom',
          style: {
            background: '#1F2937',
            color: '#F9FAFB',
            borderRadius: '10px',
            padding: '12px 16px',
          },
          success: {
            iconTheme: { primary: '#F59E0B', secondary: '#1F2937' },
          },
          error: {
            iconTheme: { primary: '#EF4444', secondary: '#1F2937' },
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
