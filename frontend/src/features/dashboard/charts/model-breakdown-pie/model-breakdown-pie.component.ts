import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxEchartsDirective } from 'ngx-echarts';
import { EChartsOption } from 'echarts';
import { ModelTotal } from '../../../../core/models';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';

const COLORS = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#14b8a6'];

@Component({
  selector: 'app-model-breakdown-pie',
  standalone: true,
  imports: [CommonModule, NgxEchartsDirective, SkeletonComponent],
  template: `
    <div class="chart-card">
      <h3 class="chart-title">Cost by Model</h3>
      @if (loading) {
        <app-skeleton height="300px"></app-skeleton>
      } @else {
        <div echarts [options]="chartOption()" style="height:300px"></div>
      }
    </div>
  `,
  styles: [`
    .chart-card { background: #141624; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 20px; }
    .chart-title { margin: 0 0 16px; font-size: 14px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
  `],
})
export class ModelBreakdownPieComponent {
  @Input() loading = false;
  @Input() set byModel(data: ModelTotal[]) { this._data.set(data ?? []); }

  private _data = signal<ModelTotal[]>([]);

  chartOption = computed<EChartsOption>(() => {
    const data = this._data();
    const seriesData = data.map((m, i) => ({
      name: m.model,
      value: +m.total_cost_usd.toFixed(4),
      itemStyle: { color: COLORS[i % COLORS.length] },
    }));

    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item', formatter: '{b}: ${c} ({d}%)' },
      legend: { orient: 'vertical', right: 10, top: 'center', textStyle: { color: '#94a3b8' }, type: 'scroll' },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['40%', '50%'],
        data: seriesData,
        label: { show: false },
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' } },
      }],
    };
  });
}
