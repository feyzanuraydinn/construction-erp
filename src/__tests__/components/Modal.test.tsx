import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../components/ui/Modal';

describe('Modal Component', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Reset body overflow after each test
    document.body.style.overflow = '';
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <Modal isOpen={false} onClose={onClose}>
          <div>Modal Content</div>
        </Modal>
      );
      expect(screen.queryByText('Modal Content')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(
        <Modal isOpen={true} onClose={onClose}>
          <div>Modal Content</div>
        </Modal>
      );
      expect(screen.getByText('Modal Content')).toBeInTheDocument();
    });

    it('should render title when provided', () => {
      render(
        <Modal isOpen={true} onClose={onClose} title="Test Modal">
          <div>Content</div>
        </Modal>
      );
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
    });

    it('should render footer when provided', () => {
      render(
        <Modal
          isOpen={true}
          onClose={onClose}
          footer={<button>Save</button>}
        >
          <div>Content</div>
        </Modal>
      );
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    });
  });

  describe('Sizes', () => {
    it('should apply default size (md)', () => {
      render(
        <Modal isOpen={true} onClose={onClose}>
          <div>Content</div>
        </Modal>
      );
      const modal = document.querySelector('.max-w-lg');
      expect(modal).toBeInTheDocument();
    });

    it('should apply small size', () => {
      render(
        <Modal isOpen={true} onClose={onClose} size="sm">
          <div>Content</div>
        </Modal>
      );
      const modal = document.querySelector('.max-w-md');
      expect(modal).toBeInTheDocument();
    });

    it('should apply large size', () => {
      render(
        <Modal isOpen={true} onClose={onClose} size="lg">
          <div>Content</div>
        </Modal>
      );
      const modal = document.querySelector('.max-w-2xl');
      expect(modal).toBeInTheDocument();
    });

    it('should apply extra large size', () => {
      render(
        <Modal isOpen={true} onClose={onClose} size="xl">
          <div>Content</div>
        </Modal>
      );
      const modal = document.querySelector('.max-w-4xl');
      expect(modal).toBeInTheDocument();
    });

    it('should apply full size', () => {
      render(
        <Modal isOpen={true} onClose={onClose} size="full">
          <div>Content</div>
        </Modal>
      );
      const modal = document.querySelector('.max-w-6xl');
      expect(modal).toBeInTheDocument();
    });
  });

  describe('Close Behavior', () => {
    it('should call onClose when backdrop is clicked', () => {
      render(
        <Modal isOpen={true} onClose={onClose}>
          <div>Content</div>
        </Modal>
      );
      // Click on backdrop (the overlay with bg-black/50)
      const backdrop = document.querySelector('.bg-black\\/50');
      if (backdrop) {
        fireEvent.click(backdrop);
      }
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when close button is clicked', () => {
      render(
        <Modal isOpen={true} onClose={onClose} title="Test">
          <div>Content</div>
        </Modal>
      );
      // Close button is rendered when title is provided
      const closeButtons = document.querySelectorAll('button');
      // Find the close button (the one with X icon)
      const closeButton = Array.from(closeButtons).find(
        btn => btn.querySelector('svg')
      );
      if (closeButton) {
        fireEvent.click(closeButton);
      }
      expect(onClose).toHaveBeenCalled();
    });

    it('should call onClose when Escape key is pressed', () => {
      render(
        <Modal isOpen={true} onClose={onClose}>
          <div>Content</div>
        </Modal>
      );
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Body Overflow', () => {
    it('should prevent body scroll when open', () => {
      render(
        <Modal isOpen={true} onClose={onClose}>
          <div>Content</div>
        </Modal>
      );
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should restore body scroll when closed', () => {
      const { rerender } = render(
        <Modal isOpen={true} onClose={onClose}>
          <div>Content</div>
        </Modal>
      );
      expect(document.body.style.overflow).toBe('hidden');

      rerender(
        <Modal isOpen={false} onClose={onClose}>
          <div>Content</div>
        </Modal>
      );
      expect(document.body.style.overflow).toBe('');
    });
  });
});

describe('ModalHeader Component', () => {
  it('should render children', () => {
    render(<ModalHeader>Header Title</ModalHeader>);
    expect(screen.getByText('Header Title')).toBeInTheDocument();
  });

  it('should render close button when onClose is provided', () => {
    const onClose = vi.fn();
    render(<ModalHeader onClose={onClose}>Header</ModalHeader>);
    const closeButton = document.querySelector('button');
    expect(closeButton).toBeInTheDocument();
  });

  it('should not render close button when onClose is not provided', () => {
    render(<ModalHeader>Header</ModalHeader>);
    const closeButton = document.querySelector('button');
    expect(closeButton).not.toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<ModalHeader onClose={onClose}>Header</ModalHeader>);
    const closeButton = document.querySelector('button');
    if (closeButton) {
      fireEvent.click(closeButton);
    }
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('ModalBody Component', () => {
  it('should render children', () => {
    render(<ModalBody>Body Content</ModalBody>);
    expect(screen.getByText('Body Content')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<ModalBody className="custom-class">Content</ModalBody>);
    const body = screen.getByText('Content');
    expect(body.className).toContain('custom-class');
  });

  it('should have overflow-y-auto class', () => {
    render(<ModalBody>Content</ModalBody>);
    const body = screen.getByText('Content');
    expect(body.className).toContain('overflow-y-auto');
  });
});

describe('ModalFooter Component', () => {
  it('should render children', () => {
    render(
      <ModalFooter>
        <button>Cancel</button>
        <button>Save</button>
      </ModalFooter>
    );
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<ModalFooter className="custom-footer">Buttons</ModalFooter>);
    const footer = screen.getByText('Buttons');
    expect(footer.className).toContain('custom-footer');
  });

  it('should have flex and justify-end classes', () => {
    render(<ModalFooter>Content</ModalFooter>);
    const footer = screen.getByText('Content');
    expect(footer.className).toContain('flex');
    expect(footer.className).toContain('justify-end');
  });
});

describe('Compound Modal Pattern', () => {
  it('should work with compound components', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose}>
        <ModalHeader onClose={onClose}>Edit Item</ModalHeader>
        <ModalBody>
          <input placeholder="Item name" />
        </ModalBody>
        <ModalFooter>
          <button onClick={onClose}>Cancel</button>
          <button>Save</button>
        </ModalFooter>
      </Modal>
    );

    expect(screen.getByText('Edit Item')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Item name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });
});
