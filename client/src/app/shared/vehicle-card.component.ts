import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Vehicle } from '../core/api.service';
import { FavoritesService } from '../core/favorites.service';
import { CURRENCY, imageUrl } from '../core/util';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-vehicle-card',
  imports: [RouterLink, CurrencyPipe, IconComponent],
  template: `
    <article class="vc" [class.selected]="selected()">
      <a class="vc-link" [routerLink]="['/vehicles', vehicle().id]" [queryParams]="carriedDates()">
        <div class="vc-media">
          @if (photo(); as src) {
            <img [src]="src" [alt]="vehicle().make + ' ' + vehicle().model" loading="lazy" />
          } @else {
            <div class="placeholder" aria-hidden="true">{{ vehicle().make.charAt(0) }}</div>
          }
        </div>
        <div class="vc-body">
          <h3>{{ vehicle().make }} {{ vehicle().model }}</h3>
          <p class="vc-price">
            <strong>{{ vehicle().pricePerDay | currency: currency : 'symbol' : '1.0-2' }}</strong><span class="per">/day</span>
          </p>
          <p class="vc-sub"><app-icon name="pin" [size]="14" /> {{ subline() }}</p>
        </div>
      </a>
      <button
        type="button"
        class="heart"
        [class.on]="saved()"
        [attr.aria-pressed]="saved()"
        [attr.aria-label]="saved() ? 'Remove from saved cars' : 'Save this car'"
        (click)="toggle($event)"
      >
        <app-icon name="heart" [size]="18" [filled]="saved()" />
      </button>
    </article>
  `,
})
export class VehicleCardComponent {
  private favorites = inject(FavoritesService);

  readonly vehicle = input.required<Vehicle>();
  /** Search dates, carried through to the detail page so the booking sheet is pre-filled. */
  readonly start = input('');
  readonly end = input('');
  /** e.g. '0.4 mi away'; falls back to the vehicle's town. */
  readonly distance = input('');
  readonly selected = input(false);

  protected readonly currency = CURRENCY;
  protected readonly photo = computed(() => imageUrl(this.vehicle().imageUrl));
  protected readonly subline = computed(() => this.distance() || this.vehicle().location);
  protected readonly carriedDates = computed(() => (this.start() && this.end() ? { start: this.start(), end: this.end() } : {}));
  protected readonly saved = computed(() => this.favorites.has(this.vehicle().id));

  protected toggle(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.favorites.toggle(this.vehicle().id);
  }
}
