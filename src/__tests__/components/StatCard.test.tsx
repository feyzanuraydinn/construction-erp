import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatCard } from '../../components/ui/StatCard';

describe('StatCard', () => {
  it('never splits an amount across lines and sizes it to the card', () => {
    render(<StatCard title="Toplam Borç" value="₺3.448.073,00" subtitle="Biz borçluyuz" />);

    const value = screen.getByText('₺3.448.073,00');
    expect(value.className).toContain('whitespace-nowrap');
    expect(value.className).not.toContain('break-words');
    expect(value.parentElement?.className).toContain('[container-type:inline-size]');
  });

  it('lets a non-text value wrap as before', () => {
    render(<StatCard title="Durum" value={<span>Özel içerik</span>} />);

    const value = screen.getByText('Özel içerik').parentElement;
    expect(value?.className).toContain('break-words');
    expect(value?.className).not.toContain('whitespace-nowrap');
  });

  it('shows the full subtitle on hover when it is cut', () => {
    render(
      <StatCard title="Toplam Gider" value="₺0,00" subtitle="Alış faturaları · Ödenen: ₺0,00" />
    );

    expect(screen.getByText('Alış faturaları · Ödenen: ₺0,00')).toHaveAttribute(
      'title',
      'Alış faturaları · Ödenen: ₺0,00'
    );
  });
});
