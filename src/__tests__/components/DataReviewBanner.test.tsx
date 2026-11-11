import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StrictMode } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import '../../i18n';
import { DataReviewBanner } from '../../components/DataReviewBanner';

function Where() {
  return <span data-testid="path">{useLocation().pathname}</span>;
}

function renderBanner(path = '/') {
  return render(
    <StrictMode>
      <MemoryRouter initialEntries={[path]}>
        <DataReviewBanner />
        <Routes>
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </StrictMode>
  );
}

describe('DataReviewBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('asks for the review while records are pending, and opens the review page', async () => {
    window.electronAPI.review.getStatus = vi.fn().mockResolvedValue({ completed: false, pending: 3 });
    renderBanner();
    expect(await screen.findByText(/3 tanesinin gözden geçirilmesi gerekiyor/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Kayıtları incele'));
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/data-review'));
    expect(screen.queryByText('Kayıtları incele')).not.toBeInTheDocument();
  });

  it('shows nothing once the review is completed', async () => {
    window.electronAPI.review.getStatus = vi.fn().mockResolvedValue({ completed: true, pending: 0 });
    renderBanner();
    await waitFor(() => expect(window.electronAPI.review.getStatus).toHaveBeenCalled());
    expect(screen.queryByText('Kayıtları incele')).not.toBeInTheDocument();
  });
});
