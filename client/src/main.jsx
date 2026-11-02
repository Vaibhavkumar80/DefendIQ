import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/Toast.jsx';
import './styles/global.css';

class Boundary extends React.Component {
  state = { err: null };
  static getDerivedStateFromError(err) { return { err }; }
  render() {
    if (!this.state.err) return this.props.children;
    return <div style={{ padding: 40, textAlign: 'center' }}><h1>Something went wrong</h1><p style={{ color: 'var(--muted)' }}>Please reload the page.</p><button className="btn btn-primary" onClick={() => location.reload()}>Reload</button></div>;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Boundary><BrowserRouter><ToastProvider><AuthProvider><App /></AuthProvider></ToastProvider></BrowserRouter></Boundary>
  </React.StrictMode>,
);
