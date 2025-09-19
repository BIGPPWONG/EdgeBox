import './index.css';
import { createRoot } from 'react-dom/client';
import React from 'react';
import { AppRouter } from './components/AppRouter';

console.log('Renderer script loaded');

const container = document.getElementById('root');
if (!container) {
  console.log('Creating root element');
  const root = document.createElement('div');
  root.id = 'root';
  document.body.appendChild(root);
}

const rootElement = document.getElementById('root')!;
console.log('Root element found:', rootElement);

try {
  const root = createRoot(rootElement);
  console.log('React root created');
  
  root.render(React.createElement(AppRouter));
  console.log('React app rendered');
} catch (error) {
  console.error('Error rendering React app:', error);
}
