import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MetricCardComponent } from '../../../shared/components/metric-card/metric-card.component';
import { UsageTotals } from '../../../core/models';
import { FormatCostPipe } from '../../../shared/pipes/format-cost.pipe';
import { FormatTokensPipe } from '../../../shared/pipes/format-tokens.pipe';

@Component({
  selector: 'app-summary-cards',
  standalone: true,
  imports: [CommonModule, MetricCardComponent, FormatCostPipe, FormatTokensPipe],
  template: `
    <div class="cards-grid">
      <app-metric-card
        label="Total Cost"
        [value]="totals ? (totals.cost_usd | formatCost) : ''"
        [loading]="loading"
        tooltip="Total estimated cost in USD">
      </app-metric-card>
      <app-metric-card
        label="Total Tokens"
        [value]="totals ? ((totals.input_cached + totals.input_uncached + totals.output_tokens) | formatTokens) : ''"
        [loading]="loading"
        tooltip="Sum of all input and output tokens">
      </app-metric-card>
      <app-metric-card
        label="Cached Input"
        [value]="totals ? (totals.input_cached | formatTokens) : ''"
        [loading]="loading"
        tooltip="Tokens served from prompt cache">
      </app-metric-card>
      <app-metric-card
        label="Uncached Input"
        [value]="totals ? (totals.input_uncached | formatTokens) : ''"
        [loading]="loading"
        tooltip="Tokens not served from cache">
      </app-metric-card>
      <app-metric-card
        label="Output Tokens"
        [value]="totals ? (totals.output_tokens | formatTokens) : ''"
        [loading]="loading"
        tooltip="Generated output tokens">
      </app-metric-card>
      <app-metric-card
        label="Cache Hit %"
        [value]="totals ? (totals.cache_ratio * 100 | number:'1.1-1') + '%' : ''"
        [loading]="loading"
        tooltip="Percentage of input tokens served from cache">
      </app-metric-card>
      <app-metric-card
        label="Requests"
        [value]="totals ? (totals.requests | formatTokens) : ''"
        [loading]="loading"
        tooltip="Total API requests">
      </app-metric-card>
    </div>
  `,
  styles: [`
    .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
  `],
})
export class SummaryCardsComponent {
  @Input() totals: UsageTotals | null = null;
  @Input() loading = false;
}
