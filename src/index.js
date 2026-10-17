import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// A nyitóoldal (public/index.html) statikus; a React vázlat csak akkor indul, ha van #root elem
const el = document.getElementById('root');
if (el) ReactDOM.createRoot(el).render(<App />);
