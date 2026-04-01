import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-error-message',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (message) {
      <div class="error-banner">
        <span class="error-icon">!</span>
        <span class="error-text">{{ message }}</span>
        @if (showRetry) {
          <button class="retry-btn" (click)="retry.emit()">Retry</button>
        }
      </div>
    }
  `,
  styles: [`
    .error-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 8px;
      color: #fca5a5;
    }
    .error-icon {
      font-weight: 700;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: rgba(239, 68, 68, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .error-text { flex: 1; font-size: 14px; }
    .retry-btn {
      padding: 4px 12px;
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid rgba(239, 68, 68, 0.4);
      border-radius: 4px;
      color: #fca5a5;
      cursor: pointer;
      font-size: 13px;
    }
    .retry-btn:hover { background: rgba(239, 68, 68, 0.3); }
  `],
})
export class ErrorMessageComponent {
  @Input() message: string | null = null;
  @Input() showRetry = true;
  @Output() retry = new EventEmitter<void>();
}
