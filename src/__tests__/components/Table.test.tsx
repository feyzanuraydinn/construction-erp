import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui/Table';

describe('Table', () => {
  it('should render a table element', () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(
      <Table className="custom-table">
        <TableBody>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
    expect(screen.getByRole('table').parentElement).toHaveClass('custom-table');
  });
});

describe('TableHeader', () => {
  it('should render thead element', () => {
    const { container } = render(
      <table>
        <TableHeader>
          <TableRow>
            <TableHead>Header</TableHead>
          </TableRow>
        </TableHeader>
      </table>
    );
    expect(container.querySelector('thead')).toBeInTheDocument();
  });
});

describe('TableBody', () => {
  it('should render tbody element', () => {
    const { container } = render(
      <table>
        <TableBody>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </table>
    );
    expect(container.querySelector('tbody')).toBeInTheDocument();
  });
});

describe('TableRow', () => {
  it('should render tr element', () => {
    render(
      <table>
        <tbody>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </tbody>
      </table>
    );
    expect(screen.getByRole('row')).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();
    render(
      <table>
        <tbody>
          <TableRow onClick={handleClick}>
            <TableCell>Clickable row</TableCell>
          </TableRow>
        </tbody>
      </table>
    );
    fireEvent.click(screen.getByRole('row'));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('should apply selected styling', () => {
    render(
      <table>
        <tbody>
          <TableRow selected>
            <TableCell>Selected row</TableCell>
          </TableRow>
        </tbody>
      </table>
    );
    const row = screen.getByRole('row');
    expect(row.className).toContain('bg-blue');
  });
});

describe('TableHead', () => {
  it('should render th element with scope=col', () => {
    render(
      <table>
        <thead>
          <tr>
            <TableHead>Column</TableHead>
          </tr>
        </thead>
      </table>
    );
    const th = screen.getByRole('columnheader');
    expect(th).toBeInTheDocument();
    expect(th).toHaveAttribute('scope', 'col');
  });
});

describe('TableCell', () => {
  it('should render td element', () => {
    render(
      <table>
        <tbody>
          <tr>
            <TableCell>Cell content</TableCell>
          </tr>
        </tbody>
      </table>
    );
    expect(screen.getByRole('cell')).toBeInTheDocument();
    expect(screen.getByText('Cell content')).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();
    render(
      <table>
        <tbody>
          <tr>
            <TableCell onClick={handleClick}>Clickable cell</TableCell>
          </tr>
        </tbody>
      </table>
    );
    fireEvent.click(screen.getByText('Clickable cell'));
    expect(handleClick).toHaveBeenCalledOnce();
  });
});

describe('Table full composition', () => {
  it('should render complete table with headers and data', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Age</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Alice</TableCell>
            <TableCell>30</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Bob</TableCell>
            <TableCell>25</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(3); // 1 header + 2 body
  });
});
