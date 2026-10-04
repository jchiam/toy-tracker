import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { CatalogImage } from './CatalogImage';

afterEach(cleanup);

describe('CatalogImage', () => {
  it('renders the image with its alternative text', () => {
    render(<CatalogImage src="https://ik.imagekit.io/example/1.jpg" alt="Storm Falcon" />);
    const image = screen.getByRole('img', { name: 'Storm Falcon' });
    expect(image.tagName).toBe('IMG');
    expect(image).toHaveAttribute('src', 'https://ik.imagekit.io/example/1.jpg');
  });

  it('renders a labelled placeholder when there is no URL', () => {
    render(<CatalogImage src={null} alt="Storm Falcon" />);
    const placeholder = screen.getByRole('img', { name: 'Storm Falcon' });
    expect(placeholder.tagName).toBe('SPAN');
    expect(placeholder).toHaveClass('br-image-placeholder');
  });

  it('swaps to the placeholder when the image fails to load', () => {
    render(<CatalogImage src="https://ik.imagekit.io/example/missing.jpg" alt="Storm Falcon" />);
    fireEvent.error(screen.getByRole('img', { name: 'Storm Falcon' }));
    const placeholder = screen.getByRole('img', { name: 'Storm Falcon' });
    expect(placeholder.tagName).toBe('SPAN');
    expect(placeholder).not.toHaveAttribute('src');
  });
});
