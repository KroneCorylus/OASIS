import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxEchartsDirective } from 'ngx-echarts';
import { EChartsOption } from 'echarts';
import { DayStat } from '../../../../core/models';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';

@Component({
  selector: 'app-cost-breakdown',
  standalone: true,
  imports: [CommonModule, NgxEchartsDirective, SkeletonComponent],
  template: `
    <div class="chart-card">
      <h3 class="chart-title">Cost Breakdown by Type</h3>
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
export class CostBreakdownComponent {
  @Input() loading = false;
  @Input() set byDate(data: DayStat[]) { this._data.set(data ?? []); }

  private _data = signal<DayStat[]>([]);

  chartOption = computed<EChartsOption>(() => {
    const data = this._data();
    const dates = data.map(d => d.date);

    const cachedCost: number[] = [];
    const uncachedCost: number[] = [];
    const outputCost: number[] = [];

    for (const day of data) {
      let cached = 0, uncached = 0, output = 0;
      for (const m of day.models) {
        cached += m.cost_input_cached;
        uncached += m.cost_input_uncached;
        output += m.cost_output;
      }
      cachedCost.push(+cached.toFixed(4));
      uncachedCost.push(+uncached.toFixed(4));
      outputCost.push(+output.toFixed(4));
    }

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          let total = 0;
          let s = `<b>${params[0].name}</b><br/>`;
          for (const p of params) {
            s += `${p.marker}${p.seriesName}: $${Number(p.value).toFixed(4)}<br/>`;
            total += p.value;
          }
          s += `<br/><b>Total: $${total.toFixed(4)}</b>`;
          return s;
        },
      },
      legend: {
        data: ['Cached Input', 'Uncached Input', 'Output'],
        textStyle: { color: '#94a3b8' },
        top: 0,
      },
      grid: { left: 70, right: 20, bottom: 40, top: 40 },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { color: '#64748b', rotate: 45 },
        axisLine: { lineStyle: { color: '#2a2d3e' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#64748b', formatter: (v: number) => '$' + v.toFixed(2) },
        splitLine: { lineStyle: { color: '#1e2030' } },
      },
      series: [
        {
          name: 'Cached Input',
          type: 'bar',
          stack: 'cost',
          data: cachedCost,
          itemStyle: { color: '#6366f1' },
          emphasis: { focus: 'series' },
        },
        {
          name: 'Uncached Input',
          type: 'bar',
          stack: 'cost',
          data: uncachedCost,
          itemStyle: { color: '#8b5cf6' },
          emphasis: { focus: 'series' },
        },
        {
          name: 'Output',
          type: 'bar',
          stack: 'cost',
          data: outputCost,
          itemStyle: { color: '#06b6d4' },
          emphasis: { focus: 'series' },
        },
      ],
    };
  });
}
