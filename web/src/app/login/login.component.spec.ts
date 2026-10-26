import '@angular/compiler';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Router } from '@angular/router';
import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../services/auth.service';
import { SessionService } from '../services/session.service';
import { LoginComponent } from './login.component';
import { MemoryStorage } from '../test-helpers/memory-storage';

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn()
  }
}));

describe('LoginComponent characterization', () => {
  const storage = new MemoryStorage();
  const navigate = vi.fn().mockResolvedValue(true);

  function createComponent(): LoginComponent {
    return new LoginComponent(
      { navigate } as unknown as Router,
      new AuthService(),
      new SessionService()
    );
  }

  beforeEach(() => {
    storage.clear();
    vi.clearAllMocks();
    vi.stubGlobal('localStorage', storage);
  });

  it('merges saved preferences with defaults', () => {
    storage.setItem('workshop_preferences', JSON.stringify({ compact: true }));

    const component = createComponent();

    expect(component.preferences).toEqual({
      theme: 'light',
      showTips: true,
      compact: true
    });
  });

  it('continues with default preferences when saved JSON is invalid', () => {
    storage.setItem('workshop_preferences', '{');
    vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const component = createComponent();

    expect(component.preferences).toEqual({
      theme: 'light',
      showTips: true,
      compact: false
    });
    expect(console.log).toHaveBeenCalled();
  });

  it('validates empty username and password without calling the backend', async () => {
    const component = createComponent();

    await component.login();
    expect(component.message?.title).toBe('Ingrese un usuario.');
    expect(axios.post).not.toHaveBeenCalled();

    component.username = 'student';
    await component.login();
    expect(component.message?.title).toBe('Ingrese una contraseña.');
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('sends the existing login request and persists the returned session', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: {
        token: 'test-token',
        user: { username: 'student', displayName: 'Workshop Student' }
      }
    });
    const component = createComponent();
    component.username = 'student';
    component.password = 'Workshop123!';
    component.preferences = { theme: 'dark', showTips: false, compact: true };

    await component.login();

    expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:8080/auth/login',
      { username: 'student', password: 'Workshop123!', client: 'angular-workshop' },
      { timeout: 5000 }
    );
    expect(storage.getItem('workshop_token')).toBe('test-token');
    expect(storage.getItem('workshop_user')).toBe(
      JSON.stringify({ username: 'student', displayName: 'Workshop Student' })
    );
    expect(storage.getItem('workshop_preferences')).toBe(
      JSON.stringify({ theme: 'dark', showTips: false, compact: true })
    );
    expect(navigate).toHaveBeenCalledWith(['/dashboard']);
    expect(component.busy).toBe(false);
  });

  it('shows a message when the backend response has no token', async () => {
    vi.mocked(axios.post).mockResolvedValue({ data: {} });
    const component = createComponent();
    component.username = 'student';
    component.password = 'bad-password';

    await component.login();

    expect(component.message?.title).toBe('El backend respondió sin token.');
    expect(storage.getItem('workshop_token')).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('shows the backend error detail on failed login', async () => {
    vi.mocked(axios.post).mockRejectedValue({
      response: { data: { message: 'Invalid credentials' } }
    });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const component = createComponent();
    component.username = 'student';
    component.password = 'bad-password';

    await component.login();

    expect(component.message?.title).toBe('No se pudo autenticar a student.');
    expect(component.message?.detail).toBe('Invalid credentials');
    expect(component.busy).toBe(false);
  });

  it('shows an unavailable authentication service response', async () => {
    vi.mocked(axios.post).mockRejectedValue({
      response: { status: 503, data: { message: 'Service unavailable' } }
    });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const component = createComponent();
    component.username = 'student';
    component.password = 'Workshop123!';

    await component.login();

    expect(component.message?.title).toBe('No se pudo autenticar a student.');
    expect(component.message?.detail).toBe('Service unavailable');
    expect(component.busy).toBe(false);
  });

  it('shows the transport timeout message when login exceeds its configured timeout', async () => {
    vi.mocked(axios.post).mockRejectedValue({
      code: 'ECONNABORTED',
      message: 'timeout of 5000ms exceeded'
    });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const component = createComponent();
    component.username = 'student';
    component.password = 'Workshop123!';

    await component.login();

    expect(component.message?.detail).toBe('timeout of 5000ms exceeded');
    expect(component.busy).toBe(false);
  });

  it('renders dynamic login messages through text interpolation', () => {
    const template = readFileSync(
      resolve(process.cwd(), 'src/app/login/login.component.html'),
      'utf8'
    );

    expect(template).toContain('{{ message.title }}');
    expect(template).toContain('{{ message.detail }}');
    expect(template).not.toContain('[innerHTML]');
  });
});
