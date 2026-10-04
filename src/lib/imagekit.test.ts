import { describe, it, expect, vi, afterEach } from 'vitest';
import vercelConfig from '../../vercel.json';
import { toImageKitPath } from './imagekit-path';
import { getProductShotUrl, getProductThumbnailUrl, getVariantImageUrl } from './imagekit';

const ENDPOINT = 'https://ik.imagekit.io/example';
const SHOT = '/assets/baraba-ride/products/BR-01/3.jpg';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('toImageKitPath', () => {
  it('drops /assets and underscores directory names, keeping the file name', () => {
    expect(toImageKitPath(SHOT)).toBe('/baraba_ride/products/BR_01/3.jpg');
  });
});

describe('with the endpoint configured', () => {
  it('resolves a product thumbnail capped at 480px', () => {
    vi.stubEnv('VITE_IMAGEKIT_URL_ENDPOINT', ENDPOINT);
    expect(getProductThumbnailUrl(SHOT)).toBe(
      `${ENDPOINT}/tr:w-480,c-at_max/baraba_ride/products/BR_01/3.jpg`,
    );
  });

  it('resolves a full product shot capped at 1200px', () => {
    vi.stubEnv('VITE_IMAGEKIT_URL_ENDPOINT', ENDPOINT);
    expect(getProductShotUrl(SHOT)).toBe(
      `${ENDPOINT}/tr:w-1200,c-at_max/baraba_ride/products/BR_01/3.jpg`,
    );
  });

  it('resolves a variant as an extract of its crop box, cut out and resized on white', () => {
    vi.stubEnv('VITE_IMAGEKIT_URL_ENDPOINT', ENDPOINT);
    expect(getVariantImageUrl(SHOT, { x: 25, y: 395, w: 350, h: 350 })).toBe(
      `${ENDPOINT}/tr:x-25,y-395,w-350,h-350,cm-extract:e-bgremove:w-256,c-at_max,bg-FFFFFF/baraba_ride/products/BR_01/3.jpg`,
    );
  });

  it('tolerates a trailing slash on the endpoint', () => {
    vi.stubEnv('VITE_IMAGEKIT_URL_ENDPOINT', `${ENDPOINT}/`);
    expect(getProductThumbnailUrl(SHOT)).toMatch(/example\/tr:/);
  });
});

describe('with the endpoint unset', () => {
  it('resolves every image to null', () => {
    vi.stubEnv('VITE_IMAGEKIT_URL_ENDPOINT', '');
    expect(getProductThumbnailUrl(SHOT)).toBeNull();
    expect(getProductShotUrl(SHOT)).toBeNull();
    expect(getVariantImageUrl(SHOT, { x: 0, y: 0, w: 10, h: 10 })).toBeNull();
  });
});

describe('production Content Security Policy', () => {
  it('allows the ImageKit origin in img-src', () => {
    const csp = vercelConfig.headers
      .flatMap((block) => block.headers)
      .find((header) => header.key === 'Content-Security-Policy')!.value;
    const imgSrc = csp.split(';').find((directive) => directive.trim().startsWith('img-src'))!;
    expect(imgSrc.trim().split(/\s+/)).toContain('https://ik.imagekit.io');
  });
});
