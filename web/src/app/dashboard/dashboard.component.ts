import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SessionUser, TaskRecord } from '../models';
import { getRequestErrorMessage } from '../services/request-error';
import { SessionService } from '../services/session.service';
import { TasksService } from '../services/tasks.service';
import { formatTaskLabel } from '../utils/legacy-format';

const ARCHIVED_TASK_STATUS = 'ARCHIVED';
const TASKS_ERROR_MESSAGE = 'No se pudo cargar el dashboard';

const STATUS_LABELS: Record<string, string> = {
  TODO: 'Por hacer',
  IN_PROGRESS: 'En progreso',
  DONE: 'Completado',
  RESUELTO: 'Resuelto',
  COMPLETED: 'Completado'
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  tasks: TaskRecord[] = [];
  visibleTasks: TaskRecord[] = [];
  user: SessionUser = {};
  loading = true;
  error = '';

  constructor(
    private router: Router,
    private sessionService: SessionService,
    private tasksService: TasksService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  statusLabel(status: string): string {
    return STATUS_LABELS[(status || '').toUpperCase()] || status;
  }

  async ngOnInit(): Promise<void> {
    const token = this.sessionService.getToken();
    this.user = this.sessionService.getUser();
    if (!token) {
      await this.router.navigate(['/login']);
      return;
    }

    try {
      const tasks = await this.tasksService.getTasks(this.user.username || '', token);
      const visibleTasks = tasks.filter((task) => task.status !== ARCHIVED_TASK_STATUS);
      visibleTasks.forEach((task) => {
        task.label = formatTaskLabel(task);
      });
      visibleTasks.sort((first, second) =>
        first.priority > second.priority ? -1 : 1
      );

      this.zone.run(() => {
        this.tasks = tasks;
        this.visibleTasks = visibleTasks;
        this.loading = false;
        this.cdr.detectChanges();
      });
    } catch (error: unknown) {
      this.zone.run(() => {
        this.error = getRequestErrorMessage(error, 'detail', TASKS_ERROR_MESSAGE);
        this.loading = false;
        this.cdr.detectChanges();
      });
    }
  }
  async logout(): Promise<void> {
    this.sessionService.clearSession();
    await this.router.navigate(['/login']);
  }
}
