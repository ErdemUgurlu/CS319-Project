import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

// Debug token information if available
const token = localStorage.getItem('access_token');
if (token) {
  try {
    const decoded = JSON.parse(atob(token.split('.')[1]));
    console.log('Token payload:', decoded);
  } catch (error) {
    console.error('Error decoding token:', error);
  }
}
