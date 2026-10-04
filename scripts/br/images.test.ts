// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createImageStore, ensureAsset, publishShots, toImageKitLocation } from './images.ts';
import type { ImageStore } from './images.ts';

// The SDK is replaced so the store's own logic runs without touching the network.
const sdk = vi.hoisted(() => ({ list: vi.fn(), upload: vi.fn() }));
vi.mock('@imagekit/nodejs', () => ({
  default: class {
    assets = { list: sdk.list };
    files = { upload: sdk.upload };
  },
  toFile: async (data: Buffer, name: string, options: { type: string }) => ({
    data,
    name,
    type: options.type,
  }),
}));

const SHOT = '/assets/baraba-ride/products/BR-01/3.jpg';

function stubStore(present: boolean) {
  return {
    exists: vi.fn<ImageStore['exists']>(async () => present),
    upload: vi.fn<ImageStore['upload']>(async () => {}),
  } satisfies ImageStore;
}

describe('toImageKitLocation', () => {
  it('splits an asset path into its ImageKit folder and file name', () => {
    expect(toImageKitLocation(SHOT)).toEqual({
      folder: '/baraba_ride/products/BR_01',
      fileName: '3.jpg',
    });
  });
});

describe('createImageStore', () => {
  it('is disabled when no private key is configured', () => {
    expect(createImageStore({})).toBeNull();
    expect(createImageStore({ IMAGEKIT_PRIVATE_KEY: '  ' })).toBeNull();
  });

  it('ignores a VITE_-prefixed private key', () => {
    expect(createImageStore({ VITE_IMAGEKIT_PRIVATE_KEY: 'private_example' })).toBeNull();
  });

  it('is enabled by IMAGEKIT_PRIVATE_KEY', () => {
    expect(createImageStore({ IMAGEKIT_PRIVATE_KEY: 'private_example' })).not.toBeNull();
  });

  it('finds an asset by name in its folder, listing each folder once', async () => {
    sdk.list.mockReset().mockResolvedValue([{ name: '3.jpg' }, { type: 'folder' }]);
    const store = createImageStore({ IMAGEKIT_PRIVATE_KEY: 'private_example' })!;

    expect(await store.exists(SHOT)).toBe(true);
    expect(await store.exists('/assets/baraba-ride/products/BR-01/4.jpg')).toBe(false);
    expect(sdk.list).toHaveBeenCalledTimes(1);
    expect(sdk.list).toHaveBeenCalledWith({
      path: '/baraba_ride/products/BR_01',
      type: 'file',
      limit: 100,
    });

    await store.exists('/assets/baraba-ride/products/BR-07/1.jpg');
    expect(sdk.list).toHaveBeenCalledTimes(2);
  });

  it('uploads to the mapped folder under the exact file name', async () => {
    sdk.upload.mockReset().mockResolvedValue({});
    const data = Buffer.from('shot');
    const store = createImageStore({ IMAGEKIT_PRIVATE_KEY: 'private_example' })!;

    await store.upload(SHOT, data);
    expect(sdk.upload).toHaveBeenCalledWith({
      file: { data, name: '3.jpg', type: 'image/jpeg' },
      fileName: '3.jpg',
      folder: '/baraba_ride/products/BR_01',
      useUniqueFileName: false,
    });
  });
});

describe('ensureAsset', () => {
  const data = Buffer.from('shot');

  it('skips an asset that is already present, without fetching it', async () => {
    const store = stubStore(true);
    const fetchBuffer = vi.fn(async () => data);
    expect(await ensureAsset(store, SHOT, fetchBuffer)).toBe('skipped');
    expect(fetchBuffer).not.toHaveBeenCalled();
    expect(store.upload).not.toHaveBeenCalled();
  });

  it('fetches and uploads an asset that is absent', async () => {
    const store = stubStore(false);
    expect(await ensureAsset(store, SHOT, async () => data)).toBe('uploaded');
    expect(store.upload).toHaveBeenCalledWith(SHOT, data);
  });

  it('uploads a present asset again when re-upload is requested', async () => {
    const store = stubStore(true);
    expect(await ensureAsset(store, SHOT, async () => data, { reupload: true })).toBe('uploaded');
    expect(store.exists).not.toHaveBeenCalled();
    expect(store.upload).toHaveBeenCalledWith(SHOT, data);
  });

  it('propagates a failed fetch or upload', async () => {
    const store = stubStore(false);
    await expect(
      ensureAsset(store, SHOT, async () => {
        throw new Error('responded 404');
      }),
    ).rejects.toThrow('responded 404');

    store.upload.mockRejectedValueOnce(new Error('quota exceeded'));
    await expect(ensureAsset(store, SHOT, async () => data)).rejects.toThrow('quota exceeded');
  });
});

describe('publishShots', () => {
  const data = Buffer.from('shot');
  const shots = new Map([
    ['BR-01', ['https://example.com/a.jpg', 'https://example.com/b.jpg']],
    ['BR-07', ['https://example.com/c.jpg']],
  ]);

  it('uploads absent shots to their asset paths and reports the totals', async () => {
    const store = stubStore(false);
    const log = vi.fn();
    await publishShots(store, shots, async () => data, { log });
    expect(store.upload.mock.calls.map(([path]) => path)).toEqual([
      '/assets/baraba-ride/products/BR-01/1.jpg',
      '/assets/baraba-ride/products/BR-01/2.jpg',
      '/assets/baraba-ride/products/BR-07/1.jpg',
    ]);
    expect(log).toHaveBeenLastCalledWith('Shots: 3 uploaded, 0 already on the image CDN');
  });

  it('downloads nothing when every shot is already present', async () => {
    const fetchImage = vi.fn(async () => data);
    const log = vi.fn();
    await publishShots(stubStore(true), shots, fetchImage, { log });
    expect(fetchImage).not.toHaveBeenCalled();
    expect(log).toHaveBeenLastCalledWith('Shots: 0 uploaded, 3 already on the image CDN');
  });

  it('skips uploads with a notice when no credentials are configured', async () => {
    const fetchImage = vi.fn(async () => data);
    const log = vi.fn();
    await expect(publishShots(null, shots, fetchImage, { log })).resolves.toBeUndefined();
    expect(fetchImage).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith('Image uploads skipped (IMAGEKIT_PRIVATE_KEY not set)');
  });

  it('fails naming the product and shot when an upload fails, and stops there', async () => {
    const store = stubStore(false);
    store.upload
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('quota exceeded'));
    await expect(publishShots(store, shots, async () => data, { log: vi.fn() })).rejects.toThrow(
      'BR-01 shot 2: quota exceeded',
    );
    expect(store.upload).toHaveBeenCalledTimes(2);
  });

  it('fails naming the product and shot when a download fails', async () => {
    const fetchImage = async () => {
      throw new Error('https://example.com/a.jpg responded 404');
    };
    await expect(
      publishShots(stubStore(false), shots, fetchImage, { log: vi.fn() }),
    ).rejects.toThrow('BR-01 shot 1: https://example.com/a.jpg responded 404');
  });
});

describe('upload key exposure', () => {
  const ROOT = join(import.meta.dirname, '..', '..');
  const sourceFiles = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory() ? sourceFiles(join(dir, entry.name)) : [join(dir, entry.name)],
    );

  // Vite inlines only the import.meta.env variables that client code names, so
  // a key never named under src/ cannot reach the bundle.
  it('is never referenced by client code', () => {
    const offenders = sourceFiles(join(ROOT, 'src')).filter((file) =>
      /IMAGEKIT_PRIVATE|IMAGEKIT_PUBLIC/.test(readFileSync(file, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });

  it('has no VITE_-prefixed spelling in the env template', () => {
    expect(readFileSync(join(ROOT, '.env.example'), 'utf8')).not.toMatch(/VITE_IMAGEKIT_PRIVATE/);
  });
});
