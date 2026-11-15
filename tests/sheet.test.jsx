// Verrouillage du défilement de la page par les tiroirs (Sheet), y compris empilés.
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { Sheet } from '../src/components/ui.jsx';

afterEach(cleanup);

/** Sélecteur de capacités (A, onClose recréé à chaque rendu) + fiche de détail (B) par-dessus. */
function Ecran({ a, b, tick }) {
  return (
    <div data-tick={tick}>
      <Sheet open={a} onClose={() => {}} title="Capacités">A</Sheet>
      <Sheet open={b} onClose={() => {}} title="Détail">B</Sheet>
    </div>
  );
}

describe('Sheet : défilement de la page', () => {
  it('fiche de détail ouverte puis fermée au-dessus du sélecteur, puis sélecteur fermé : la page défile à nouveau', () => {
    const { rerender } = render(<Ecran a b={false} tick={0} />);
    expect(document.body.style.overflow).toBe('hidden');
    rerender(<Ecran a b tick={1} />); // ouverture de la fiche d'une capacité
    rerender(<Ecran a b={false} tick={2} />); // fermeture de la fiche
    rerender(<Ecran a b={false} tick={3} />); // rendu suivant (choix de la capacité)
    expect(document.body.style.overflow).toBe('hidden');
    rerender(<Ecran a={false} b={false} tick={4} />); // le sélecteur se ferme après le choix
    expect(document.body.style.overflow).toBe('');
  });

  it('fermeture dans le désordre', () => {
    const { rerender } = render(<Ecran a b tick={0} />);
    rerender(<Ecran a={false} b tick={1} />);
    expect(document.body.style.overflow).toBe('hidden');
    rerender(<Ecran a={false} b={false} tick={2} />);
    expect(document.body.style.overflow).toBe('');
  });
});
