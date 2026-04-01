import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DateRangePickerComponent } from '../../../shared/components/date-range-picker/date-range-picker.component';
import { APIKey, Project, DateRange } from '../../../core/models';

@Component({
  selector: 'app-filter-bar',
  standalone: true,
  imports: [CommonModule, FormsModule, DateRangePickerComponent],
  template: `
    <div class="filter-bar">
      <div class="scope-group">
        <label class="filter-label">Scope</label>
        <select class="filter-select" [ngModel]="scope" (ngModelChange)="onScopeChange($event)">
          <option value="org">Organisation</option>
          <option value="project">Project</option>
          <option value="api_key">API Key</option>
        </select>
        @if (scope === 'project' && projects.length > 0) {
          <select class="filter-select" [ngModel]="scopeId" (ngModelChange)="scopeIdChange.emit($event)">
            <option value="">All Projects</option>
            @for (p of projects; track p.id) {
              <option [value]="p.id">{{ p.name }}</option>
            }
          </select>
        }
        @if (scope === 'api_key' && keys.length > 0) {
          <select class="filter-select" [ngModel]="scopeId" (ngModelChange)="scopeIdChange.emit($event)">
            <option value="">Select Key</option>
            @for (k of keys; track k.id) {
              <option [value]="k.id">{{ k.name || k.redacted_value }} ({{ k.project_name }})</option>
            }
          </select>
        }
      </div>
      <app-date-range-picker [range]="dateRange" [cachedAt]="cachedAt" (rangeChange)="dateRangeChange.emit($event)" (refresh)="refreshChange.emit()"></app-date-range-picker>
    </div>
  `,
  styles: [`
    .filter-bar { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; padding: 16px 0; }
    .scope-group { display: flex; align-items: center; gap: 10px; }
    .filter-label { font-size: 13px; color: #64748b; white-space: nowrap; }
    .filter-select {
      padding: 6px 12px;
      background: #141624;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 6px;
      color: #e2e8f0;
      font-size: 13px;
      cursor: pointer;
    }
    .filter-select:focus { outline: none; border-color: rgba(99,102,241,0.5); }
  `],
})
export class FilterBarComponent {
  @Input() scope: 'org' | 'project' | 'api_key' = 'org';
  @Input() scopeId = '';
  @Input() dateRange!: DateRange;
  @Input() keys: APIKey[] = [];
  @Input() projects: Project[] = [];
  @Input() cachedAt: string | null = null;

  @Output() scopeChange = new EventEmitter<'org' | 'project' | 'api_key'>();
  @Output() scopeIdChange = new EventEmitter<string>();
  @Output() dateRangeChange = new EventEmitter<DateRange>();
  @Output() refreshChange = new EventEmitter<void>();

  onScopeChange(scope: 'org' | 'project' | 'api_key'): void {
    this.scopeChange.emit(scope);
    this.scopeIdChange.emit('');
  }
}
