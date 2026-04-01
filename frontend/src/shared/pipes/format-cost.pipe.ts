import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'formatCost', standalone: true })
export class FormatCostPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value == null) return '—';
    if (value >= 1000) return '$' + value.toFixed(0);
    if (value >= 1) return '$' + value.toFixed(2);
    return '$' + value.toFixed(4);
  }
}
