import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

interface LoginResponse {
  token: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private _token = signal<string | null>(localStorage.getItem(this.TOKEN_KEY));

  readonly token = this._token.asReadonly();
  readonly isLoggedIn = computed(() => {
    const t = this._token();
    return !!t && !this.isTokenExpired(t);
  });

  constructor(private http: HttpClient, private router: Router) {
    const stored = localStorage.getItem(this.TOKEN_KEY);
    if (stored && this.isTokenExpired(stored)) {
      this.logout();
    }
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return typeof payload.exp === 'number' && payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, { username, password })
      .pipe(
        tap((res) => {
          this._token.set(res.token);
          localStorage.setItem(this.TOKEN_KEY, res.token);
        })
      );
  }

  logout(): void {
    this._token.set(null);
    localStorage.removeItem(this.TOKEN_KEY);
    this.router.navigate(['/login']);
  }
}
