import { Injectable, signal, effect, computed, inject } from '@angular/core';
import { UsageService } from '../../core/api/usage.service';
import { KeysService } from '../../core/api/keys.service';
import { ProjectsService } from '../../core/api/projects.service';
import { ToastService } from '../../core/services/toast.service';
import { UsageData, APIKey, Project, DateRange } from '../../core/models';

@Injectable()
export class DashboardState {
  // Inputs (writable).
  readonly scope = signal<'org' | 'project' | 'api_key'>('org');
  readonly scopeId = signal<string>('');
  readonly dateRange = signal<DateRange>(defaultRange());

  // Outputs (read-only).
  readonly data = signal<UsageData | null>(null);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly keys = signal<APIKey[]>([]);
  readonly projects = signal<Project[]>([]);

  readonly needsSelection = computed(() =>
    (this.scope() === 'project' || this.scope() === 'api_key') && !this.scopeId()
  );

  /** ISO 8601 string set when today's data was served from the in-memory cache */
  readonly cachedAt = computed(() => this.data()?.meta.cached_at ?? null);

  constructor(
    private usageSvc: UsageService,
    private keysSvc: KeysService,
    private projectsSvc: ProjectsService,
    private toastSvc: ToastService,
  ) {
    // Load keys and projects once.
    this.keysSvc.getKeys().subscribe({ next: k => this.keys.set(k), error: () => {} });
    this.projectsSvc.getProjects().subscribe({ next: p => this.projects.set(p), error: () => {} });

    // React to filter changes.
    effect(() => {
      const scope = this.scope();
      const scopeId = this.scopeId();
      const { start, end } = this.dateRange();
      if ((scope === 'project' || scope === 'api_key') && !scopeId) {
        this.data.set(null);
        this.error.set(null);
        return;
      }
      this.load(scope, scopeId, start, end);
    });
  }

  load(scope: string, scopeId: string, start: string, end: string, forceRefresh = false): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.usageSvc.getUsage(scope, scopeId, start, end, forceRefresh).subscribe({
      next: data => {
        this.data.set(data);
        this.isLoading.set(false);
        this.toastSvc.show('Data loaded', data.meta.data_source);
      },
      error: err => { this.error.set(err.message ?? 'Failed to load usage data'); this.isLoading.set(false); },
    });
  }

  retry(forceRefresh = false): void {
    const { start, end } = this.dateRange();
    this.load(this.scope(), this.scopeId(), start, end, forceRefresh);
  }
}

function defaultRange(): DateRange {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 29);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}
