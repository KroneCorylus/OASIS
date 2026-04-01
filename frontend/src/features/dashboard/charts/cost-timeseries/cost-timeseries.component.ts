import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxEchartsDirective } from 'ngx-echarts';
import { EChartsOption } from 'echarts';
import { DayStat } from '../../../../core/models';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';

const COLORS = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#14b8a6'];

@Component({
  selector: 'app-cost-timeseries',
  standalone: true,
  imports: [CommonModule, NgxEchartsDirective, SkeletonComponent],
  template: `
    <div class="chart-card">
      <h3 class="chart-title">Cost Over Time</h3>
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
export class CostTimeseriesComponent {
  @Input() loading = false;
  @Input() set byDate(data: DayStat[]) { this._data.set(data ?? []); }

  private _data = signal<DayStat[]>([]);

  chartOption = computed<EChartsOption>(() => {
    const data = this._data();
    const dates = data.map(d => d.date);

    // Collect all models.
    const modelSet = new Set<string>();
    for (const day of data) for (const m of day.models) modelSet.add(m.model);
    const models = Array.from(modelSet).sort();

    // model → date → cost
    const costByModelDate = new Map<string, Map<string, number>>();
    for (const model of models) costByModelDate.set(model, new Map());

    const totalByDate = new Map<string, number>();
    for (const day of data) {
      let dayTotal = 0;
      for (const m of day.models) {
        const mc = costByModelDate.get(m.model)!;
        mc.set(day.date, (mc.get(day.date) ?? 0) + m.cost_usd);
        dayTotal += m.cost_usd;
      }
      totalByDate.set(day.date, dayTotal);
    }

    const series: any[] = models.map((model, i) => ({
      name: model,
      type: 'line',
      smooth: true,
      data: dates.map(d => +(costByModelDate.get(model)?.get(d) ?? 0).toFixed(4)),
      itemStyle: { color: COLORS[i % COLORS.length] },
      lineStyle: { width: 2 },
      symbol: 'none',
    }));

    series.push({
      name: 'Total',
      type: 'line',
      smooth: true,
      data: dates.map(d => +(totalByDate.get(d) ?? 0).toFixed(4)),
      itemStyle: { color: '#f8fafc' },
      lineStyle: { width: 3, type: 'dashed' },
      symbol: 'none',
    });

    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', formatter: (params: any) => {
        let s = `<b>${params[0].name}</b><br/>`;
        for (const p of params) s += `${p.marker}${p.seriesName}: $${Number(p.value).toFixed(4)}<br/>`;
        return s;
      }},
      legend: { data: [...models, 'Total'], textStyle: { color: '#94a3b8' }, top: 0, type: 'scroll' },
      grid: { left: 70, right: 20, bottom: 40, top: 40 },
      xAxis: { type: 'category', data: dates, axisLabel: { color: '#64748b', rotate: 45 }, axisLine: { lineStyle: { color: '#2a2d3e' } } },
      yAxis: { type: 'value', axisLabel: { color: '#64748b', formatter: (v: number) => '$' + v.toFixed(2) }, splitLine: { lineStyle: { color: '#1e2030' } } },
      series,
    };
  });
}
