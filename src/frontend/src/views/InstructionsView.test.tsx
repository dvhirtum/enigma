import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { guideContents, guidePages, linkedPage } from '../guide';
import { InstructionsView } from './InstructionsView';

const article = () => screen.getByRole('article', { name: 'Instructions' });
const contents = () => screen.getByRole('navigation', { name: 'Contents' });

describe('InstructionsView', () => {
  it('opens on the contents of the user guide', () => {
    render(<InstructionsView />);

    expect(within(article()).getByRole('heading', { level: 1 })).toHaveTextContent('Enigma user guide');
  });

  it('opens a linked page and returns to its section', () => {
    render(<InstructionsView />);

    fireEvent.click(within(article()).getByRole('link', { name: 'The Enigma' }));
    fireEvent.click(within(article()).getByRole('link', { name: "Operator's notebook" }));
    expect(within(article()).getByRole('heading', { level: 1 })).toHaveTextContent("Operator's notebook");

    fireEvent.click(within(article()).getByRole('link', { name: 'Back to The Enigma' }));
    expect(within(article()).getByRole('heading', { level: 1 })).toHaveTextContent('The Enigma');
  });

  it('shows the Enigma, the Bombe and the glossary at the top of the contents, with closed sections', () => {
    render(<InstructionsView />);

    const top = within(contents()).getAllByRole('list')[0];
    expect(
      within(top)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['The Enigma', 'The Bombe', 'Glossary']);
    expect(within(contents()).getByRole('button', { name: 'The Enigma' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens and closes a section of the contents', () => {
    render(<InstructionsView />);
    const section = within(contents()).getByRole('button', { name: 'The Bombe' });

    fireEvent.click(section);
    expect(section).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(within(contents()).getByRole('link', { name: 'Breaking a message' }));
    expect(within(article()).getByRole('heading', { level: 1 })).toHaveTextContent('Breaking a message');
    expect(within(contents()).getByRole('link', { name: 'Breaking a message' })).toHaveAttribute('aria-current', 'page');

    fireEvent.click(section);
    expect(within(contents()).queryByRole('link', { name: 'Breaking a message' })).not.toBeInTheDocument();
  });

  it('opens the section of a page opened from a link', () => {
    render(<InstructionsView />);

    fireEvent.click(within(article()).getByRole('link', { name: 'Glossary' }));
    fireEvent.click(within(article()).getByRole('link', { name: 'Bombe' }));

    expect(within(contents()).getByRole('button', { name: 'The Bombe' })).toHaveAttribute('aria-expanded', 'true');
    expect(within(contents()).getByRole('link', { name: 'The Bombe' })).toHaveAttribute('aria-current', 'page');
  });

  it('hides and shows the contents', () => {
    render(<InstructionsView />);

    fireEvent.click(screen.getByRole('button', { name: 'Hide contents' }));
    expect(screen.queryByRole('navigation', { name: 'Contents' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show contents' }));
    expect(contents()).toBeVisible();
  });

  it('renders tables', () => {
    render(<InstructionsView />);

    fireEvent.click(within(contents()).getByRole('link', { name: 'Glossary' }));

    expect(screen.getAllByRole('table')[0]).toHaveTextContent('Spruchschlüssel');
  });

  it('writes plain code blocks by hand, one character per square', () => {
    const { container } = render(<InstructionsView />);

    fireEvent.click(within(contents()).getByRole('button', { name: 'The Enigma' }));
    fireEvent.click(within(contents()).getByRole('link', { name: 'Receiving by hand' }));

    const block = [...container.querySelectorAll('pre.guide-hand')].find((pre) => pre.textContent === 'G E A QL Z B C');
    expect(block?.querySelectorAll('.guide-hand-line')).toHaveLength(2);
    expect(block?.querySelectorAll('.guide-hand-square')).toHaveLength(14);
  });

  it('keeps JSON code blocks in print', () => {
    const { container } = render(<InstructionsView />);

    fireEvent.click(within(contents()).getByRole('button', { name: 'The Enigma' }));
    fireEvent.click(within(contents()).getByRole('link', { name: 'Receiving by hand' }));

    const json = container.querySelector('pre code.language-json');
    expect(json).toHaveTextContent('"network": "Hydra"');
    expect(json?.closest('pre')).not.toHaveClass('guide-hand');
  });
});

describe('guide', () => {
  it('links only to pages that exist', () => {
    const broken = Object.entries(guidePages).flatMap(([page, text]) =>
      [...text.matchAll(/\]\(([^)#]+)(#[^)]*)?\)/g)]
        .map((match) => match[1])
        .filter((href) => !linkedPage(page, href))
        .map((href) => `${page}: ${href}`),
    );

    expect(broken).toEqual([]);
  });

  it('lists every page in the contents once', () => {
    const listed = guideContents.flatMap((entry) => [entry.page, ...(entry.children ?? []).map((child) => child.page)]);

    expect([...listed, 'README.md'].sort()).toEqual(Object.keys(guidePages).sort());
  });

  it('resolves links relative to the page', () => {
    expect(linkedPage('bombe/history.md', '../glossary.md#terms-in-the-messages')).toBe('glossary.md');
    expect(linkedPage('README.md', 'enigma/README.md')).toBe('enigma/README.md');
    expect(linkedPage('enigma/machine.md', 'https://example.org')).toBeNull();
  });
});
