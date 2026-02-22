import React from 'react';
import ReactDOM from 'react-dom/client';
import './App.css';
import App from './App';

// Create root using React 18's createRoot API
const root = ReactDOM.createRoot(document.getElementById('root'));

// Render the app inside StrictMode
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);