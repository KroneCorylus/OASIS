import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-page">
      <div class="login-card">
        <div class="login-logo">
          <div class="logo-icon">⬡</div>
          <h1 class="login-title">OpenAI Usage Monitor</h1>
        </div>
        <form (ngSubmit)="onSubmit()" class="login-form">
          <div class="field">
            <label class="field-label">Username</label>
            <input
              type="text"
              class="field-input"
              [(ngModel)]="username"
              name="username"
              autocomplete="username"
              required
            />
          </div>
          <div class="field">
            <label class="field-label">Password</label>
            <input
              type="password"
              class="field-input"
              [(ngModel)]="password"
              name="password"
              autocomplete="current-password"
              required
            />
          </div>
          @if (error()) {
            <div class="error-msg">{{ error() }}</div>
          }
          <button type="submit" class="login-btn" [disabled]="loading()">
            {{ loading() ? 'Signing in...' : 'Sign In' }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0d0f1a;
    }
    .login-card {
      width: 100%;
      max-width: 380px;
      background: #141624;
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 16px;
      padding: 40px;
    }
    .login-logo { text-align: center; margin-bottom: 32px; }
    .logo-icon { font-size: 36px; margin-bottom: 12px; }
    .login-title { font-size: 18px; font-weight: 700; color: #e2e8f0; margin: 0; }
    .login-form { display: flex; flex-direction: column; gap: 16px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field-label { font-size: 13px; color: #94a3b8; }
    .field-input {
      padding: 10px 14px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      color: #e2e8f0;
      font-size: 14px;
    }
    .field-input:focus { outline: none; border-color: rgba(99,102,241,0.5); }
    .error-msg {
      padding: 10px 14px;
      background: rgba(239,68,68,0.1);
      border: 1px solid rgba(239,68,68,0.3);
      border-radius: 8px;
      color: #fca5a5;
      font-size: 13px;
    }
    .login-btn {
      padding: 12px;
      background: #6366f1;
      border: none;
      border-radius: 8px;
      color: #fff;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
      margin-top: 4px;
    }
    .login-btn:hover:not(:disabled) { background: #4f46e5; }
    .login-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  `],
})
export class LoginComponent {
  username = '';
  password = '';
  loading = signal(false);
  error = signal<string | null>(null);

  constructor(private auth: AuthService, private router: Router) {}

  onSubmit(): void {
    if (!this.username || !this.password) return;
    this.loading.set(true);
    this.error.set(null);
    this.auth.login(this.username, this.password).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: () => {
        this.error.set('Invalid username or password');
        this.loading.set(false);
      },
    });
  }
}
