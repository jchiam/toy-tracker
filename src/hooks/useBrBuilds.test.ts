import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useBrBuilds } from './useBrBuilds';
import * as service from '@/services/br/builds';
import { makeBuild } from '@/test/br-builds';

vi.mock('@/services/br/builds', () => ({
  listBuilds: vi.fn(),
  createBuild: vi.fn(),
  updateBuild: vi.fn(),
  deleteBuild: vi.fn(),
  setPlanPositions: vi.fn(),
  clearPlanPosition: vi.fn(),
  swapBuiltPosition: vi.fn(),
  markBuilt: vi.fn(),
  takeApart: vi.fn(),
}));

const listBuilds = vi.mocked(service.listBuilds);
const createBuild = vi.mocked(service.createBuild);
const markBuilt = vi.mocked(service.markBuilt);

const plan = makeBuild({ id: 'b1', name: 'Red Dash' });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useBrBuilds', () => {
  it('loads the user’s builds', async () => {
    listBuilds.mockResolvedValue([plan]);

    const { result } = renderHook(() => useBrBuilds('u'));
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.builds).toEqual([plan]);
    expect(result.current.error).toBeNull();
    expect(listBuilds).toHaveBeenCalledWith('u');
  });

  it('exposes the load error and stops loading', async () => {
    listBuilds.mockRejectedValue(new Error('Could not load builds: down'));

    const { result } = renderHook(() => useBrBuilds('u'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Could not load builds: down');
  });

  it('clears an earlier error once a load succeeds', async () => {
    listBuilds.mockRejectedValueOnce(new Error('Could not load builds: down'));
    const { result } = renderHook(() => useBrBuilds('u'));
    await waitFor(() => expect(result.current.error).not.toBeNull());

    listBuilds.mockResolvedValue([plan]);
    await act(() => result.current.actions.reload());
    expect(result.current.error).toBeNull();
    expect(result.current.builds).toEqual([plan]);
  });

  it('refetches after a write and hands back what the write returned', async () => {
    listBuilds.mockResolvedValueOnce([]);
    const { result } = renderHook(() => useBrBuilds('u'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    createBuild.mockResolvedValue(plan);
    listBuilds.mockResolvedValueOnce([plan]);
    let created;
    await act(async () => {
      created = await result.current.actions.createBuild('Red Dash');
    });

    expect(createBuild).toHaveBeenCalledWith('u', 'Red Dash');
    expect(created).toBe(plan);
    expect(result.current.builds).toEqual([plan]);
    expect(listBuilds).toHaveBeenCalledTimes(2);
  });

  it('keeps the shown builds and reports the message when a write fails', async () => {
    listBuilds.mockResolvedValue([plan]);
    const { result } = renderHook(() => useBrBuilds('u'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    markBuilt.mockRejectedValue(new Error('Could not mark built: duplicate key'));
    await act(async () => {
      await expect(result.current.actions.markBuilt('b1', {})).rejects.toThrow('duplicate key');
    });

    expect(result.current.builds).toEqual([plan]);
    expect(result.current.error).toBe('Could not mark built: duplicate key');
    expect(listBuilds).toHaveBeenCalledTimes(1);
  });
});
