import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxEchartsDirective } from 'ngx-echarts';
import { EChartsOption } from 'echarts';
import { DayStat } from '../../../../core/models';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';

@Component({
  selector: 'app-token-timeseries',
  standalone: true,
  imports: [CommonModule, NgxEchartsDirective, SkeletonComponent],
  template: `
    <div class="chart-card">
      <h3 class="chart-title">Token Usage Over Time</h3>
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
export class TokenTimeseriesComponent {
  @Input() loading = false;
  @Input() set byDate(data: DayStat[]) { this._data.set(data ?? []); }

  private _data = signal<DayStat[]>([]);

  chartOption = computed<EChartsOption>(() => {
    const data = this._data();
    const dates = data.map(d => d.date);

    const cachedMap = new Map<string, number>();
    const uncachedMap = new Map<string, number>();
    const outputMap = new Map<string, number>();

    for (const day of data) {
      let cached = 0, uncached = 0, output = 0;
      for (const m of day.models) {
        cached += m.input_cached;
        uncached += m.input_uncached;
        output += m.output_tokens;
      }
      cachedMap.set(day.date, cached);
      uncachedMap.set(day.date, uncached);
      outputMap.set(day.date, output);
    }

    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          let s = `<b>${params[0].name}</b><br/>`;
          for (const p of params) s += `${p.marker}${p.seriesName}: ${fmtTokens(p.value)}<br/>`;
          return s;
        }
      },
      legend: { data: ['Cached Input', 'Uncached Input', 'Output'], textStyle: { color: '#94a3b8' }, top: 0 },
      grid: { left: 60, right: 20, bottom: 40, top: 40 },
      xAxis: { type: 'category', data: dates, axisLabel: { color: '#64748b', rotate: 45 }, axisLine: { lineStyle: { color: '#2a2d3e' } } },
      yAxis: { type: 'value', axisLabel: { color: '#64748b', formatter: (v: number) => fmtTokens(v) }, splitLine: { lineStyle: { color: '#1e2030' } } },
      series: [
        { name: 'Cached Input', type: 'bar', stack: 'tokens', data: dates.map(d => cachedMap.get(d) ?? 0), itemStyle: { color: '#6366f1' } },
        { name: 'Uncached Input', type: 'bar', stack: 'tokens', data: dates.map(d => uncachedMap.get(d) ?? 0), itemStyle: { color: '#8b5cf6' } },
        { name: 'Output', type: 'bar', stack: 'tokens', data: dates.map(d => outputMap.get(d) ?? 0), itemStyle: { color: '#06b6d4' } },
      ],
    };
  });
}

function fmtTokens(v: number): string {
  if (v >= 1e9) return (v / 1e9).toFixed(1) + 'B';
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
  return String(v);
}
