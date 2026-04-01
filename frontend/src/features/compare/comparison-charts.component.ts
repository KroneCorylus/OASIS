import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxEchartsDirective } from 'ngx-echarts';
import { EChartsOption } from 'echarts';
import { CompareKeyData } from '../../core/models';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';

const COLOR_A = '#34d399'; // green – Key A
const COLOR_B = '#f87171'; // red   – Key B

@Component({
  selector: 'app-comparison-charts',
  standalone: true,
  imports: [CommonModule, NgxEchartsDirective, SkeletonComponent],
  template: `
    <div class="charts-grid">
      <!-- Cache ratio -->
      <div class="chart-card">
        <h3 class="chart-title">Cache Ratio (%)</h3>
        @if (loading) {
          <app-skeleton height="220px"></app-skeleton>
        } @else {
          <div echarts [options]="cacheRatioOption()" style="height:220px"></div>
        }
      </div>

      <!-- Token breakdown -->
      <div class="chart-card">
        <h3 class="chart-title">Token Usage</h3>
        @if (loading) {
          <app-skeleton height="220px"></app-skeleton>
        } @else {
          <div echarts [options]="tokenOption()" style="height:220px"></div>
        }
      </div>

      <!-- Cost breakdown -->
      <div class="chart-card">
        <h3 class="chart-title">Cost Breakdown (USD)</h3>
        @if (loading) {
          <app-skeleton height="220px"></app-skeleton>
        } @else {
          <div echarts [options]="costOption()" style="height:220px"></div>
        }
      </div>

      <!-- Total cost comparison -->
      <div class="chart-card">
        <h3 class="chart-title">Total Cost (USD)</h3>
        @if (loading) {
          <app-skeleton height="220px"></app-skeleton>
        } @else {
          <div echarts [options]="totalCostOption()" style="height:220px"></div>
        }
      </div>
    </div>
  `,
  styles: [`
    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(440px, 1fr));
      gap: 16px;
    }
    .chart-card {
      background: #141624;
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 12px;
      padding: 20px;
    }
    .chart-title {
      margin: 0 0 14px;
      font-size: 13px;
      font-weight: 600;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  `],
})
export class ComparisonChartsComponent {
  @Input() loading = false;
  @Input() keyAName = 'Key A';
  @Input() keyBName = 'Key B';

  @Input() set keyAData(d: CompareKeyData | null) { this._a.set(d); }
  @Input() set keyBData(d: CompareKeyData | null) { this._b.set(d); }

  private _a = signal<CompareKeyData | null>(null);
  private _b = signal<CompareKeyData | null>(null);

  // ── Cache ratio side-by-side horizontal bars ──────────────────────────────
  cacheRatioOption = computed<EChartsOption>(() => {
    const a = this._a();
    const b = this._b();
    const totA = a?.totals;
    const totB = b?.totals;
    const ratioA = totA && totA.input_total > 0 ? +(totA.input_cached / totA.input_total * 100).toFixed(1) : 0;
    const ratioB = totB && totB.input_total > 0 ? +(totB.input_cached / totB.input_total * 100).toFixed(1) : 0;

    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (p: any) => `${p[0].name}: ${p[0].value}%` },
      grid: { left: 20, right: 40, top: 10, bottom: 20, containLabel: true },
      xAxis: { type: 'value', max: 100, axisLabel: { color: '#64748b', formatter: '{value}%' }, splitLine: { lineStyle: { color: '#1e2030' } } },
      yAxis: { type: 'category', data: [this.keyBName, this.keyAName], axisLabel: { color: '#94a3b8' }, axisLine: { lineStyle: { color: '#2a2d3e' } } },
      series: [{
        type: 'bar',
        data: [
          { value: ratioB, itemStyle: { color: COLOR_B } },
          { value: ratioA, itemStyle: { color: COLOR_A } },
        ],
        barMaxWidth: 36,
        label: { show: true, position: 'right', formatter: '{c}%', color: '#94a3b8', fontSize: 12 },
      }],
    };
  });

  // ── Token usage grouped bars (output / cached input / uncached input) ─────
  tokenOption = computed<EChartsOption>(() => {
    const a = this._a()?.totals;
    const b = this._b()?.totals;
    const cats = ['Output', 'Cached Input', 'Uncached Input'];
    const valA = [a?.output_tokens ?? 0, a?.input_cached ?? 0, a?.input_uncached ?? 0];
    const valB = [b?.output_tokens ?? 0, b?.input_cached ?? 0, b?.input_uncached ?? 0];

    return groupedBarOption(cats, this.keyAName, valA, this.keyBName, valB, v => fmtNum(v));
  });

  // ── Cost breakdown grouped bars ───────────────────────────────────────────
  costOption = computed<EChartsOption>(() => {
    const a = this._a()?.totals;
    const b = this._b()?.totals;
    const cats = ['Output', 'Cached Input', 'Uncached Input'];
    const valA = [a?.cost_output ?? 0, a?.cost_input_cached ?? 0, a?.cost_input_uncached ?? 0];
    const valB = [b?.cost_output ?? 0, b?.cost_input_cached ?? 0, b?.cost_input_uncached ?? 0];

    return groupedBarOption(cats, this.keyAName, valA, this.keyBName, valB, v => '$' + v.toFixed(4));
  });

  // ── Total cost pie / bar ───────────────────────────────────────────────────
  totalCostOption = computed<EChartsOption>(() => {
    const totA = +(this._a()?.totals.cost_total ?? 0);
    const totB = +(this._b()?.totals.cost_total ?? 0);

    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item', formatter: (p: any) => `${p.name}: $${p.value.toFixed(4)}` },
      legend: { bottom: 0, textStyle: { color: '#94a3b8' } },
      series: [{
        type: 'pie',
        radius: ['35%', '65%'],
        center: ['50%', '45%'],
        data: [
          { name: this.keyAName, value: totA, itemStyle: { color: COLOR_A } },
          { name: this.keyBName, value: totB, itemStyle: { color: COLOR_B } },
        ],
        label: {
          show: true,
          formatter: (p: any) => `${p.percent?.toFixed(0)}%`,
          color: '#cbd5e1',
          fontSize: 13,
          fontWeight: 'bold',
        },
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' } },
      }],
    };
  });
}

function groupedBarOption(
  cats: string[],
  nameA: string, valA: number[],
  nameB: string, valB: number[],
  fmt: (v: number) => string,
): EChartsOption {
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      formatter: (params: any) =>
        `${params[0].axisValue}<br/>` +
        params.map((p: any) => `${p.marker}${p.seriesName}: ${fmt(p.value)}`).join('<br/>'),
    },
    legend: { data: [nameA, nameB], textStyle: { color: '#94a3b8' }, top: 0 },
    grid: { left: 20, right: 20, top: 36, bottom: 20, containLabel: true },
    xAxis: { type: 'category', data: cats, axisLabel: { color: '#94a3b8', fontSize: 11 }, axisLine: { lineStyle: { color: '#2a2d3e' } } },
    yAxis: { type: 'value', axisLabel: { color: '#64748b', fontSize: 10, formatter: (v: number) => fmt(v) }, splitLine: { lineStyle: { color: '#1e2030' } } },
    series: [
      { name: nameA, type: 'bar', data: valA, itemStyle: { color: COLOR_A }, barMaxWidth: 40 },
      { name: nameB, type: 'bar', data: valB, itemStyle: { color: COLOR_B }, barMaxWidth: 40 },
    ],
  };
}

function fmtNum(v: number): string {
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1) + 'B';
  if (v >= 1_000_000)     return (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000)         return (v / 1_000).toFixed(0) + 'K';
  return v.toString();
}
