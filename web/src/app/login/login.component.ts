import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthenticatedUser, LoginMessage, LoginRequest, UserPreferences } from '../models';
import { AuthService } from '../services/auth.service';
import { getRequestErrorMessage } from '../services/request-error';
import { SessionService } from '../services/session.service';

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'light',
  showTips: true,
  compact: false
};
const LOGIN_CLIENT = 'angular-workshop';
const LOGIN_ERROR_MESSAGE = 'Error desconocido';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  username = '';
  password = '';
  busy = false;
  message: LoginMessage | null = null;
  preferences: UserPreferences = DEFAULT_PREFERENCES;

  constructor(
    private router: Router,
    private authService: AuthService,
    private sessionService: SessionService
  ) {
    try {
      this.preferences = this.sessionService.loadPreferences(DEFAULT_PREFERENCES);
    } catch (error) {
      console.log('Preferences could not be loaded', error);
    }
  }

  async login(): Promise<void> {
    this.message = null;
    if (!this.username.trim()) {
      this.message = { title: 'Ingrese un usuario.' };
      return;
    }

    if (!this.password.trim()) {
      this.message = { title: 'Ingrese una contraseña.' };
      return;
    }

    this.busy = true;
    try {
      const request: LoginRequest = {
        username: this.username,
        password: this.password,
        client: LOGIN_CLIENT
      };
      const response = await this.authService.login(request);
      if (!response.token) {
        this.message = { title: 'El backend respondió sin token.' };
        return;
      }

      const user: AuthenticatedUser = response.user;
      this.sessionService.saveLogin(response.token, user, this.preferences);
      await this.router.navigate(['/dashboard']);
    } catch (error: unknown) {
      this.message = {
        title: `No se pudo autenticar a ${this.username}.`,
        detail: getRequestErrorMessage(error, 'message', LOGIN_ERROR_MESSAGE)
      };
      console.error(error);
    } finally {
      this.busy = false;
    }
  }
}
