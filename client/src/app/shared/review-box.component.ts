import { Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { errorMessage } from '../core/util';

@Component({
  selector: 'app-review-box',
  imports: [FormsModule],
  template: `
    <form class="panel stack" (ngSubmit)="submit()">
      <h4>{{ heading() }}</h4>
      <div class="stars" role="radiogroup" aria-label="Rating">
        @for (n of [1, 2, 3, 4, 5]; track n) {
          <button
            type="button"
            class="star"
            [class.on]="n <= rating()"
            role="radio"
            [attr.aria-checked]="n === rating()"
            [attr.aria-label]="n + (n === 1 ? ' star' : ' stars')"
            (click)="rating.set(n)"
          >★</button>
        }
      </div>
      <label class="field">
        <span>Comment (optional)</span>
        <textarea name="comment" rows="3" maxlength="1000" [(ngModel)]="comment" placeholder="How did it go?"></textarea>
      </label>
      @if (error()) {
        <p class="alert alert-error" role="alert">{{ error() }}</p>
      }
      <div class="row actions">
        <button type="submit" class="btn btn-primary" [disabled]="busy() || rating() === 0">Submit review</button>
        <button type="button" class="btn btn-ghost" (click)="closed.emit()" [disabled]="busy()">Cancel</button>
      </div>
    </form>
  `,
})
export class ReviewBoxComponent {
  private api = inject(ApiService);

  readonly bookingId = input.required<number>();
  readonly heading = input('Leave a review');
  readonly done = output<void>();
  readonly closed = output<void>();

  protected readonly rating = signal(0);
  protected comment = '';
  protected readonly busy = signal(false);
  protected readonly error = signal('');

  protected submit(): void {
    if (this.rating() === 0) return;
    this.busy.set(true);
    this.error.set('');
    this.api.review({ bookingId: this.bookingId(), rating: this.rating(), comment: this.comment }).subscribe({
      next: () => {
        this.busy.set(false);
        this.done.emit();
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(errorMessage(err));
      },
    });
  }
}
