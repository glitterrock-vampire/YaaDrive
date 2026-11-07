import { CurrencyPipe } from '@angular/common';
import { Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { CURRENCY, errorMessage } from '../core/util';

/** Simulated checkout. The API validates the card, keeps only brand + last 4 digits, and never stores the CVC. */
@Component({
  selector: 'app-pay-form',
  imports: [FormsModule, CurrencyPipe],
  template: `
    <form class="panel stack" (ngSubmit)="submit()" #f="ngForm" novalidate>
      <h4>Pay {{ amount() | currency: currency : 'symbol' : '1.2-2' }}</h4>
      <p class="muted small">Demo checkout, nothing is charged. Try card 4242 4242 4242 4242 with any future expiry.</p>

      <label class="field">
        <span>Name on card</span>
        <input name="cardName" [(ngModel)]="card.cardName" required minlength="2" autocomplete="cc-name" />
      </label>
      <label class="field">
        <span>Card number</span>
        <input name="cardNumber" [(ngModel)]="card.cardNumber" required inputmode="numeric" autocomplete="cc-number" placeholder="4242 4242 4242 4242" />
      </label>
      <div class="row">
        <label class="field">
          <span>Expiry (MM/YY)</span>
          <input name="expiry" [(ngModel)]="card.expiry" required placeholder="12/29" autocomplete="cc-exp" maxlength="5" />
        </label>
        <label class="field">
          <span>CVC</span>
          <input name="cvc" [(ngModel)]="card.cvc" required inputmode="numeric" autocomplete="cc-csc" maxlength="4" />
        </label>
      </div>

      @if (error()) {
        <p class="alert alert-error" role="alert">{{ error() }}</p>
      }
      <div class="row actions">
        <button type="submit" class="btn btn-primary" [disabled]="busy() || f.invalid">
          {{ busy() ? 'Processing…' : 'Pay now' }}
        </button>
        <button type="button" class="btn btn-ghost" (click)="cancelled.emit()" [disabled]="busy()">Not now</button>
      </div>
    </form>
  `,
})
export class PayFormComponent {
  private api = inject(ApiService);

  readonly bookingId = input.required<number>();
  readonly amount = input.required<number>();
  readonly paid = output<void>();
  readonly cancelled = output<void>();

  protected readonly currency = CURRENCY;
  protected card = { cardName: '', cardNumber: '', expiry: '', cvc: '' };
  protected readonly busy = signal(false);
  protected readonly error = signal('');

  protected submit(): void {
    this.busy.set(true);
    this.error.set('');
    this.api.pay(this.bookingId(), this.card).subscribe({
      next: () => {
        this.busy.set(false);
        this.paid.emit();
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(errorMessage(err));
      },
    });
  }
}
