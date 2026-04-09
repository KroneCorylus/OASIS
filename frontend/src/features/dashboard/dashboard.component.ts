import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardState } from './dashboard.state';
import { FilterBarComponent } from './filter-bar/filter-bar.component';
import { SummaryCardsComponent } from './summary-cards/summary-cards.component';
import { TokenTimeseriesComponent } from './charts/token-timeseries/token-timeseries.component';
import { CostTimeseriesComponent } from './charts/cost-timeseries/cost-timeseries.component';
import { ModelBreakdownPieComponent } from './charts/model-breakdown-pie/model-breakdown-pie.component';
import { CacheRatioBarComponent } from './charts/cache-ratio-bar/cache-ratio-bar.component';
import { RequestsPerDayComponent } from './charts/requests-per-day/requests-per-day.component';
import { CostBreakdownComponent } from './charts/cost-breakdown/cost-breakdown.component';
import { TokenCostProportionComponent } from './charts/token-cost-proportion/token-cost-proportion.component';
import { ErrorMessageComponent } from '../../shared/components/error-message/error-message.component';
import { AuthService } from '../../core/auth/auth.service';
import { DateRange } from '../../core/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FilterBarComponent,
    SummaryCardsComponent,
    TokenTimeseriesComponent,
    CostTimeseriesComponent,
    ModelBreakdownPieComponent,
    CacheRatioBarComponent,
    RequestsPerDayComponent,
    CostBreakdownComponent,
    TokenCostProportionComponent,
    ErrorMessageComponent,
  ],
  providers: [DashboardState],
  template: `
    <div class="page">
      <header class="page-header">
        <div class="header-left">
          <h1 class="page-title">OpenAI Usage Monitor</h1>
        </div>
        <nav class="header-nav">
          <a routerLink="/dashboard" class="nav-link active">Dashboard</a>
          <a routerLink="/compare" class="nav-link">Compare Keys</a>
          <button class="logout-btn" (click)="logout()">Logout</button>
        </nav>
      </header>

      <app-filter-bar
        [scope]="state.scope()"
        [scopeId]="state.scopeId()"
        [dateRange]="state.dateRange()"
        [keys]="state.keys()"
        [projects]="state.projects()"
        [cachedAt]="state.cachedAt()"
        (scopeChange)="state.scope.set($event)"
        (scopeIdChange)="state.scopeId.set($event)"
        (dateRangeChange)="state.dateRange.set($event)"
        (refreshChange)="state.retry(true)">
      </app-filter-bar>

      <app-error-message
        [message]="state.error()"
        (retry)="state.retry()">
      </app-error-message>

      @if (state.needsSelection()) {
        <div class="empty-state">
          <svg class="empty-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
          </svg>
          <p class="empty-title">No {{ state.scope() === 'project' ? 'project' : 'API key' }} selected</p>
          <p class="empty-subtitle">Select a {{ state.scope() === 'project' ? 'project' : 'key' }} from the filter above to view usage data.</p>
        </div>
      } @else {
        <app-summary-cards
          [totals]="state.data()?.totals ?? null"
          [loading]="state.isLoading()">
        </app-summary-cards>

        <div class="charts-grid">
          <app-token-timeseries
            [byDate]="state.data()?.by_date ?? []"
            [loading]="state.isLoading()">
          </app-token-timeseries>

          <app-cost-timeseries
            [byDate]="state.data()?.by_date ?? []"
            [loading]="state.isLoading()">
          </app-cost-timeseries>

          <app-model-breakdown-pie
            [byModel]="state.data()?.by_model ?? []"
            [loading]="state.isLoading()">
          </app-model-breakdown-pie>

          <app-requests-per-day
            [byDate]="state.data()?.by_date ?? []"
            [loading]="state.isLoading()">
          </app-requests-per-day>

          <app-cost-breakdown
            [byDate]="state.data()?.by_date ?? []"
            [loading]="state.isLoading()">
          </app-cost-breakdown>

          <app-cache-ratio-bar
            [byDate]="state.data()?.by_date ?? []"
            [loading]="state.isLoading()">
          </app-cache-ratio-bar>
        </div>

        <app-token-cost-proportion
          class="full-width-chart"
          [byModel]="state.data()?.by_model ?? []"
          [loading]="state.isLoading()">
        </app-token-cost-proportion>
      }
    </div>
  `,
  styles: [`
    .page { max-width: 1400px; margin: 0 auto; padding: 24px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .page-title { font-size: 22px; font-weight: 700; color: #e2e8f0; margin: 0; }
    .header-nav { display: flex; align-items: center; gap: 16px; }
    .nav-link { color: #94a3b8; text-decoration: none; font-size: 14px; padding: 6px 12px; border-radius: 6px; }
    .nav-link:hover, .nav-link.active { color: #e2e8f0; background: rgba(255,255,255,0.05); }
    .logout-btn { padding: 6px 14px; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); border-radius: 6px; color: #fca5a5; font-size: 13px; cursor: pointer; }
    .logout-btn:hover { background: rgba(239,68,68,0.2); }
    .charts-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(500px, 1fr)); gap: 16px; margin-top: 16px; }
    app-summary-cards { display: block; margin-top: 16px; }
    app-error-message { display: block; margin-top: 8px; }
    .full-width-chart { display: block; margin-top: 16px; }
    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 24px; gap: 12px; color: #64748b; }
    .empty-icon { width: 48px; height: 48px; color: #475569; }
    .empty-title { margin: 0; font-size: 16px; font-weight: 600; color: #94a3b8; }
    .empty-subtitle { margin: 0; font-size: 14px; color: #64748b; }
  `],
})
export class DashboardComponent {
  constructor(public state: DashboardState, private auth: AuthService) {}

  logout(): void {
    this.auth.logout();
  }
}
