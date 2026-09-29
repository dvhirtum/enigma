import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { guidePages } from '../guide';
import { InstructionsView } from './InstructionsView';

describe('InstructionsView', () => {
  it('opens on the contents of the user guide', () => {
    render(<InstructionsView />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Enigma user guide');
  });

  it('opens a linked page and returns to the contents', () => {
    render(<InstructionsView />);

    fireEvent.click(screen.getByRole('link', { name: "Operator's notebook" }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent("Operator's notebook");

    fireEvent.click(screen.getByRole('link', { name: 'Back to the contents' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Enigma user guide');
  });

  it('renders tables', () => {
    render(<InstructionsView />);

    fireEvent.click(screen.getByRole('link', { name: 'Glossary' }));

    expect(screen.getByRole('table')).toHaveTextContent('Spruchschlüssel');
  });

  it('links only to pages that exist', () => {
    const links = Object.values(guidePages).flatMap((text) => [...text.matchAll(/\]\(([^)#]+)(#[^)]*)?\)/g)].map((match) => match[1]));

    expect(links.filter((link) => !(link in guidePages))).toEqual([]);
  });
});
