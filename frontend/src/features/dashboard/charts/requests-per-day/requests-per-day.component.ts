import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxEchartsDirective } from 'ngx-echarts';
import { EChartsOption } from 'echarts';
import { DayStat } from '../../../../core/models';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';

const COLORS = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#14b8a6'];

@Component({
  selector: 'app-requests-per-day',
  standalone: true,
  imports: [CommonModule, NgxEchartsDirective, SkeletonComponent],
  template: `
    <div class="chart-card">
      <h3 class="chart-title">Requests Per Day</h3>
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
export class RequestsPerDayComponent {
  @Input() loading = false;
  @Input() set byDate(data: DayStat[]) { this._data.set(data ?? []); }

  private _data = signal<DayStat[]>([]);

  chartOption = computed<EChartsOption>(() => {
    const data = this._data();
    const dates = data.map(d => d.date);

    const modelSet = new Set<string>();
    for (const day of data) for (const m of day.models) modelSet.add(m.model);
    const models = Array.from(modelSet).sort();

    const reqsByModelDate = new Map<string, Map<string, number>>();
    for (const model of models) reqsByModelDate.set(model, new Map());

    for (const day of data) {
      for (const m of day.models) {
        const mr = reqsByModelDate.get(m.model)!;
        mr.set(day.date, (mr.get(day.date) ?? 0) + m.requests);
      }
    }

    const series: any[] = models.map((model, i) => ({
      name: model,
      type: 'bar',
      stack: 'requests',
      data: dates.map(d => reqsByModelDate.get(model)?.get(d) ?? 0),
      itemStyle: { color: COLORS[i % COLORS.length] },
      emphasis: { focus: 'series' },
    }));

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          let total = 0;
          let s = `<b>${params[0].name}</b><br/>`;
          for (const p of params) {
            if (p.value > 0) s += `${p.marker}${p.seriesName}: ${fmtNum(p.value)}<br/>`;
            total += p.value;
          }
          s += `<br/><b>Total: ${fmtNum(total)}</b>`;
          return s;
        },
      },
      legend: { data: models, textStyle: { color: '#94a3b8' }, top: 0, type: 'scroll' },
      grid: { left: 60, right: 20, bottom: 40, top: 40 },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { color: '#64748b', rotate: 45 },
        axisLine: { lineStyle: { color: '#2a2d3e' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#64748b', formatter: (v: number) => fmtNum(v) },
        splitLine: { lineStyle: { color: '#1e2030' } },
      },
      series,
    };
  });
}

function fmtNum(v: number): string {
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
  return String(v);
}
