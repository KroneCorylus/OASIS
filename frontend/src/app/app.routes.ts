import { Routes } from '@angular/router';
import { authGuard } from '../core/auth/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('../features/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('../features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'compare',
    canActivate: [authGuard],
    loadComponent: () =>
      import('../features/compare/compare.component').then((m) => m.CompareComponent),
  },
  { path: '**', redirectTo: '/dashboard' },
];
