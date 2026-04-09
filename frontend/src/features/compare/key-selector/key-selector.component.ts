import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { APIKey } from '../../../core/models';

@Component({
  selector: 'app-key-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="key-selector">
      <div class="key-group">
        <label class="key-label">Key A</label>
        <div class="select-wrap" [class.is-loading]="loading">
          <select class="key-select" [ngModel]="keyA" (ngModelChange)="keyAChange.emit($event)" [disabled]="loading">
            <option value="">{{ loading ? 'Loading keys…' : 'Select Key A' }}</option>
            @for (k of keys; track k.id) {
              <option [value]="k.id" [disabled]="k.id === keyB">{{ k.name || k.redacted_value }} ({{ k.project_name }})</option>
            }
          </select>
          @if (loading) { <span class="spinner"></span> }
        </div>
      </div>
      <div class="vs-badge">VS</div>
      <div class="key-group">
        <label class="key-label">Key B</label>
        <div class="select-wrap" [class.is-loading]="loading">
          <select class="key-select" [ngModel]="keyB" (ngModelChange)="keyBChange.emit($event)" [disabled]="loading">
            <option value="">{{ loading ? 'Loading keys…' : 'Select Key B' }}</option>
            @for (k of keys; track k.id) {
              <option [value]="k.id" [disabled]="k.id === keyA">{{ k.name || k.redacted_value }} ({{ k.project_name }})</option>
            }
          </select>
          @if (loading) { <span class="spinner"></span> }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .key-selector { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .key-group { display: flex; align-items: center; gap: 10px; }
    .key-label { font-size: 13px; color: #64748b; white-space: nowrap; }
    .select-wrap { position: relative; display: inline-flex; align-items: center; }
    .select-wrap.is-loading { opacity: 0.6; }
    .key-select {
      padding: 7px 14px;
      background: #141624;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 6px;
      color: #e2e8f0;
      font-size: 13px;
      min-width: 200px;
    }
    .key-select:disabled { cursor: not-allowed; }
    .spinner {
      position: absolute;
      right: 30px;
      width: 13px;
      height: 13px;
      border: 2px solid rgba(165,180,252,0.2);
      border-top-color: #a5b4fc;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      pointer-events: none;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .vs-badge {
      padding: 4px 10px;
      background: rgba(99,102,241,0.15);
      border: 1px solid rgba(99,102,241,0.3);
      border-radius: 20px;
      color: #a5b4fc;
      font-size: 12px;
      font-weight: 700;
    }
  `],
})
export class KeySelectorComponent {
  @Input() keys: APIKey[] = [];
  @Input() keyA = '';
  @Input() keyB = '';
  @Input() loading = false;
  @Output() keyAChange = new EventEmitter<string>();
  @Output() keyBChange = new EventEmitter<string>();
}
