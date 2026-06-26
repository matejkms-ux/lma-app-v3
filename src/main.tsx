import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { SessionProvider } from './session';
import { SuperAppProvider } from './superapp/store';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <SessionProvider>
        <SuperAppProvider>
          <App />
        </SuperAppProvider>
      </SessionProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
