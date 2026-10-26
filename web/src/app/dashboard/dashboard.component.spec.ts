import '@angular/compiler';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ChangeDetectorRef, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionService } from '../services/session.service';
import { TasksService } from '../services/tasks.service';
import { DashboardComponent } from './dashboard.component';
import { MemoryStorage } from '../test-helpers/memory-storage';

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn()
  }
}));

describe('DashboardComponent characterization', () => {
  const storage = new MemoryStorage();
  const navigate = vi.fn().mockResolvedValue(true);
  const detectChanges = vi.fn();
  const run = vi.fn((callback: () => void) => callback());

  function createComponent(): DashboardComponent {
    return new DashboardComponent(
      { navigate } as unknown as Router,
      new SessionService(),
      new TasksService(),
      { detectChanges } as ChangeDetectorRef,
      { run } as unknown as NgZone
    );
  }

  beforeEach(() => {
    storage.clear();
    vi.clearAllMocks();
    vi.stubGlobal('localStorage', storage);
  });

  it('redirects to login when there is no token', async () => {
    const component = createComponent();

    await component.ngOnInit();

    expect(navigate).toHaveBeenCalledWith(['/login']);
    expect(axios.get).not.toHaveBeenCalled();
    expect(component.loading).toBe(true);
  });

  it('requests tasks with the stored owner and bearer token, filters and sorts them', async () => {
    storage.setItem('workshop_token', 'test-token');
    storage.setItem(
      'workshop_user',
      JSON.stringify({ username: 'student', displayName: 'Workshop Student' })
    );
    vi.mocked(axios.get).mockResolvedValue({
      data: [
        { id: 1, status: 'TODO', priority: 'LOW', owner: 'student' },
        { id: 2, status: 'IN_PROGRESS', priority: 'HIGH', owner: 'student' },
        { id: 3, status: 'ARCHIVED', priority: 'HIGH', owner: 'student' }
      ]
    });
    const component = createComponent();

    await component.ngOnInit();

    expect(axios.get).toHaveBeenCalledWith(
      'http://localhost:8000/api/tasks?owner=student',
      { headers: { Authorization: 'Bearer test-token' } }
    );
    expect(component.user.displayName).toBe('Workshop Student');
    expect(component.tasks).toHaveLength(3);
    expect(component.visibleTasks.map((task) => task.id)).toEqual([1, 2]);
    expect(component.visibleTasks[0].label).toBe('LOW · STUDENT');
    expect(component.loading).toBe(false);
    expect(detectChanges).toHaveBeenCalled();
    expect(component.statusLabel('TODO')).toBe('Por hacer');
    expect(component.statusLabel('unknown')).toBe('unknown');
  });

  it('shows an error and stops loading when task retrieval fails', async () => {
    storage.setItem('workshop_token', 'test-token');
    storage.setItem('workshop_user', JSON.stringify({ username: 'student' }));
    vi.mocked(axios.get).mockRejectedValue({
      response: { data: { detail: 'Service unavailable' } }
    });
    const component = createComponent();

    await component.ngOnInit();

    expect(component.error).toBe('Service unavailable');
    expect(component.loading).toBe(false);
    expect(detectChanges).toHaveBeenCalled();
  });

  it('shows an invalid-token error without clearing the session or redirecting', async () => {
    storage.setItem('workshop_token', 'invalid-token');
    storage.setItem('workshop_user', JSON.stringify({ username: 'student' }));
    vi.mocked(axios.get).mockRejectedValue({
      response: { status: 401, data: { detail: 'Invalid token' } }
    });
    const component = createComponent();

    await component.ngOnInit();

    expect(component.error).toBe('Invalid token');
    expect(component.loading).toBe(false);
    expect(storage.getItem('workshop_token')).toBe('invalid-token');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('shows a transport timeout error when task retrieval is rejected', async () => {
    storage.setItem('workshop_token', 'test-token');
    storage.setItem('workshop_user', JSON.stringify({ username: 'student' }));
    vi.mocked(axios.get).mockRejectedValue({
      code: 'ECONNABORTED',
      message: 'timeout of 10000ms exceeded'
    });
    const component = createComponent();

    await component.ngOnInit();

    expect(component.error).toBe('timeout of 10000ms exceeded');
    expect(component.loading).toBe(false);
  });

  it('removes token and user on logout while preserving preferences', async () => {
    storage.setItem('workshop_token', 'test-token');
    storage.setItem('workshop_user', JSON.stringify({ username: 'student' }));
    storage.setItem('workshop_preferences', JSON.stringify({ compact: true }));
    const component = createComponent();

    await component.logout();

    expect(storage.getItem('workshop_token')).toBeNull();
    expect(storage.getItem('workshop_user')).toBeNull();
    expect(storage.getItem('workshop_preferences')).toBe(
      JSON.stringify({ compact: true })
    );
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('renders task text with Angular interpolation rather than dynamic HTML', () => {
    const template = readFileSync(
      resolve(process.cwd(), 'src/app/dashboard/dashboard.component.html'),
      'utf8'
    );

    expect(template).toContain('{{ task.title }}');
    expect(template).toContain('{{ task.description }}');
    expect(template).not.toContain('[innerHTML]');
  });
});
