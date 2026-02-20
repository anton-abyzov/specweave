import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/globals.css';
import { getDashboardToken } from './utils/dashboardAuth';

const originalFetch = window.fetch.bind(window);
window.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const token = getDashboardToken();
  if (!token) {
    return originalFetch(input, init);
  }

  const headers = new Headers(init?.headers || {});
  headers.set('X-Specweave-Dashboard-Token', token);
  return originalFetch(input, { ...init, headers });
}) as typeof window.fetch;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
