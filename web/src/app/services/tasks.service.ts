import { Injectable } from '@angular/core';
import axios from 'axios';
import { environment } from '../../environments/environment';
import { TaskRecord } from '../models';

@Injectable({ providedIn: 'root' })
export class TasksService {
  async getTasks(owner: string, token: string): Promise<TaskRecord[]> {
    const response = await axios.get<TaskRecord[]>(
      `${environment.tasksApiUrl}/api/tasks?owner=${owner}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  }
}
