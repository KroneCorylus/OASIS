import { Injectable, signal, effect, computed } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { UsageService } from '../../core/api/usage.service';
import { KeysService } from '../../core/api/keys.service';
import { ToastService } from '../../core/services/toast.service';
import { CompareResult, CompareKeyData, CompareModelRow, APIKey, DateRange } from '../../core/models';

@Injectable()
export class CompareState {
  readonly keyA = signal<string>('');
  readonly keyB = signal<string>('');
  readonly dateRange = signal<DateRange>(defaultRange());

  readonly data = signal<CompareResult | null>(null);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly keys = signal<APIKey[]>([]);
  readonly keysLoading = signal(true);

  // Frontend-only model exclusion per key
  readonly excludedA = signal<Set<string>>(new Set<string>());
  readonly excludedB = signal<Set<string>>(new Set<string>());

  readonly keyAName = computed(() => {
    const k = this.keys().find(k => k.id === this.keyA());
    return k ? (k.name || k.redacted_value) : 'Key A';
  });

  readonly keyBName = computed(() => {
    const k = this.keys().find(k => k.id === this.keyB());
    return k ? (k.name || k.redacted_value) : 'Key B';
  });

  // Filtered key data with excluded models removed and totals recalculated
  readonly filteredKeyAData = computed<CompareKeyData | null>(() => {
    const d = this.data();
    if (!d) return null;
    return filterKeyData(d.key_a_data, this.excludedA());
  });

  readonly filteredKeyBData = computed<CompareKeyData | null>(() => {
    const d = this.data();
    if (!d) return null;
    return filterKeyData(d.key_b_data, this.excludedB());
  });

  readonly hasExclusions = computed(() =>
    this.excludedA().size > 0 || this.excludedB().size > 0
  );

  /** ISO 8601 string set when today's data was served from the in-memory cache */
  readonly cachedAt = computed(() => this.data()?.cached_at ?? null);

  constructor(
    private usageSvc: UsageService,
    private keysSvc: KeysService,
    private toastSvc: ToastService,
    private router: Router,
    private route: ActivatedRoute,
  ) {
    // Initialize signals from URL query params.
    const qp = this.route.snapshot.queryParams;
    if (qp['key_a']) this.keyA.set(qp['key_a']);
    if (qp['key_b']) this.keyB.set(qp['key_b']);
    if (qp['start'] && qp['end']) this.dateRange.set({ start: qp['start'], end: qp['end'] });

    this.keysSvc.getKeys().subscribe({
      next: k => { this.keys.set(k); this.keysLoading.set(false); },
      error: () => { this.keysLoading.set(false); },
    });

    // Sync filter state to URL.
    effect(() => {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {
          key_a: this.keyA() || null,
          key_b: this.keyB() || null,
          start: this.dateRange().start,
          end: this.dateRange().end,
        },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    });

    effect(() => {
      const keyA = this.keyA();
      const keyB = this.keyB();
      const { start, end } = this.dateRange();
      if (keyA && keyB && keyA !== keyB) {
        this.load(keyA, keyB, start, end);
      } else {
        this.data.set(null);
      }
    });
  }

  load(keyA: string, keyB: string, start: string, end: string, forceRefresh = false): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.excludedA.set(new Set<string>());
    this.excludedB.set(new Set<string>());
    this.usageSvc.compare(keyA, keyB, start, end, forceRefresh).subscribe({
      next: data => {
        this.data.set(data);
        this.isLoading.set(false);
        this.toastSvc.show('Comparison loaded', data.data_source);
      },
      error: err => { this.error.set(err.message ?? 'Failed to load comparison'); this.isLoading.set(false); },
    });
  }

  retry(forceRefresh = false): void {
    const { start, end } = this.dateRange();
    this.load(this.keyA(), this.keyB(), start, end, forceRefresh);
  }

  toggleExcludeA(model: string): void {
    const s = new Set(this.excludedA());
    if (s.has(model)) s.delete(model); else s.add(model);
    this.excludedA.set(s);
  }

  toggleExcludeB(model: string): void {
    const s = new Set(this.excludedB());
    if (s.has(model)) s.delete(model); else s.add(model);
    this.excludedB.set(s);
  }

  resetExclusions(): void {
    this.excludedA.set(new Set<string>());
    this.excludedB.set(new Set<string>());
  }
}

function filterKeyData(keyData: CompareKeyData, excluded: Set<string>): CompareKeyData {
  if (excluded.size === 0) return keyData;
  const models = keyData.models.filter(m => !excluded.has(m.model));
  return { models, totals: sumModels(models) };
}

function sumModels(models: CompareModelRow[]): CompareModelRow {
  const acc: CompareModelRow = {
    model: 'Total',
    output_tokens: 0, input_cached: 0, input_uncached: 0, input_total: 0,
    cost_output: 0, cost_input_cached: 0, cost_input_uncached: 0, cost_total: 0,
  };
  for (const m of models) {
    acc.output_tokens      += m.output_tokens;
    acc.input_cached       += m.input_cached;
    acc.input_uncached     += m.input_uncached;
    acc.input_total        += m.input_total;
    acc.cost_output        += m.cost_output;
    acc.cost_input_cached  += m.cost_input_cached;
    acc.cost_input_uncached += m.cost_input_uncached;
    acc.cost_total         += m.cost_total;
  }
  return acc;
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
