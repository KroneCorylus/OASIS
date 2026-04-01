import { Injectable, signal } from '@angular/core';

export type DataSource = 'database' | 'cache' | 'live' | 'database+cache' | 'database+live';

export interface Toast {
  id: number;
  message: string;
  source: DataSource;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);

  private nextId = 0;

  show(message: string, source: DataSource, duration = 3500): void {
    const id = ++this.nextId;
    this.toasts.update(list => [...list, { id, message, source }]);
    setTimeout(() => this.dismiss(id), duration);
  }

  dismiss(id: number): void {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }
}
