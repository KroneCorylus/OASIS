import { Directive, ElementRef, HostListener, Input, OnDestroy, Renderer2 } from '@angular/core';

@Directive({ selector: '[appTooltip]', standalone: true })
export class TooltipDirective implements OnDestroy {
  @Input('appTooltip') tooltipText = '';

  private tooltip: HTMLElement | null = null;

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  @HostListener('mouseenter')
  show(): void {
    if (!this.tooltipText) return;
    this.tooltip = this.renderer.createElement('div');
    this.renderer.addClass(this.tooltip, 'app-tooltip');
    this.renderer.setProperty(this.tooltip, 'textContent', this.tooltipText);
    this.renderer.setStyle(this.tooltip, 'position', 'fixed');
    this.renderer.setStyle(this.tooltip, 'background', '#1a1d2e');
    this.renderer.setStyle(this.tooltip, 'border', '1px solid rgba(255,255,255,0.1)');
    this.renderer.setStyle(this.tooltip, 'color', '#e2e8f0');
    this.renderer.setStyle(this.tooltip, 'padding', '6px 10px');
    this.renderer.setStyle(this.tooltip, 'border-radius', '6px');
    this.renderer.setStyle(this.tooltip, 'font-size', '12px');
    this.renderer.setStyle(this.tooltip, 'z-index', '9999');
    this.renderer.setStyle(this.tooltip, 'pointer-events', 'none');
    this.renderer.setStyle(this.tooltip, 'white-space', 'nowrap');
    document.body.appendChild(this.tooltip!);
    this.position();
  }

  @HostListener('mousemove')
  position(): void {
    if (!this.tooltip) return;
    const rect = this.el.nativeElement.getBoundingClientRect();
    this.renderer.setStyle(this.tooltip, 'top', `${rect.top - 36}px`);
    this.renderer.setStyle(this.tooltip, 'left', `${rect.left + rect.width / 2 - 50}px`);
  }

  @HostListener('mouseleave')
  hide(): void {
    if (this.tooltip) {
      document.body.removeChild(this.tooltip);
      this.tooltip = null;
    }
  }

  ngOnDestroy(): void {
    this.hide();
  }
}
