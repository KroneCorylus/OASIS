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
        <select class="key-select" [ngModel]="keyA" (ngModelChange)="keyAChange.emit($event)">
          <option value="">Select Key A</option>
          @for (k of keys; track k.id) {
            <option [value]="k.id" [disabled]="k.id === keyB">{{ k.name || k.redacted_value }} ({{ k.project_name }})</option>
          }
        </select>
      </div>
      <div class="vs-badge">VS</div>
      <div class="key-group">
        <label class="key-label">Key B</label>
        <select class="key-select" [ngModel]="keyB" (ngModelChange)="keyBChange.emit($event)">
          <option value="">Select Key B</option>
          @for (k of keys; track k.id) {
            <option [value]="k.id" [disabled]="k.id === keyA">{{ k.name || k.redacted_value }} ({{ k.project_name }})</option>
          }
        </select>
      </div>
    </div>
  `,
  styles: [`
    .key-selector { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .key-group { display: flex; align-items: center; gap: 10px; }
    .key-label { font-size: 13px; color: #64748b; white-space: nowrap; }
    .key-select {
      padding: 7px 14px;
      background: #141624;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 6px;
      color: #e2e8f0;
      font-size: 13px;
      min-width: 200px;
    }
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
  @Output() keyAChange = new EventEmitter<string>();
  @Output() keyBChange = new EventEmitter<string>();
}
