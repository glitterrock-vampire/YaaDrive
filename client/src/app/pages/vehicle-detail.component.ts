import { CurrencyPipe, DatePipe, Location } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService, VehicleDetail } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { FavoritesService } from '../core/favorites.service';
import { CURRENCY, daysBetween, errorMessage, imageUrl, initials, nextDay, rangeHasWeekend, shortName, todayIso } from '../core/util';
import { IconComponent } from '../shared/icon.component';
import { SheetComponent } from '../shared/sheet.component';

@Component({
  selector: 'app-vehicle-detail',
  imports: [FormsModule, RouterLink, CurrencyPipe, DatePipe, IconComponent, SheetComponent],
  template: `
    @if (loading()) {
      <p class="muted center">Loading…</p>
    } @else if (loadError()) {
      <div class="pad">
        <div class="empty">
          <h3>{{ loadError() }}</h3>
          <a routerLink="/explore" class="btn btn-primary">Back to search</a>
        </div>
      </div>
    } @else if (detail(); as d) {
      <div class="detail">
        <div class="gallery">
          <div class="gallery-track" #track (scroll)="onScroll(track)" tabindex="0" aria-label="Vehicle photos">
            @for (src of photos(); track src) {
              <img [src]="src" [alt]="d.vehicle.make + ' ' + d.vehicle.model + ' photo'" />
            } @empty {
              <div class="placeholder gallery-empty" aria-hidden="true">{{ d.vehicle.make.charAt(0) }}</div>
            }
          </div>
          <div class="gallery-top">
            <button type="button" class="round-btn" aria-label="Back" (click)="back()"><app-icon name="chevron-left" [size]="22" /></button>
            <span class="title-pill">{{ d.vehicle.make }} {{ d.vehicle.model }}</span>
            <span class="spacer"></span>
            <button type="button" class="round-btn" aria-label="Share" (click)="share()"><app-icon name="share" [size]="20" /></button>
            <button
              type="button"
              class="round-btn"
              [class.on]="saved()"
              [attr.aria-pressed]="saved()"
              [attr.aria-label]="saved() ? 'Remove from saved cars' : 'Save this car'"
              (click)="toggleSaved()"
            >
              <app-icon name="heart" [size]="20" [filled]="saved()" />
            </button>
          </div>
          @if (photos().length > 1) {
            <span class="gallery-count" aria-live="polite">{{ index() + 1 }} / {{ photos().length }}</span>
          }
        </div>

        <div class="detail-body pad">
          @if (toast()) {
            <p class="toast" role="status">{{ toast() }}</p>
          }
          <h1>{{ d.vehicle.year }} {{ d.vehicle.make }} {{ d.vehicle.model }}</h1>
          <p class="rating-line">
            @if (d.vehicle.reviewCount > 0) {
              <span class="stars-inline"><app-icon name="star" [size]="16" [filled]="true" /> {{ d.vehicle.rating }}</span>
            } @else {
              <span class="muted">New</span>
            }
            <span class="muted">· {{ d.vehicle.trips }} trip{{ d.vehicle.trips === 1 ? '' : 's' }}</span>
          </p>
          <p class="big-price">
            <strong>{{ d.vehicle.pricePerDay | currency: currency : 'symbol' : '1.0-2' }}</strong><span class="per"> / day</span>
          </p>

          <ul class="rows card">
            <li><app-icon name="seat" [size]="20" /><span class="k">Seats</span><strong>{{ d.vehicle.seats }}</strong></li>
            @if (d.vehicle.rangeMiles) {
              <li><app-icon name="battery" [size]="20" /><span class="k">Range</span><strong>{{ d.vehicle.rangeMiles }} mi</strong></li>
            }
            <li><app-icon name="gear" [size]="20" /><span class="k">Gearbox</span><strong class="cap">{{ d.vehicle.transmission }}</strong></li>
            <li><app-icon name="fuel" [size]="20" /><span class="k">Fuel</span><strong class="cap">{{ d.vehicle.fuel }}</strong></li>
            <li><app-icon name="pin" [size]="20" /><span class="k">Pick-up</span><strong>{{ d.vehicle.location }}</strong></li>
            @if (!d.vehicle.availableWeekends) {
              <li><app-icon name="calendar" [size]="20" /><span class="k">Weekends</span><strong>Not available</strong></li>
            }
            <li class="host-row">
              <span class="avatar sm" aria-hidden="true">{{ ownerInitials() }}</span>
              <span class="k">Hosted by {{ ownerName() }}</span>
              <span class="muted small">
                @if (d.owner.rating > 0) { ★ {{ d.owner.rating }} · }
                since {{ d.owner.memberSince | date: 'MMM y' }}
              </span>
            </li>
          </ul>

          @if (isOwner()) {
            <a class="btn btn-primary btn-block btn-lg" [routerLink]="['/host/vehicles', d.vehicle.id, 'edit']">Edit your listing</a>
          } @else if (!d.vehicle.active) {
            <button type="button" class="btn btn-primary btn-block btn-lg" disabled>Not currently available</button>
          } @else if (!auth.loggedIn()) {
            <a class="btn btn-primary btn-block btn-lg" routerLink="/login" [queryParams]="{ returnUrl: router.url }">Sign in to rent</a>
          } @else if (auth.user()?.accountType !== 'renter') {
            <p class="alert alert-info" role="status">Only Renter accounts can request bookings.</p>
          } @else {
            <button type="button" class="btn btn-primary btn-block btn-lg" (click)="sheetOpen.set(true)">Request to rent</button>
          }

          @if (d.vehicle.description) {
            <section>
              <h2>About this car</h2>
              <p class="prewrap">{{ d.vehicle.description }}</p>
            </section>
          }

          <section>
            <h2>Reviews</h2>
            @if (d.reviews.length === 0) {
              <p class="muted">No reviews yet.</p>
            }
            @for (r of d.reviews; track r.id) {
              <article class="review">
                <div class="review-head">
                  <strong>{{ r.reviewerName }}</strong>
                  <span class="stars-inline" [attr.aria-label]="r.rating + ' out of 5'">
                    <app-icon name="star" [size]="14" [filled]="true" /> {{ r.rating }}
                  </span>
                  <span class="muted small">{{ r.createdAt | date: 'mediumDate' }}</span>
                </div>
                @if (r.comment) {
                  <p>{{ r.comment }}</p>
                }
              </article>
            }
          </section>
        </div>
      </div>

      @if (sheetOpen()) {
        <app-sheet [title]="requested() ? 'Request sent' : 'Choose your dates'" (closed)="sheetOpen.set(false)">
          @if (requested()) {
            <div class="stack">
              <p class="alert alert-success" role="status">
                {{ ownerName() }} will review your request. You can pay once the Host accepts.
              </p>
              <a routerLink="/trips" class="btn btn-primary btn-block">View my trips</a>
            </div>
          } @else {
            <form class="stack" (ngSubmit)="book()">
              <div class="row">
                <label class="field">
                  <span>Pick-up</span>
                  <input type="date" name="start" [(ngModel)]="start" [min]="today" required />
                </label>
                <label class="field">
                  <span>Return</span>
                  <input type="date" name="end" [(ngModel)]="end" [min]="endMin()" required />
                </label>
              </div>

              @if (days() > 0) {
                <dl class="summary">
                  <div>
                    <dt>{{ d.vehicle.pricePerDay | currency: currency : 'symbol' : '1.0-2' }} × {{ days() }} day{{ days() === 1 ? '' : 's' }}</dt>
                    <dd>{{ total() | currency: currency : 'symbol' : '1.2-2' }}</dd>
                  </div>
                  <div class="total"><dt>Total</dt><dd>{{ total() | currency: currency : 'symbol' : '1.2-2' }}</dd></div>
                </dl>
              }

              @if (conflict()) {
                <p class="alert alert-error" role="alert">Those dates overlap an existing booking. Pick other dates.</p>
              } @else if (weekendBlocked()) {
                <p class="alert alert-error" role="alert">This car isn't available on weekends. Choose weekday dates only.</p>
              }
              @if (error()) {
                <p class="alert alert-error" role="alert">{{ error() }}</p>
              }

              <button type="submit" class="btn btn-primary btn-block btn-lg" [disabled]="busy() || days() < 1 || conflict() || weekendBlocked()">
                {{ busy() ? 'Sending…' : 'Request to rent' }}
              </button>
              <p class="muted small center-text">You won't be charged until the Host accepts.</p>

              @if (d.unavailable.length > 0) {
                <div>
                  <p class="small"><strong>Already booked</strong></p>
                  <ul class="small muted plain">
                    @for (u of d.unavailable; track u.start) {
                      <li>{{ u.start | date: 'MMM d' }} – {{ u.end | date: 'MMM d' }}</li>
                    }
                  </ul>
                </div>
              }
            </form>
          }
        </app-sheet>
      }
    }
  `,
})
export class VehicleDetailComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private ngLocation = inject(Location);
  private favorites = inject(FavoritesService);
  protected router = inject(Router);
  protected auth = inject(AuthService);

  protected readonly currency = CURRENCY;
  protected readonly today = todayIso();

  protected readonly detail = signal<VehicleDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly requested = signal(false);
  protected readonly sheetOpen = signal(false);
  protected readonly index = signal(0);
  protected readonly toast = signal('');

  // Date inputs use ngModel on plain fields, mirrored into signals so the totals stay reactive.
  private readonly startSig = signal('');
  private readonly endSig = signal('');
  protected get start(): string {
    return this.startSig();
  }
  protected set start(v: string) {
    this.startSig.set(v ?? '');
  }
  protected get end(): string {
    return this.endSig();
  }
  protected set end(v: string) {
    this.endSig.set(v ?? '');
  }

  protected readonly photos = computed(() =>
    (this.detail()?.vehicle.photos ?? []).map((p) => imageUrl(p)).filter((p): p is string => !!p),
  );
  protected readonly isOwner = computed(() => this.detail()?.vehicle.ownerId === this.auth.user()?.id);
  protected readonly saved = computed(() => {
    const id = this.detail()?.vehicle.id;
    return id !== undefined && this.favorites.has(id);
  });
  protected readonly ownerName = computed(() => shortName(this.detail()?.owner.name ?? ''));
  protected readonly ownerInitials = computed(() => initials(this.detail()?.owner.name ?? ''));
  protected readonly days = computed(() => Math.max(0, daysBetween(this.startSig(), this.endSig())));
  protected readonly total = computed(() => Math.round(this.days() * (this.detail()?.vehicle.pricePerDay ?? 0) * 100) / 100);
  protected readonly conflict = computed(() => {
    const s = this.startSig();
    const e = this.endSig();
    if (!s || !e || e <= s) return false;
    return (this.detail()?.unavailable ?? []).some((u) => s < u.end && e > u.start);
  });
  protected readonly weekendBlocked = computed(
    () => this.detail()?.vehicle.availableWeekends === false && rangeHasWeekend(this.startSig(), this.endSig()),
  );

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap;
    this.start = q.get('start') ?? '';
    this.end = q.get('end') ?? '';

    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.getVehicle(id).subscribe({
      next: (d) => {
        this.detail.set(d);
        this.loading.set(false);
      },
      error: (err) => {
        this.loadError.set(err?.status === 404 ? 'Vehicle not found' : errorMessage(err));
        this.loading.set(false);
      },
    });
  }

  protected endMin(): string {
    return this.start ? nextDay(this.start) : this.today;
  }

  protected onScroll(track: HTMLElement): void {
    if (track.clientWidth > 0) this.index.set(Math.round(track.scrollLeft / track.clientWidth));
  }

  protected back(): void {
    if (window.history.length > 1) this.ngLocation.back();
    else this.router.navigateByUrl('/explore');
  }

  protected toggleSaved(): void {
    const id = this.detail()?.vehicle.id;
    if (id !== undefined) this.favorites.toggle(id);
  }

  protected share(): void {
    const d = this.detail();
    if (!d) return;
    const url = window.location.href;
    const title = `${d.vehicle.year} ${d.vehicle.make} ${d.vehicle.model} on YaadDrive`;
    if (navigator.share) {
      navigator.share({ title, url }).catch(() => undefined);
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(
        () => this.flash('Link copied'),
        () => this.flash('Could not copy the link'),
      );
    }
  }

  protected book(): void {
    const d = this.detail();
    if (!d || this.days() < 1) return;
    this.busy.set(true);
    this.error.set('');
    this.api.requestBooking({ vehicleId: d.vehicle.id, startDate: this.start, endDate: this.end }).subscribe({
      next: () => {
        this.busy.set(false);
        this.requested.set(true);
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(errorMessage(err));
      },
    });
  }

  private flash(message: string): void {
    this.toast.set(message);
    setTimeout(() => this.toast.set(''), 2500);
  }
}
