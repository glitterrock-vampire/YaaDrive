import { Component, HostListener, input, output } from '@angular/core';
import { IconComponent } from './icon.component';

/** Bottom sheet with a dimmed backdrop. Content is projected. */
@Component({
  selector: 'app-sheet',
  imports: [IconComponent],
  template: `
    <div class="backdrop" (click)="closed.emit()"></div>
    <section class="sheet" role="dialog" aria-modal="true" [attr.aria-label]="title()">
      <div class="sheet-handle" aria-hidden="true"></div>
      <header class="sheet-head">
        <h2>{{ title() }}</h2>
        <button type="button" class="icon-btn" aria-label="Close" (click)="closed.emit()"><app-icon name="x" [size]="18" /></button>
      </header>
      <div class="sheet-body"><ng-content /></div>
    </section>
  `,
})
export class SheetComponent {
  readonly title = input.required<string>();
  readonly closed = output<void>();

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.closed.emit();
  }
}
