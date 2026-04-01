import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CompareState } from './compare.state';
import { KeySelectorComponent } from './key-selector/key-selector.component';
import { ComparisonTableComponent } from './comparison-table/comparison-table.component';
import { ComparisonChartsComponent } from './comparison-charts.component';
import { DateRangePickerComponent } from '../../shared/components/date-range-picker/date-range-picker.component';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-compare',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    KeySelectorComponent,
    ComparisonTableComponent,
    ComparisonChartsComponent,
    DateRangePickerComponent,
    ErrorMessageComponent,
  ],
  providers: [CompareState],
  template: `
    <div class="page">
      <header class="page-header">
        <div class="header-left">
          <h1 class="page-title">Compare API Keys</h1>
        </div>
        <nav class="header-nav">
          <a routerLink="/dashboard" class="nav-link">Dashboard</a>
          <a routerLink="/compare" class="nav-link active">Compare Keys</a>
          <button class="logout-btn" (click)="logout()">Logout</button>
        </nav>
      </header>

      <div class="controls">
        <app-key-selector
          [keys]="state.keys()"
          [keyA]="state.keyA()"
          [keyB]="state.keyB()"
          (keyAChange)="state.keyA.set($event)"
          (keyBChange)="state.keyB.set($event)">
        </app-key-selector>
        <app-date-range-picker
          [range]="state.dateRange()"
          [cachedAt]="state.cachedAt()"
          (rangeChange)="state.dateRange.set($event)"
          (refresh)="state.retry(true)">
        </app-date-range-picker>
      </div>

      <app-error-message
        [message]="state.error()"
        (retry)="state.retry()">
      </app-error-message>

      @if (state.data()) {
        <div class="compare-meta">
          <span class="meta-item">Period: {{ state.data()!.start }} — {{ state.data()!.end }}</span>
        </div>
      }

      <!-- Table -->
      <div style="margin-top: 16px;">
        <app-comparison-table
          [result]="state.data()"
          [keyAName]="state.keyAName()"
          [keyBName]="state.keyBName()"
          [filteredKeyAData]="state.filteredKeyAData()"
          [filteredKeyBData]="state.filteredKeyBData()"
          [hasExclusions]="state.hasExclusions()"
          [loading]="state.isLoading()"
          (removeA)="state.toggleExcludeA($event)"
          (removeB)="state.toggleExcludeB($event)"
          (resetExclusions)="state.resetExclusions()">
        </app-comparison-table>
      </div>

      <!-- Charts (only when data loaded) -->
      @if (state.data()) {
        <div style="margin-top: 20px;">
          <app-comparison-charts
            [loading]="state.isLoading()"
            [keyAName]="state.keyAName()"
            [keyBName]="state.keyBName()"
            [keyAData]="state.filteredKeyAData()"
            [keyBData]="state.filteredKeyBData()">
          </app-comparison-charts>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { max-width: 1400px; margin: 0 auto; padding: 24px 24px 48px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .page-title { font-size: 22px; font-weight: 700; color: #e2e8f0; margin: 0; }
    .header-nav { display: flex; align-items: center; gap: 16px; }
    .nav-link { color: #94a3b8; text-decoration: none; font-size: 14px; padding: 6px 12px; border-radius: 6px; }
    .nav-link:hover, .nav-link.active { color: #e2e8f0; background: rgba(255,255,255,0.05); }
    .logout-btn { padding: 6px 14px; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); border-radius: 6px; color: #fca5a5; font-size: 13px; cursor: pointer; }
    .logout-btn:hover { background: rgba(239,68,68,0.2); }
    .controls { display: flex; align-items: center; gap: 24px; flex-wrap: wrap; padding: 16px 0; }
    .compare-meta { margin-top: 4px; }
    .meta-item { font-size: 13px; color: #64748b; }
  `],
})
export class CompareComponent {
  constructor(public state: CompareState, private auth: AuthService) {}

  logout(): void {
    this.auth.logout();
  }
}
