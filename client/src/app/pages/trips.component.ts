import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService, Booking } from '../core/api.service';
import { CURRENCY, errorMessage, imageUrl, todayIso } from '../core/util';
import { PayFormComponent } from '../shared/pay-form.component';
import { ReviewBoxComponent } from '../shared/review-box.component';

@Component({
  selector: 'app-trips',
  imports: [RouterLink, CurrencyPipe, DatePipe, PayFormComponent, ReviewBoxComponent],
  template: `
    <div class="pad">
    <header class="page-title"><div><h1>Trips</h1><p class="muted">Manage upcoming bookings and see your past rental history.</p></div></header>

    @if (message()) {
      <p class="alert alert-success" role="status">{{ message() }}</p>
    }
    @if (error()) {
      <p class="alert alert-error" role="alert">{{ error() }}</p>
    }

    @if (loading()) {
      <p class="muted center">Loading…</p>
    } @else if (bookings().length === 0) {
      <div class="empty">
        <h3>No trips yet</h3>
        <p class="muted">Find a car and send your first booking request.</p>
        <a routerLink="/explore" class="btn btn-primary">Find a car</a>
      </div>
    } @else {
      <div class="stack">
        @for (b of orderedBookings(); track b.id; let first = $first; let index = $index) {
          @if (first || isHistory(b) !== isHistory(orderedBookings()[index - 1])) {
            <header class="section-head"><h2>{{ isHistory(b) ? 'History' : 'Upcoming' }}</h2></header>
          }
          <article class="card booking">
            <div class="booking-row">
              <div class="booking-thumb">
                @if (photo(b); as src) {
                  <img [src]="src" alt="" />
                } @else {
                  <div class="placeholder" aria-hidden="true">{{ b.vehicle.make.charAt(0) }}</div>
                }
              </div>
              <div class="booking-info">
                <h3><a [routerLink]="['/vehicles', b.vehicleId]">{{ b.vehicle.year }} {{ b.vehicle.make }} {{ b.vehicle.model }}</a></h3>
                <p class="muted">{{ b.vehicle.location }} · hosted by {{ b.ownerName }}</p>
                <p>{{ b.startDate | date: 'EEE, MMM d' }} → {{ b.endDate | date: 'EEE, MMM d' }} · {{ b.days }} day{{ b.days === 1 ? '' : 's' }}</p>
              </div>
              <div class="booking-side">
                <span class="badge badge-{{ b.status }}">{{ b.status }}</span>
                <strong>{{ b.totalPrice | currency: currency : 'symbol' : '1.2-2' }}</strong>
                @if (b.paymentStatus === 'paid') {
                  <span class="muted small">Paid{{ b.cardLast4 ? ' · ' + b.cardBrand + ' ••' + b.cardLast4 : '' }}</span>
                } @else if (b.paymentStatus === 'refunded') {
                  <span class="muted small">Refunded</span>
                }
              </div>
            </div>

            <div class="row actions">
              @if (b.status === 'confirmed' && b.paymentStatus === 'unpaid') {
                <button type="button" class="btn btn-primary btn-sm" (click)="openPay(b.id)">Pay now</button>
              }
              @if (b.status === 'completed' && !b.reviewedByMe) {
                <button type="button" class="btn btn-secondary btn-sm" (click)="openReview(b.id)">Leave a review</button>
              }
              @if (canCancel(b)) {
                <button type="button" class="btn btn-ghost btn-sm" (click)="cancel(b)" [disabled]="busyId() === b.id">
                  {{ b.status === 'pending' ? 'Withdraw request' : b.paymentStatus === 'paid' ? 'Cancel & refund' : 'Cancel trip' }}
                </button>
              }
              @if (b.status === 'pending') {
                <span class="muted small">Waiting for host {{ b.ownerName }} to respond</span>
              }
              @if (b.status === 'confirmed' && b.paymentStatus === 'unpaid') {
                <span class="muted small">Accepted. Pay to lock in your trip.</span>
              }
            </div>

            @if (payingId() === b.id) {
              <app-pay-form [bookingId]="b.id" [amount]="b.totalPrice" (paid)="afterPay()" (cancelled)="payingId.set(null)" />
            }
            @if (reviewingId() === b.id) {
              <app-review-box [bookingId]="b.id" heading="How was the vehicle and host?" (done)="afterReview()" (closed)="reviewingId.set(null)" />
            }
          </article>
        }
      </div>
    }
    </div>
  `,
})
export class TripsComponent implements OnInit {
  private api = inject(ApiService);

  protected readonly currency = CURRENCY;
  private readonly today = todayIso();

  protected readonly bookings = signal<Booking[]>([]);
  protected readonly orderedBookings = computed(() => [...this.bookings()].sort((a, b) => {
    const historyOrder = Number(this.isHistory(a)) - Number(this.isHistory(b));
    return historyOrder || b.startDate.localeCompare(a.startDate);
  }));
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly message = signal('');
  protected readonly payingId = signal<number | null>(null);
  protected readonly reviewingId = signal<number | null>(null);
  protected readonly busyId = signal<number | null>(null);

  ngOnInit(): void {
    this.load();
  }

  protected photo(b: Booking): string | null {
    return imageUrl(b.vehicle.imageUrl);
  }

  protected isHistory(b: Booking): boolean {
    return ['completed', 'declined', 'cancelled'].includes(b.status) || b.endDate < this.today;
  }

  protected canCancel(b: Booking): boolean {
    return b.status === 'pending' || (b.status === 'confirmed' && b.startDate > this.today);
  }

  protected openPay(id: number): void {
    this.reviewingId.set(null);
    this.payingId.set(id);
  }

  protected openReview(id: number): void {
    this.payingId.set(null);
    this.reviewingId.set(id);
  }

  protected afterPay(): void {
    this.payingId.set(null);
    this.message.set('Payment received. Your trip is confirmed.');
    this.load();
  }

  protected afterReview(): void {
    this.reviewingId.set(null);
    this.message.set('Thanks for your review!');
    this.load();
  }

  protected cancel(b: Booking): void {
    const refund = b.paymentStatus === 'paid' ? ' You will be refunded.' : '';
    if (!confirm(`Cancel this ${b.status === 'pending' ? 'request' : 'trip'}?${refund}`)) return;
    this.busyId.set(b.id);
    this.error.set('');
    this.api.cancel(b.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.message.set('Trip cancelled.');
        this.load();
      },
      error: (err) => {
        this.busyId.set(null);
        this.error.set(errorMessage(err));
      },
    });
  }

  private load(): void {
    this.api.myTrips().subscribe({
      next: (res) => {
        this.bookings.set(res.bookings);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }
}
