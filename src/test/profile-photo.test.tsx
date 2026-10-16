import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ProfilePhoto } from '@/components/profile-photo';

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('draws the original photo with high-quality smoothing at display pixel density', () => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.spyOn(window, 'devicePixelRatio', 'get').mockReturnValue(2);
  const context = { imageSmoothingEnabled: false, imageSmoothingQuality: 'low', drawImage: vi.fn() };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
  const { container } = render(<div><ProfilePhoto src="/original.jpg" alt="Avatar"/></div>);
  const img = container.querySelector('img')!;
  vi.spyOn(img.parentElement!, 'getBoundingClientRect').mockReturnValue({ width: 80, height: 80 } as DOMRect);
  Object.defineProperties(img, { complete: { value: true }, naturalWidth: { value: 1200 }, naturalHeight: { value: 1600 } });
  fireEvent.load(img);
  const canvas = container.querySelector('canvas')!;
  expect(canvas.width).toBe(160);
  expect(canvas.height).toBe(160);
  expect(context.imageSmoothingQuality).toBe('high');
  expect(context.drawImage).toHaveBeenCalledWith(img, 0, 200, 1200, 1200, 0, 0, 160, 160);
  expect(img).toHaveAttribute('src', '/original.jpg');
});

it('keeps animated GIFs on the native image path', () => {
  const { container } = render(<ProfilePhoto src="/animated.gif?token=test"/>);
  expect(container.querySelector('canvas')).toBeNull();
  expect(container.querySelector('img')).toHaveAttribute('src', '/animated.gif?token=test');
});
