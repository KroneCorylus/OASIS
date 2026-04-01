import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CompareResult, CompareKeyData, CompareModelRow } from '../../../core/models';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { FormatTokensPipe } from '../../../shared/pipes/format-tokens.pipe';
import { FormatCostPipe } from '../../../shared/pipes/format-cost.pipe';

@Component({
  selector: 'app-comparison-table',
  standalone: true,
  imports: [CommonModule, SkeletonComponent, FormatTokensPipe, FormatCostPipe],
  template: `
    <div class="table-card">
      @if (loading) {
        <div class="skeleton-rows">
          @for (i of [1,2,3,4,5,6,7]; track i) {
            <app-skeleton height="42px" style="margin-bottom: 6px;"></app-skeleton>
          }
        </div>
      } @else if (!result) {
        <div class="empty-state">Select two different API keys to compare usage.</div>
      } @else {
        @if (hasExclusions) {
          <div class="exclusion-notice">
            <span>Some models excluded from totals.</span>
            <button class="reset-btn" (click)="resetExclusions.emit()">Reset all</button>
          </div>
        }
        <div class="table-wrapper">
          <table class="cmp-table">
            <thead>
              <tr>
                <th rowspan="2" class="key-col">Key</th>
                <th rowspan="2" class="model-col">Model</th>
                <th colspan="4" class="group-hdr tokens-hdr">Tokens</th>
                <th colspan="4" class="group-hdr cost-hdr">Cost (USD)</th>
              </tr>
              <tr>
                <th class="num-col">Output</th>
                <th class="num-col">Cached Input</th>
                <th class="num-col">Uncached Input</th>
                <th class="num-col">Total Input</th>
                <th class="num-col">Output</th>
                <th class="num-col">Cached</th>
                <th class="num-col">Uncached</th>
                <th class="num-col total-col">Total</th>
              </tr>
            </thead>
            <tbody>
              <!-- ── KEY A ─────────────────────────────── -->
              @for (model of filteredA.models; track model.model; let first = $first) {
                <tr class="row-a">
                  @if (first) {
                    <td [attr.rowspan]="filteredA.models.length + 1" class="key-td key-a-td">
                      {{ keyAName }}
                    </td>
                  }
                  <td class="model-td">
                    <span class="model-name">{{ model.model }}</span>
                    <button class="remove-btn" (click)="removeA.emit(model.model)" title="Remove from calculation">
                      ✕ Remove
                    </button>
                  </td>
                  <td class="num-col">{{ model.output_tokens    | formatTokens }}</td>
                  <td class="num-col">{{ model.input_cached     | formatTokens }}</td>
                  <td class="num-col">{{ model.input_uncached   | formatTokens }}</td>
                  <td class="num-col">{{ model.input_total      | formatTokens }}</td>
                  <td class="num-col">{{ model.cost_output      | formatCost }}</td>
                  <td class="num-col">{{ model.cost_input_cached | formatCost }}</td>
                  <td class="num-col">{{ model.cost_input_uncached | formatCost }}</td>
                  <td class="num-col total-col">{{ model.cost_total | formatCost }}</td>
                </tr>
              }
              @if (filteredA.models.length === 0) {
                <tr class="row-a">
                  <td class="key-td key-a-td">{{ keyAName }}</td>
                  <td colspan="8" class="all-excluded">All models excluded</td>
                </tr>
              }
              <tr class="total-row total-row-a">
                <td class="total-label">Total</td>
                <td class="num-col">{{ filteredA.totals.output_tokens     | formatTokens }}</td>
                <td class="num-col">{{ filteredA.totals.input_cached      | formatTokens }}</td>
                <td class="num-col">{{ filteredA.totals.input_uncached    | formatTokens }}</td>
                <td class="num-col">{{ filteredA.totals.input_total       | formatTokens }}</td>
                <td class="num-col">{{ filteredA.totals.cost_output       | formatCost }}</td>
                <td class="num-col">{{ filteredA.totals.cost_input_cached  | formatCost }}</td>
                <td class="num-col">{{ filteredA.totals.cost_input_uncached | formatCost }}</td>
                <td class="num-col total-col">{{ filteredA.totals.cost_total | formatCost }}</td>
              </tr>

              <!-- ── KEY B ─────────────────────────────── -->
              @for (model of filteredB.models; track model.model; let first = $first) {
                <tr class="row-b">
                  @if (first) {
                    <td [attr.rowspan]="filteredB.models.length + 1" class="key-td key-b-td">
                      {{ keyBName }}
                    </td>
                  }
                  <td class="model-td">
                    <span class="model-name">{{ model.model }}</span>
                    <button class="remove-btn" (click)="removeB.emit(model.model)" title="Remove from calculation">
                      ✕ Remove
                    </button>
                  </td>
                  <td class="num-col">{{ model.output_tokens    | formatTokens }}</td>
                  <td class="num-col">{{ model.input_cached     | formatTokens }}</td>
                  <td class="num-col">{{ model.input_uncached   | formatTokens }}</td>
                  <td class="num-col">{{ model.input_total      | formatTokens }}</td>
                  <td class="num-col">{{ model.cost_output      | formatCost }}</td>
                  <td class="num-col">{{ model.cost_input_cached | formatCost }}</td>
                  <td class="num-col">{{ model.cost_input_uncached | formatCost }}</td>
                  <td class="num-col total-col">{{ model.cost_total | formatCost }}</td>
                </tr>
              }
              @if (filteredB.models.length === 0) {
                <tr class="row-b">
                  <td class="key-td key-b-td">{{ keyBName }}</td>
                  <td colspan="8" class="all-excluded">All models excluded</td>
                </tr>
              }
              <tr class="total-row total-row-b">
                <td class="total-label">Total</td>
                <td class="num-col">{{ filteredB.totals.output_tokens     | formatTokens }}</td>
                <td class="num-col">{{ filteredB.totals.input_cached      | formatTokens }}</td>
                <td class="num-col">{{ filteredB.totals.input_uncached    | formatTokens }}</td>
                <td class="num-col">{{ filteredB.totals.input_total       | formatTokens }}</td>
                <td class="num-col">{{ filteredB.totals.cost_output       | formatCost }}</td>
                <td class="num-col">{{ filteredB.totals.cost_input_cached  | formatCost }}</td>
                <td class="num-col">{{ filteredB.totals.cost_input_uncached | formatCost }}</td>
                <td class="num-col total-col">{{ filteredB.totals.cost_total | formatCost }}</td>
              </tr>

              <!-- ── SAVINGS (A vs B) ───────────────────── -->
              <tr class="savings-row">
                <td colspan="2" class="savings-label">Savings (A vs B)</td>
                <td class="num-col savings-pct" [class.neg]="savingsSign(filteredA.totals.output_tokens, filteredB.totals.output_tokens) < 0">
                  {{ savingsPct(filteredA.totals.output_tokens, filteredB.totals.output_tokens) }}
                </td>
                <td class="num-col savings-pct" [class.neg]="savingsSign(filteredA.totals.input_cached, filteredB.totals.input_cached) < 0">
                  {{ savingsPct(filteredA.totals.input_cached, filteredB.totals.input_cached) }}
                </td>
                <td class="num-col savings-pct" [class.neg]="savingsSign(filteredA.totals.input_uncached, filteredB.totals.input_uncached) < 0">
                  {{ savingsPct(filteredA.totals.input_uncached, filteredB.totals.input_uncached) }}
                </td>
                <td class="num-col savings-pct" [class.neg]="savingsSign(filteredA.totals.input_total, filteredB.totals.input_total) < 0">
                  {{ savingsPct(filteredA.totals.input_total, filteredB.totals.input_total) }}
                </td>
                <td class="num-col savings-pct" [class.neg]="savingsSign(filteredA.totals.cost_output, filteredB.totals.cost_output) < 0">
                  {{ savingsPct(filteredA.totals.cost_output, filteredB.totals.cost_output) }}
                </td>
                <td class="num-col savings-pct" [class.neg]="savingsSign(filteredA.totals.cost_input_cached, filteredB.totals.cost_input_cached) < 0">
                  {{ savingsPct(filteredA.totals.cost_input_cached, filteredB.totals.cost_input_cached) }}
                </td>
                <td class="num-col savings-pct" [class.neg]="savingsSign(filteredA.totals.cost_input_uncached, filteredB.totals.cost_input_uncached) < 0">
                  {{ savingsPct(filteredA.totals.cost_input_uncached, filteredB.totals.cost_input_uncached) }}
                </td>
                <td class="num-col total-col savings-pct" [class.neg]="savingsSign(filteredA.totals.cost_total, filteredB.totals.cost_total) < 0">
                  {{ savingsPct(filteredA.totals.cost_total, filteredB.totals.cost_total) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="footnote">
          Costs calculated from model-pricing.json ($/1M tokens: output, cached input, uncached input).
          Totals and charts = sum of visible rows. Savings = Key A vs Key B (positive = A uses/costs less).
        </div>
      }
    </div>
  `,
  styles: [`
    .table-card {
      background: #141624;
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 12px;
      padding: 20px;
    }
    .table-wrapper { overflow-x: auto; }
    .cmp-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      min-width: 900px;
    }

    /* ── Headers ── */
    thead tr { border-bottom: 1px solid rgba(255,255,255,0.08); }
    .key-col   { width: 130px; }
    .model-col { min-width: 220px; }
    .group-hdr {
      text-align: center;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      padding: 8px 6px 4px;
      border-bottom: 2px solid transparent;
    }
    .tokens-hdr { color: #60a5fa; border-bottom-color: rgba(96,165,250,0.4); }
    .cost-hdr   { color: #a78bfa; border-bottom-color: rgba(167,139,250,0.4); }
    th.num-col {
      text-align: right;
      padding: 6px 12px 10px;
      color: #64748b;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      white-space: nowrap;
    }
    th.key-col, th.model-col {
      text-align: left;
      padding: 10px 12px;
      color: #64748b;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* ── Cells ── */
    td { padding: 9px 12px; border-bottom: 1px solid rgba(255,255,255,0.04); vertical-align: middle; }
    .num-col { text-align: right; color: #cbd5e1; font-variant-numeric: tabular-nums; }
    .total-col { font-weight: 600; }

    /* ── Key label cell ── */
    .key-td {
      font-weight: 700;
      font-size: 13px;
      vertical-align: middle;
      text-align: center;
      white-space: nowrap;
      padding: 10px 14px;
      border-right: 2px solid transparent;
    }
    .key-a-td {
      color: #86efac;
      background: rgba(34,197,94,0.06);
      border-right-color: rgba(34,197,94,0.3);
    }
    .key-b-td {
      color: #fca5a5;
      background: rgba(239,68,68,0.06);
      border-right-color: rgba(239,68,68,0.3);
    }

    /* ── Key A rows ── */
    .row-a td { background: rgba(34,197,94,0.03); }
    .row-a:hover td { background: rgba(34,197,94,0.07); }

    /* ── Key B rows ── */
    .row-b td { background: rgba(239,68,68,0.03); }
    .row-b:hover td { background: rgba(239,68,68,0.07); }

    /* ── Model cell ── */
    .model-td {
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 38px;
    }
    .model-name {
      font-family: monospace;
      font-size: 12px;
      color: #e2e8f0;
      flex: 1;
    }
    .remove-btn {
      flex-shrink: 0;
      padding: 2px 8px;
      font-size: 11px;
      background: rgba(239,68,68,0.1);
      border: 1px solid rgba(239,68,68,0.25);
      border-radius: 4px;
      color: #fca5a5;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s;
    }
    .remove-btn:hover {
      background: rgba(239,68,68,0.2);
      border-color: rgba(239,68,68,0.4);
    }

    /* ── Total rows ── */
    .total-row td {
      font-weight: 600;
      border-top: 1px solid rgba(255,255,255,0.1);
    }
    .total-row .total-label { color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.4px; }
    .total-row-a td { background: rgba(34,197,94,0.09); color: #86efac; }
    .total-row-b td { background: rgba(239,68,68,0.09); color: #fca5a5; }

    /* ── Savings row ── */
    .savings-row td {
      background: rgba(99,102,241,0.08);
      border-top: 2px solid rgba(255,255,255,0.1);
    }
    .savings-label {
      color: #94a3b8;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .savings-pct { color: #34d399; font-weight: 700; font-size: 13px; }
    .savings-pct.neg { color: #f87171; }

    /* ── Exclusion notice ── */
    .exclusion-notice {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
      padding: 8px 14px;
      background: rgba(251,191,36,0.08);
      border: 1px solid rgba(251,191,36,0.2);
      border-radius: 8px;
      font-size: 13px;
      color: #fbbf24;
    }
    .reset-btn {
      padding: 3px 10px;
      background: rgba(251,191,36,0.15);
      border: 1px solid rgba(251,191,36,0.3);
      border-radius: 6px;
      color: #fde68a;
      font-size: 12px;
      cursor: pointer;
    }
    .reset-btn:hover { background: rgba(251,191,36,0.25); }

    /* ── Misc ── */
    .all-excluded { color: #475569; font-style: italic; font-size: 12px; padding: 10px 12px; }
    .empty-state { text-align: center; padding: 60px; color: #64748b; font-size: 14px; }
    .skeleton-rows { display: flex; flex-direction: column; }
    .footnote { margin-top: 14px; font-size: 11px; color: #475569; line-height: 1.5; }
  `],
})
export class ComparisonTableComponent {
  @Input() result: CompareResult | null = null;
  @Input() keyAName = 'Key A';
  @Input() keyBName = 'Key B';
  @Input() filteredKeyAData: CompareKeyData | null = null;
  @Input() filteredKeyBData: CompareKeyData | null = null;
  @Input() hasExclusions = false;
  @Input() loading = false;

  @Output() removeA = new EventEmitter<string>();
  @Output() removeB = new EventEmitter<string>();
  @Output() resetExclusions = new EventEmitter<void>();

  get filteredA(): CompareKeyData {
    return this.filteredKeyAData ?? { models: [], totals: emptyRow() };
  }

  get filteredB(): CompareKeyData {
    return this.filteredKeyBData ?? { models: [], totals: emptyRow() };
  }

  /** Returns (keyB - keyA) / keyB * 100 — positive means A uses/costs less */
  savingsPct(a: number, b: number): string {
    if (b === 0 && a === 0) return '—';
    if (b === 0) return '—';
    const pct = (b - a) / b * 100;
    return (pct >= 0 ? '+' : '') + pct.toFixed(0) + '%';
  }

  savingsSign(a: number, b: number): number {
    if (b === 0) return 0;
    return b - a;
  }
}

function emptyRow(): import('../../../core/models').CompareModelRow {
  return {
    model: 'Total',
    output_tokens: 0, input_cached: 0, input_uncached: 0, input_total: 0,
    cost_output: 0, cost_input_cached: 0, cost_input_uncached: 0, cost_total: 0,
  };
}
