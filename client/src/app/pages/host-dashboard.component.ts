import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { ApiService, Booking, Dashboard } from '../core/api.service';
import { CURRENCY, errorMessage, imageUrl, initials, monthShort, rangeLabel, shortName, todayIso } from '../core/util';
import { IconComponent } from '../shared/icon.component';
import { ReviewBoxComponent } from '../shared/review-box.component';

type DashVehicle = Dashboard['vehicles'][number];

@Component({
  selector: 'app-host-dashboard',
  imports: [RouterLink, RouterOutlet, CurrencyPipe, IconComponent, ReviewBoxComponent],
  template: `
    <div class="pad">
      <header class="page-title">
        <div>
          <h1>Host</h1>
          <p class="muted">Share your car. Earn on your terms.</p>
        </div>
        <a routerLink="/host/vehicles/new" class="round-btn soft" aria-label="List a car"><app-icon name="plus" [size]="22" /></a>
      </header>

      @if (message()) {
        <p class="alert alert-success" role="status">{{ message() }}</p>
      }
      @if (error()) {
        <p class="alert alert-error" role="alert">{{ error() }}</p>
      }

      @if (loading()) {
        <p class="muted center">Loading…</p>
      } @else if (data(); as d) {
        <section class="card earnings" aria-label="Earnings">
          <div class="earnings-figures">
            <h2>Earnings</h2>
            <p class="earnings-amount">{{ d.thisMonth | currency: currency : 'symbol' : '1.0-0' }}</p>
            <p class="muted">this month</p>
            @if (d.changePct !== null) {
              <p class="change" [class.down]="d.changePct < 0">
                <app-icon [name]="d.changePct < 0 ? 'arrow-down-right' : 'arrow-up-right'" [size]="18" />
                {{ d.changePct > 0 ? '+' : '' }}{{ d.changePct }}%
              </p>
              <p class="muted">vs. last month</p>
            } @else {
              <p class="muted small">Nothing to compare with last month yet.</p>
            }
          </div>
          <div class="bars" role="img" [attr.aria-label]="chartLabel()">
            @for (m of d.monthly; track m.month; let last = $last) {
              <div class="bar-col">
                <div class="bar" [class.current]="last" [style.height.%]="barHeight(m.amount)"></div>
                <span class="muted small" [class.strong]="last">{{ monthName(m.month) }}</span>
              </div>
            }
          </div>
        </section>

        <section>
          <header class="section-head">
            <h2>Booking requests</h2>
            @if (pending().length > 3) {
              <button type="button" class="link-btn" (click)="toggleAllRequests()">
                {{ showAllRequests() ? 'Show less' : 'See all' }} <app-icon name="chevron-right" [size]="16" />
              </button>
            }
          </header>
          @if (pending().length === 0) {
            <p class="card note">No requests right now. They'll show up here when renters ask to book.</p>
          } @else {
            <ul class="card list">
              @for (b of visibleRequests(); track b.id) {
                <li class="request">
                  <span class="avatar" aria-hidden="true">{{ initialsOf(b.renterName) }}</span>
                  <div class="request-info">
                    <strong>{{ shortName(b.renterName) }}</strong>
                    <span>{{ range(b) }}</span>
                    <span class="muted">{{ b.vehicle.make }} {{ b.vehicle.model }}</span>
                  </div>
                  <div class="request-actions">
                    <button type="button" class="btn btn-primary btn-pill" (click)="respond(b, 'accept')" [disabled]="busyId() === b.id">Approve</button>
                    <button type="button" class="btn btn-gray btn-pill" (click)="respond(b, 'decline')" [disabled]="busyId() === b.id">Decline</button>
                  </div>
                </li>
              }
            </ul>
          }
        </section>

        <section>
          <header class="section-head">
            <h2>My cars</h2>
            @if (d.vehicles.length > 3) {
              <button type="button" class="link-btn" (click)="toggleAllCars()">
                {{ showAllCars() ? 'Show less' : 'See all' }} <app-icon name="chevron-right" [size]="16" />
              </button>
            }
          </header>
          @if (d.vehicles.length === 0) {
            <p class="card note">You haven't listed a car yet.</p>
          } @else {
            <ul class="card list">
              @for (v of visibleCars(); track v.id) {
                <li class="car-row">
                  <div class="car-thumb">
                    @if (photo(v); as src) {
                      <img [src]="src" alt="" />
                    } @else {
                      <div class="placeholder" aria-hidden="true">{{ v.make.charAt(0) }}</div>
                    }
                  </div>
                  <div class="car-info">
                    <strong>{{ v.make }} {{ v.model }}</strong>
                    <span class="status"><i class="dot" [class]="v.status"></i>{{ statusLabel(v) }}</span>
                    <span class="muted">{{ v.pricePerDay | currency: currency : 'symbol' : '1.0-2' }}/day</span>
                  </div>
                  <button
                    type="button"
                    class="switch"
                    role="switch"
                    [class.on]="v.active"
                    [attr.aria-checked]="v.active"
                    [attr.aria-label]="(v.active ? 'Unlist ' : 'List ') + v.make + ' ' + v.model"
                    [disabled]="busyId() === v.id"
                    (click)="toggleListed(v)"
                  ><span class="knob"></span></button>
                  <a [routerLink]="['/host/vehicles', v.id, 'edit']" class="chev" [attr.aria-label]="'Edit ' + v.make + ' ' + v.model">
                    <app-icon name="chevron-right" [size]="20" />
                  </a>
                </li>
              }
            </ul>
          }
        </section>

        @if (activeTrips().length > 0) {
          <section>
            <header class="section-head"><h2>Trips</h2></header>
            <ul class="card list">
              @for (b of activeTrips(); track b.id) {
                <li class="trip">
                  <div class="trip-top">
                    <span class="avatar" aria-hidden="true">{{ initialsOf(b.renterName) }}</span>
                    <div class="request-info">
                      <strong>{{ shortName(b.renterName) }}</strong>
                      <span>{{ range(b) }} · {{ b.vehicle.make }} {{ b.vehicle.model }}</span>
                      @if (b.renterEmail || b.renterPhone) {
                        <span class="muted small">{{ b.renterEmail }}{{ b.renterPhone ? ' · ' + b.renterPhone : '' }}</span>
                      }
                    </div>
                    <div class="trip-side">
                      <span class="badge badge-{{ b.status }}">{{ b.status }}</span>
                      <span class="muted small">{{ b.paymentStatus }}</span>
                    </div>
                  </div>
                  <div class="row actions">
                    @if (b.status === 'confirmed' && b.paymentStatus === 'paid' && b.startDate <= today) {
                      <button type="button" class="btn btn-primary btn-sm" (click)="complete(b)" [disabled]="busyId() === b.id">Mark completed</button>
                    }
                    @if (b.status === 'confirmed' && b.paymentStatus === 'unpaid') {
                      <span class="muted small">Waiting for the renter to pay</span>
                    }
                    @if (b.status === 'confirmed' && b.startDate > today) {
                      <button type="button" class="btn btn-ghost btn-sm" (click)="cancel(b)" [disabled]="busyId() === b.id">Cancel trip</button>
                    }
                    @if (b.status === 'completed' && !b.reviewedByMe) {
                      <button type="button" class="btn btn-secondary btn-sm" (click)="reviewingId.set(b.id)">Review renter</button>
                    }
                  </div>
                  @if (reviewingId() === b.id) {
                    <app-review-box [bookingId]="b.id" [heading]="'How was ' + shortName(b.renterName) + ' as a renter?'" (done)="afterReview()" (closed)="reviewingId.set(null)" />
                  }
                </li>
              }
            </ul>
          </section>
        }

        <section>
          <header class="section-head"><h2>Booking history</h2></header>
          @if (historyTrips().length === 0) {
            <p class="card note">Completed, declined, and cancelled bookings will appear here.</p>
          } @else {
            <ul class="card list">
              @for (b of historyTrips(); track b.id) {
                <li class="request">
                  <span class="avatar" aria-hidden="true">{{ initialsOf(b.renterName) }}</span>
                  <div class="request-info">
                    <strong>{{ shortName(b.renterName) }}</strong>
                    <span>{{ range(b) }} · {{ b.vehicle.make }} {{ b.vehicle.model }}</span>
                  </div>
                  <div class="trip-side">
                    <span class="badge badge-{{ b.status }}">{{ b.status }}</span>
                    <strong>{{ b.totalPrice | currency: currency : 'symbol' : '1.0-2' }}</strong>
                  </div>
                </li>
              }
            </ul>
          }
        </section>

        <a routerLink="/host/vehicles/new" class="btn btn-primary btn-block btn-lg">List your car</a>
      }
    </div>

    <!-- "List your car" / "Edit your car" sheet. Refresh the numbers when it closes (after a save, for example). -->
    <router-outlet (deactivate)="reload()" />
  `,
})
export class HostDashboardComponent implements OnInit {
  private api = inject(ApiService);

  protected readonly currency = CURRENCY;
  protected readonly today = todayIso();
  protected readonly shortName = shortName;
  protected readonly initialsOf = initials;

  protected readonly data = signal<Dashboard | null>(null);
  protected readonly requests = signal<Booking[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly message = signal('');
  protected readonly busyId = signal<number | null>(null);
  protected readonly reviewingId = signal<number | null>(null);
  protected readonly showAllRequests = signal(false);
  protected readonly showAllCars = signal(false);

  protected readonly pending = computed(() => this.requests().filter((b) => b.status === 'pending'));
  protected readonly visibleRequests = computed(() => (this.showAllRequests() ? this.pending() : this.pending().slice(0, 3)));
  /** Accepted or finished trips, so the owner can mark them complete, cancel or review. */
  protected readonly activeTrips = computed(() => this.requests().filter((b) => b.status === 'confirmed' || (b.status === 'completed' && !b.reviewedByMe)));
  protected readonly historyTrips = computed(() => this.requests().filter((b) => ['completed', 'declined', 'cancelled'].includes(b.status)));
  protected readonly visibleCars = computed(() => {
    const cars = this.data()?.vehicles ?? [];
    return this.showAllCars() ? cars : cars.slice(0, 3);
  });

  private readonly maxMonthly = computed(() => Math.max(1, ...(this.data()?.monthly.map((m) => m.amount) ?? [0])));
  protected readonly chartLabel = computed(
    () => 'Earnings by month: ' + (this.data()?.monthly.map((m) => `${monthShort(m.month)} ${m.amount}`).join(', ') ?? ''),
  );

  ngOnInit(): void {
    this.load();
  }

  protected monthName(ym: string): string {
    return monthShort(ym);
  }

  protected toggleAllRequests(): void {
    this.showAllRequests.update((value) => !value);
  }

  protected toggleAllCars(): void {
    this.showAllCars.update((value) => !value);
  }

  protected barHeight(amount: number): number {
    return amount <= 0 ? 3 : Math.max(8, Math.round((amount / this.maxMonthly()) * 100));
  }

  protected range(b: Booking): string {
    return rangeLabel(b.startDate, b.endDate);
  }

  protected photo(v: DashVehicle): string | null {
    return imageUrl(v.imageUrl);
  }

  protected statusLabel(v: DashVehicle): string {
    return v.status === 'booked' ? 'Booked' : v.status === 'listed' ? 'Listed' : 'Unlisted';
  }

  protected toggleListed(v: DashVehicle): void {
    this.busyId.set(v.id);
    this.error.set('');
    this.message.set('');
    this.api.setVehicleActive(v.id, !v.active).subscribe({
      next: () => {
        this.busyId.set(null);
        this.load();
      },
      error: (err) => {
        this.busyId.set(null);
        this.error.set(errorMessage(err));
      },
    });
  }

  protected respond(b: Booking, action: 'accept' | 'decline'): void {
    this.run(b.id, this.api.respond(b.id, action), action === 'accept' ? 'Request approved. The renter can now pay.' : 'Request declined.');
  }

  protected complete(b: Booking): void {
    this.run(b.id, this.api.complete(b.id), 'Trip marked as completed. You can now review the renter.');
  }

  protected cancel(b: Booking): void {
    if (!confirm('Cancel this trip? A paid booking will be refunded to the renter.')) return;
    this.run(b.id, this.api.cancel(b.id), 'Trip cancelled.');
  }

  protected afterReview(): void {
    this.reviewingId.set(null);
    this.message.set('Thanks for your review!');
    this.load();
  }

  private run(id: number, call: ReturnType<ApiService['respond']>, success: string): void {
    this.busyId.set(id);
    this.error.set('');
    this.message.set('');
    call.subscribe({
      next: () => {
        this.busyId.set(null);
        this.message.set(success);
        this.load();
      },
      error: (err) => {
        this.busyId.set(null);
        this.error.set(errorMessage(err));
      },
    });
  }

  protected reload(): void {
    this.load();
  }

  private load(): void {
    this.api.ownerDashboard().subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
    this.api.incomingRequests().subscribe({
      next: (res) => this.requests.set(res.bookings),
      error: (err) => this.error.set(errorMessage(err)),
    });
  }
}
