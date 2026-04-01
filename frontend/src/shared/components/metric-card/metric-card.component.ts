import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonComponent } from '../skeleton/skeleton.component';
import { TooltipDirective } from '../tooltip/tooltip.directive';

@Component({
  selector: 'app-metric-card',
  standalone: true,
  imports: [CommonModule, SkeletonComponent, TooltipDirective],
  template: `
    <div class="metric-card">
      <div class="metric-label" [appTooltip]="tooltip">{{ label }}</div>
      @if (loading) {
        <app-skeleton height="32px" width="120px"></app-skeleton>
      } @else {
        <div class="metric-value">{{ value }}</div>
      }
      @if (sub && !loading) {
        <div class="metric-sub">{{ sub }}</div>
      }
    </div>
  `,
  styles: [`
    .metric-card {
      background: #141624;
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 12px;
      padding: 20px;
      min-width: 160px;
    }
    .metric-label {
      font-size: 13px;
      color: #8892a0;
      margin-bottom: 8px;
      cursor: default;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .metric-value {
      font-size: 26px;
      font-weight: 600;
      color: #e2e8f0;
      line-height: 1;
    }
    .metric-sub {
      font-size: 12px;
      color: #64748b;
      margin-top: 4px;
    }
  `],
})
export class MetricCardComponent {
  @Input() label = '';
  @Input() value = '';
  @Input() sub = '';
  @Input() loading = false;
  @Input() tooltip = '';
}
