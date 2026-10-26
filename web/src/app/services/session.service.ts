import { Injectable } from '@angular/core';
import merge from 'lodash/merge';
import { AuthenticatedUser, SessionUser, UserPreferences } from '../models';

const TOKEN_STORAGE_KEY = 'workshop_token';
const USER_STORAGE_KEY = 'workshop_user';
const PREFERENCES_STORAGE_KEY = 'workshop_preferences';

@Injectable({ providedIn: 'root' })
export class SessionService {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  }

  getUser(): SessionUser {
    const serializedUser = localStorage.getItem(USER_STORAGE_KEY);
    if (!serializedUser) {
      return {};
    }

    const user: unknown = JSON.parse(serializedUser);
    if (typeof user !== 'object' || user === null) {
      return {};
    }

    const username = (user as Record<string, unknown>).username;
    if (typeof username !== 'string') {
      return {};
    }

    const displayName = (user as Record<string, unknown>).displayName;
    const role = (user as Record<string, unknown>).role;
    return {
      username,
      ...(typeof displayName === 'string' ? { displayName } : {}),
      ...(typeof role === 'string' ? { role } : {})
    };
  }

  loadPreferences(defaults: UserPreferences): UserPreferences {
    const serializedPreferences = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    const preferences: unknown = JSON.parse(serializedPreferences || '{}');
    if (typeof preferences !== 'object' || preferences === null || Array.isArray(preferences)) {
      return defaults;
    }
    return merge({}, defaults, preferences);
  }

  saveLogin(token: string, user: AuthenticatedUser, preferences: UserPreferences): void {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  }

  clearSession(): void {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  }
}
