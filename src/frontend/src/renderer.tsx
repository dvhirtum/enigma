import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';
import './notebook/notebook.css';

const page = window.location.hash === '#notebook' ? 'notebook' : 'machine';
if (page === 'notebook') {
  document.title = "Operator's notebook";
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App api={window.enigma} page={page} />
  </StrictMode>,
);
