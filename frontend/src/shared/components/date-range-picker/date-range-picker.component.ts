import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DateRange } from '../../../core/models';

@Component({
  selector: 'app-date-range-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="date-range-picker">
      <div class="presets">
        @for (preset of presets; track preset.label) {
          <button
            class="preset-btn"
            [class.active]="activePreset === preset.label"
            [class.live]="isLivePreset(preset)"
            (click)="applyPreset(preset)">
            {{ preset.label }}@if (isLivePreset(preset)) { <span class="live-dot"></span> }
          </button>
        }
      </div>

      @if (activePreset !== 'Today') {
        <div class="inputs">
          <input type="date" [(ngModel)]="startVal" (change)="onInputChange()" class="date-input" />
          <span class="separator">—</span>
          <input type="date" [(ngModel)]="endVal" (change)="onInputChange()" class="date-input" />
        </div>
      }

      @if (endsToday) {
        <button class="refresh-btn" (click)="onRefresh()" [title]="refreshTitle">
          <svg class="refresh-icon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13.65 2.35A7.96 7.96 0 0 0 8 0C3.58 0 .01 3.58.01 8S3.58 16 8 16c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 8 14 6 6 0 1 1 8 2c1.66 0 3.14.69 4.22 1.78L9 7h7V0l-2.35 2.35z" fill="currentColor"/>
          </svg>
          @if (cachedAt) {
            <span>{{ cachedAgoLabel }}</span>
          } @else {
            <span>Refresh</span>
          }
        </button>
      }
    </div>
  `,
  styles: [`
    .date-range-picker { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .presets { display: flex; gap: 6px; }
    .preset-btn {
      padding: 5px 12px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 20px;
      color: #94a3b8;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .preset-btn:hover, .preset-btn.active {
      background: rgba(99,102,241,0.15);
      border-color: rgba(99,102,241,0.4);
      color: #a5b4fc;
    }
    .preset-btn.live {
      background: rgba(34,197,94,0.12);
      border-color: rgba(34,197,94,0.4);
      color: #86efac;
    }
    .preset-btn.live:hover, .preset-btn.live.active {
      background: rgba(34,197,94,0.2);
      border-color: rgba(34,197,94,0.5);
      color: #86efac;
    }
    .live-dot {
      display: inline-block;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #22c55e;
      margin-left: 4px;
      animation: pulse-dot 2s ease-in-out infinite;
    }
    @keyframes pulse-dot {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    .inputs { display: flex; align-items: center; gap: 8px; }
    .date-input {
      padding: 5px 10px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 6px;
      color: #e2e8f0;
      font-size: 13px;
      color-scheme: dark;
    }
    .separator { color: #64748b; }
    .refresh-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 5px 14px;
      background: rgba(34,197,94,0.1);
      border: 1px solid rgba(34,197,94,0.3);
      border-radius: 20px;
      color: #86efac;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .refresh-btn:hover {
      background: rgba(34,197,94,0.2);
      border-color: rgba(34,197,94,0.5);
    }
    .refresh-icon { width: 12px; height: 12px; flex-shrink: 0; }
  `],
})
export class DateRangePickerComponent implements OnInit, OnDestroy {
  @Input() set range(r: DateRange) {
    this.startVal = r.start;
    this.endVal = r.end;
  }
  /** ISO 8601 timestamp of when today's cache entry was populated. */
  @Input() cachedAt: string | null = null;

  @Output() rangeChange = new EventEmitter<DateRange>();
  @Output() refresh = new EventEmitter<void>();

  startVal = '';
  endVal = '';
  activePreset = 'Last 30d';

  // Ticks every 30 s so the "X ago" label stays current.
  private readonly now = signal(Date.now());
  private tickInterval?: ReturnType<typeof setInterval>;

  presets: { label: string; days: number }[] = [
    { label: 'Today', days: 0 },
    { label: 'Last 7d', days: 7 },
    { label: 'Last 30d', days: 30 },
    { label: 'Last 90d', days: 90 },
  ];

  ngOnInit(): void {
    if (!this.startVal || !this.endVal) {
      this.applyPreset(this.presets[2]); // Last 30d
    }
    this.tickInterval = setInterval(() => this.now.set(Date.now()), 30_000);
  }

  ngOnDestroy(): void {
    clearInterval(this.tickInterval);
  }

  /** True whenever the selected end date equals today — triggers refresh button. */
  get endsToday(): boolean {
    return this.endVal === this.today;
  }

  get cachedAgoLabel(): string {
    if (!this.cachedAt) return 'Refresh';
    const diffMs = this.now() - new Date(this.cachedAt).getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1) return 'cached just now';
    if (diffMin === 1) return 'cached 1 min ago';
    return `cached ${diffMin} min ago`;
  }

  get refreshTitle(): string {
    return this.cachedAt
      ? `Today's data is cached. Click to force a fresh API request.`
      : `Fetch latest data from the OpenAI API`;
  }

  applyPreset(preset: { label: string; days: number }): void {
    this.activePreset = preset.label;
    const end = new Date();
    const start = new Date();
    if (preset.days > 0) {
      start.setDate(start.getDate() - (preset.days - 1));
    }
    this.endVal = this.fmt(end);
    this.startVal = this.fmt(start);
    this.rangeChange.emit({ start: this.startVal, end: this.endVal });
  }

  onInputChange(): void {
    this.activePreset = '';
    if (this.startVal && this.endVal) {
      this.rangeChange.emit({ start: this.startVal, end: this.endVal });
    }
  }

  onRefresh(): void {
    this.refresh.emit();
  }

  isLivePreset(preset: { label: string }): boolean {
    return preset.label === 'Today';
  }

  private get today(): string {
    return new Date().toISOString().split('T')[0];
  }

  private fmt(d: Date): string {
    return d.toISOString().split('T')[0];
  }
}
