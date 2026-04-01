import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxEchartsDirective } from 'ngx-echarts';
import { EChartsOption } from 'echarts';
import { ModelTotal, DayStat } from '../../../../core/models';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';

@Component({
  selector: 'app-cache-ratio-bar',
  standalone: true,
  imports: [CommonModule, NgxEchartsDirective, SkeletonComponent],
  template: `
    <div class="chart-card">
      <h3 class="chart-title">Cache Ratio by Model</h3>
      @if (loading) {
        <app-skeleton height="300px"></app-skeleton>
      } @else {
        <div echarts [options]="chartOption()" [style.height]="chartHeight()"></div>
      }
    </div>
  `,
  styles: [`
    .chart-card { background: #141624; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 20px; }
    .chart-title { margin: 0 0 16px; font-size: 14px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
  `],
})
export class CacheRatioBarComponent {
  @Input() loading = false;
  @Input() set byDate(data: DayStat[]) {
    // Aggregate per model across all days.
    const cached = new Map<string, number>();
    const uncached = new Map<string, number>();
    for (const day of data ?? []) {
      for (const m of day.models) {
        cached.set(m.model, (cached.get(m.model) ?? 0) + m.input_cached);
        uncached.set(m.model, (uncached.get(m.model) ?? 0) + m.input_uncached);
      }
    }
    const models = Array.from(new Set([...cached.keys(), ...uncached.keys()])).sort();
    const result: ModelTotal[] = models.map(m => {
      const c = cached.get(m) ?? 0;
      const u = uncached.get(m) ?? 0;
      return { model: m, total_cost_usd: 0, input_tokens: c + u, output_tokens: 0, input_cached: c, input_uncached: u, cost_output: 0, cost_input_cached: 0, cost_input_uncached: 0, cache_ratio: c + u > 0 ? c / (c + u) : 0 };
    });
    this._data.set(result);
  }

  private _data = signal<ModelTotal[]>([]);

  chartHeight = computed(() => Math.max(200, this._data().length * 40 + 60) + 'px');

  chartOption = computed<EChartsOption>(() => {
    const data = this._data();
    const models = data.map(d => d.model);
    const cachedPct = data.map(d => +(d.cache_ratio * 100).toFixed(1));
    const uncachedPct = data.map(d => +((1 - d.cache_ratio) * 100).toFixed(1));

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis', axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const m = params[0].name;
          return `<b>${m}</b><br/>Cached: ${params[0].value}%<br/>Uncached: ${params[1].value}%`;
        },
      },
      legend: { data: ['Cached', 'Uncached'], textStyle: { color: '#94a3b8' } },
      grid: { left: 140, right: 30, top: 30, bottom: 20 },
      xAxis: { type: 'value', max: 100, axisLabel: { color: '#64748b', formatter: '{value}%' }, splitLine: { lineStyle: { color: '#1e2030' } } },
      yAxis: { type: 'category', data: models, axisLabel: { color: '#94a3b8', fontSize: 12 }, axisLine: { lineStyle: { color: '#2a2d3e' } } },
      series: [
        { name: 'Cached', type: 'bar', stack: 'ratio', data: cachedPct, itemStyle: { color: '#10b981' }, label: { show: true, formatter: '{c}%', color: '#fff' } },
        { name: 'Uncached', type: 'bar', stack: 'ratio', data: uncachedPct, itemStyle: { color: '#334155' } },
      ],
    };
  });
}
