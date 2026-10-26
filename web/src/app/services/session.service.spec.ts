import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthenticatedUser, UserPreferences } from '../models';
import { MemoryStorage } from '../test-helpers/memory-storage';
import { SessionService } from './session.service';

describe('SessionService', () => {
  const storage = new MemoryStorage();
  const service = new SessionService();
  const defaults: UserPreferences = {
    theme: 'light',
    showTips: true,
    compact: false
  };

  beforeEach(() => {
    storage.clear();
    vi.stubGlobal('localStorage', storage);
  });

  it('returns an empty user for missing or invalid stored user data', () => {
    expect(service.getUser()).toEqual({});
    storage.setItem('workshop_user', 'null');
    expect(service.getUser()).toEqual({});
    storage.setItem('workshop_user', JSON.stringify({ displayName: 'No username' }));
    expect(service.getUser()).toEqual({});
  });

  it('returns stored identity fields when available', () => {
    storage.setItem(
      'workshop_user',
      JSON.stringify({ username: 'student', displayName: 'Student', role: 'USER' })
    );

    expect(service.getUser()).toEqual({
      username: 'student',
      displayName: 'Student',
      role: 'USER'
    });
  });

  it('loads defaults for non-object preferences and merges saved preferences', () => {
    storage.setItem('workshop_preferences', 'null');
    expect(service.loadPreferences(defaults)).toEqual(defaults);

    storage.setItem(
      'workshop_preferences',
      JSON.stringify({ compact: true, theme: 'dark' })
    );
    expect(service.loadPreferences(defaults)).toEqual({
      theme: 'dark',
      showTips: true,
      compact: true
    });
  });

  it('stores the login session and clears session values without preferences', () => {
    const user: AuthenticatedUser = {
      username: 'student',
      displayName: 'Student',
      role: 'USER'
    };

    service.saveLogin('test-token', user, { ...defaults, compact: true });
    expect(service.getToken()).toBe('test-token');
    expect(service.getUser()).toEqual(user);

    service.clearSession();
    expect(service.getToken()).toBeNull();
    expect(service.getUser()).toEqual({});
    expect(storage.getItem('workshop_preferences')).toBe(
      JSON.stringify({ ...defaults, compact: true })
    );
  });
});
