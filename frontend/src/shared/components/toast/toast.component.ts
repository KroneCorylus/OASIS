import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.scss',
})
export class ToastComponent {
  readonly toastSvc = inject(ToastService);

  icon(t: Toast): string {
    switch (t.source) {
      case 'database':       return '🗃️';
      case 'cache':          return '🕐';
      case 'live':           return '⚡';
      case 'database+cache': return '🗃️🕐';
      case 'database+live':  return '🗃️⚡';
    }
  }

  label(t: Toast): string {
    switch (t.source) {
      case 'database':       return 'from database';
      case 'cache':          return 'from today cache';
      case 'live':           return 'live from API';
      case 'database+cache': return 'database + today cache';
      case 'database+live':  return 'database + live API';
    }
  }

  /** CSS modifier class — compound sources share a base colour */
  cssClass(t: Toast): string {
    switch (t.source) {
      case 'database+cache': return 'database-cache';
      case 'database+live':  return 'database-live';
      default:               return t.source;
    }
  }

  dismiss(id: number): void {
    this.toastSvc.dismiss(id);
  }

  trackById(_: number, t: Toast): number {
    return t.id;
  }
}
