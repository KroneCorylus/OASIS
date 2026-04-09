import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxEchartsDirective } from 'ngx-echarts';
import { EChartsOption } from 'echarts';
import { ModelTotal } from '../../../../core/models';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';

@Component({
  selector: 'app-token-cost-proportion',
  standalone: true,
  imports: [CommonModule, NgxEchartsDirective, SkeletonComponent],
  template: `
    <div class="chart-card">
      <h3 class="chart-title">Token Volume vs Cost</h3>
      @if (loading) {
        <app-skeleton height="220px"></app-skeleton>
      } @else {
        <div echarts [options]="chartOption()" style="height:220px"></div>
      }
    </div>
  `,
  styles: [`
    .chart-card { background: #141624; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 20px; }
    .chart-title { margin: 0 0 16px; font-size: 14px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
  `],
})
export class TokenCostProportionComponent {
  @Input() loading = false;
  @Input() set byModel(data: ModelTotal[]) { this._data.set(data ?? []); }

  private _data = signal<ModelTotal[]>([]);

  chartOption = computed<EChartsOption>(() => {
    const data = this._data();

    let totalCached = 0, totalUncached = 0, totalOutput = 0;
    let costCached = 0, costUncached = 0, costOutput = 0;

    for (const m of data) {
      totalCached   += m.input_cached;
      totalUncached += m.input_uncached;
      totalOutput   += m.output_tokens;
      costCached    += m.cost_input_cached;
      costUncached  += m.cost_input_uncached;
      costOutput    += m.cost_output;
    }

    const totalTokens = totalCached + totalUncached + totalOutput;
    const totalCost   = costCached + costUncached + costOutput;

    const pct = (n: number, total: number) => total > 0 ? +(n / total * 100).toFixed(2) : 0;

    const cachedTokenPct   = pct(totalCached, totalTokens);
    const uncachedTokenPct = pct(totalUncached, totalTokens);
    const outputTokenPct   = pct(totalOutput, totalTokens);

    const cachedCostPct   = pct(costCached, totalCost);
    const uncachedCostPct = pct(costUncached, totalCost);
    const outputCostPct   = pct(costOutput, totalCost);

    const fmt = (n: number) => {
      if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
      if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
      if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
      return String(Math.round(n));
    };

    const makeTooltip = (type: string, tokenPct: number, costPct: number, tokens: number, cost: number) =>
      `<b>${type}</b><br/>` +
      `Tokens: <b>${tokenPct}%</b> &nbsp;(${fmt(tokens)})<br/>` +
      `Cost: <b>${costPct}%</b> &nbsp;($${cost.toFixed(4)})`;

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const name: string = params.seriesName;
          if (params.name === 'Token Volume') {
            if (name === 'Cached Input')   return makeTooltip('Cached Input',   cachedTokenPct,   cachedCostPct,   totalCached,   costCached);
            if (name === 'Uncached Input') return makeTooltip('Uncached Input', uncachedTokenPct, uncachedCostPct, totalUncached, costUncached);
            return makeTooltip('Output', outputTokenPct, outputCostPct, totalOutput, costOutput);
          } else {
            if (name === 'Cached Input')   return makeTooltip('Cached Input',   cachedTokenPct,   cachedCostPct,   totalCached,   costCached);
            if (name === 'Uncached Input') return makeTooltip('Uncached Input', uncachedTokenPct, uncachedCostPct, totalUncached, costUncached);
            return makeTooltip('Output', outputTokenPct, outputCostPct, totalOutput, costOutput);
          }
        },
      },
      legend: {
        data: ['Cached Input', 'Uncached Input', 'Output'],
        textStyle: { color: '#94a3b8' },
        top: 0,
      },
      grid: { left: 110, right: 20, top: 40, bottom: 20 },
      xAxis: {
        type: 'value',
        max: 100,
        axisLabel: { color: '#64748b', formatter: (v: number) => v + '%' },
        splitLine: { lineStyle: { color: '#1e2030' } },
        axisLine: { show: false },
      },
      yAxis: {
        type: 'category',
        data: ['Cost', 'Token Volume'],
        axisLabel: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold' },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          name: 'Cached Input',
          type: 'bar',
          stack: 'total',
          barMaxWidth: 52,
          label: {
            show: true,
            formatter: (params: any) => {
              const v = params.value as number;
              return v >= 5 ? v + '%' : '';
            },
            color: '#fff',
            fontSize: 11,
          },
          data: [cachedCostPct, cachedTokenPct],
          itemStyle: { color: '#6366f1' },
          emphasis: { focus: 'series' },
        },
        {
          name: 'Uncached Input',
          type: 'bar',
          stack: 'total',
          barMaxWidth: 52,
          label: {
            show: true,
            formatter: (params: any) => {
              const v = params.value as number;
              return v >= 5 ? v + '%' : '';
            },
            color: '#fff',
            fontSize: 11,
          },
          data: [uncachedCostPct, uncachedTokenPct],
          itemStyle: { color: '#8b5cf6' },
          emphasis: { focus: 'series' },
        },
        {
          name: 'Output',
          type: 'bar',
          stack: 'total',
          barMaxWidth: 52,
          label: {
            show: true,
            formatter: (params: any) => {
              const v = params.value as number;
              return v >= 5 ? v + '%' : '';
            },
            color: '#fff',
            fontSize: 11,
          },
          data: [outputCostPct, outputTokenPct],
          itemStyle: { color: '#06b6d4' },
          emphasis: { focus: 'series' },
        },
      ],
    };
  });
}
