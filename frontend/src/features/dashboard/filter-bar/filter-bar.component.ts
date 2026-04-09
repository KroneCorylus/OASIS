import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
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
        <label class="filter-label">Project</label>
        <select class="filter-select" [ngModel]="selectedProjectId" (ngModelChange)="onProjectChange($event)">
          <option value="">All</option>
          @for (p of projects; track p.id) {
            <option [value]="p.id">{{ p.name }}</option>
          }
        </select>
        @if (selectedProjectId) {
          <label class="filter-label">API Key</label>
          <select class="filter-select" [ngModel]="selectedKeyId" (ngModelChange)="onKeyChange($event)">
            <option value="">All</option>
            @for (k of filteredKeys; track k.id) {
              <option [value]="k.id">{{ k.name || k.redacted_value }}</option>
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
export class FilterBarComponent implements OnChanges {
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

  selectedProjectId = '';
  selectedKeyId = '';

  private initialized = false;

  get filteredKeys(): APIKey[] {
    return this.keys.filter(k => k.project_id === this.selectedProjectId);
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Restore selections from URL params once keys and projects have loaded.
    if (!this.initialized && this.keys.length > 0 && this.projects.length > 0) {
      if (this.scope === 'api_key' && this.scopeId) {
        const key = this.keys.find(k => k.id === this.scopeId);
        this.selectedProjectId = key?.project_id ?? '';
        this.selectedKeyId = this.scopeId;
      } else if (this.scope === 'project' && this.scopeId) {
        this.selectedProjectId = this.scopeId;
        this.selectedKeyId = '';
      }
      this.initialized = true;
    }
  }

  onProjectChange(projectId: string): void {
    this.selectedProjectId = projectId;
    this.selectedKeyId = '';
    if (projectId) {
      this.scopeChange.emit('project');
      this.scopeIdChange.emit(projectId);
    } else {
      this.scopeChange.emit('org');
      this.scopeIdChange.emit('');
    }
  }

  onKeyChange(keyId: string): void {
    this.selectedKeyId = keyId;
    if (keyId) {
      this.scopeChange.emit('api_key');
      this.scopeIdChange.emit(keyId);
    } else {
      this.scopeChange.emit('project');
      this.scopeIdChange.emit(this.selectedProjectId);
    }
  }
}
