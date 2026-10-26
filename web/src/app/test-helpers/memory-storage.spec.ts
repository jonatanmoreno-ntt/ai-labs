import { describe, expect, it } from 'vitest';
import { MemoryStorage } from './memory-storage';

describe('MemoryStorage', () => {
  it('stores, retrieves, enumerates, removes, and clears values', () => {
    const storage = new MemoryStorage();

    storage.setItem('token', 'sample-token');
    expect(storage.length).toBe(1);
    expect(storage.getItem('token')).toBe('sample-token');
    expect(storage.key(0)).toBe('token');
    expect(storage.key(1)).toBeNull();

    storage.removeItem('token');
    expect(storage.getItem('token')).toBeNull();
    storage.setItem('user', '{"username":"student"}');
    storage.clear();
    expect(storage.length).toBe(0);
  });
});
