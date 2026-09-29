import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App, type Page } from './App';
import './styles.css';
import './notebook/notebook.css';

const titles: Record<Page, string | null> = { machine: null, notebook: "Operator's notebook", instructions: 'Instructions' };
const hash = window.location.hash.slice(1);
const page: Page = hash in titles ? (hash as Page) : 'machine';
document.title = titles[page] ?? document.title;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App api={window.enigma} page={page} />
  </StrictMode>,
);
