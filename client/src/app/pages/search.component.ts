import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, Vehicle } from '../core/api.service';
import { distanceLabel, errorMessage, milesBetween, nextDay, shortDate, todayIso } from '../core/util';
import { IconComponent } from '../shared/icon.component';
import { SheetComponent } from '../shared/sheet.component';
import { VehicleCardComponent } from '../shared/vehicle-card.component';
import { VehicleMapComponent } from '../shared/vehicle-map.component';

/** Explore: full-screen map with price pins, search pill and a "Nearby cars" sheet. */
@Component({
  selector: 'app-search',
  imports: [FormsModule, IconComponent, SheetComponent, VehicleCardComponent, VehicleMapComponent],
  template: `
    <div
      class="explore"
      (pointermove)="moveSheetGesture($event)"
      (pointerup)="endSheetGesture($event)"
      (pointercancel)="cancelSheetGesture()"
    >
      <app-vehicle-map class="explore-map" [vehicles]="shown()" [selectedId]="selectedId()" [userPos]="userPos()" (picked)="pick($event)" />

      <button type="button" class="search-pill" (click)="filtersOpen.set(true)" aria-label="Change location, dates and filters">
        <span class="sp-part sp-where"><app-icon name="search" [size]="20" /><strong>{{ applied().location || 'Anywhere' }}</strong></span>
        <span class="sp-sep" aria-hidden="true"></span>
        <span class="sp-part sp-when"><app-icon name="calendar" [size]="20" />{{ dateLabel() }}</span>
        <span class="sp-filter"><app-icon name="sliders" [size]="20" /></span>
      </button>

      @if (locationError()) {
        <p class="toast" role="status">{{ locationError() }}</p>
      }

      <section
        class="nearby"
        [class.expanded]="expanded()"
        [class.map-only]="mapOnly()"
        [style.--drag-y.px]="sheetDrag()"
        [attr.aria-hidden]="mapOnly()"
        [inert]="mapOnly()"
        aria-label="Cars"
      >
        <button type="button" class="locate-btn" aria-label="Centre the map on my location" (click)="locate()">
          <app-icon name="locate" [size]="22" />
        </button>
        <button
          type="button"
          class="sheet-grab"
          (click)="toggleExpanded()"
          (pointerdown)="startSheetGesture($event)"
          [attr.aria-label]="expanded() ? 'Swipe down to show map' : 'Swipe up to see cars'"
        >
          <span class="sheet-handle"></span>
        </button>
        <header
          class="nearby-head"
          (pointerdown)="startSheetGesture($event)"
        >
          <h2>{{ applied().location || (userPos() ? 'Nearby cars' : 'Available cars') }}</h2>
          <button type="button" class="link-btn" (click)="showMap()">
            Show map <app-icon name="chevron-right" [size]="16" />
          </button>
        </header>

        @if (error()) {
          <p class="alert alert-error" role="alert">{{ error() }}</p>
        }

        @if (loading()) {
          <p class="muted center">Loading cars…</p>
        } @else if (shown().length === 0 && !error()) {
          <div class="empty-note">
            @if (locationStatus() === 'unavailable' && !applied().location) {
              <strong>Choose your location to see cars</strong>
              <span class="muted">Allow location access or search for a town or area.</span>
              <button type="button" class="btn btn-primary btn-sm" (click)="filtersOpen.set(true)">Choose an area</button>
            } @else {
              <strong>{{ userPos() && !applied().location ? 'No cars within 25 miles' : 'No cars match' }}</strong>
              <span class="muted">Search a different area or adjust your filters.</span>
              <button type="button" class="btn btn-secondary btn-sm" (click)="filtersOpen.set(true)">Change search</button>
            }
          </div>
        } @else {
          <div class="vc-row" aria-live="polite">
            @for (v of shown(); track v.id) {
              <div class="vc-slot" [id]="'vc-' + v.id">
                <app-vehicle-card
                  [vehicle]="v"
                  [start]="applied().start"
                  [end]="applied().end"
                  [distance]="distanceOf(v)"
                  [selected]="v.id === selectedId()"
                />
              </div>
            }
          </div>
        }
        <p class="attribution">Map © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors</p>
      </section>
      @if (mapOnly()) {
        <button type="button" class="cars-reopen" (click)="showCars()">Show nearby cars</button>
      }
    </div>

    @if (filtersOpen()) {
      <app-sheet title="Search & filters" (closed)="filtersOpen.set(false)">
        <form class="stack" (ngSubmit)="apply()">
          <label class="field">
            <span>Where</span>
            <input name="location" [(ngModel)]="draft.location" placeholder="City or town" autocomplete="off" />
          </label>
          <div class="row">
            <label class="field">
              <span>Pick-up</span>
              <input type="date" name="start" [(ngModel)]="draft.start" [min]="today" />
            </label>
            <label class="field">
              <span>Return</span>
              <input type="date" name="end" [(ngModel)]="draft.end" [min]="endMin()" />
            </label>
          </div>
          <div class="row">
            <label class="field">
              <span>Gearbox</span>
              <select name="transmission" [(ngModel)]="draft.transmission">
                <option value="">Any</option>
                <option value="automatic">Automatic</option>
                <option value="manual">Manual</option>
              </select>
            </label>
            <label class="field">
              <span>Fuel</span>
              <select name="fuel" [(ngModel)]="draft.fuel">
                <option value="">Any</option>
                <option value="petrol">Petrol</option>
                <option value="diesel">Diesel</option>
                <option value="hybrid">Hybrid</option>
                <option value="electric">Electric</option>
              </select>
            </label>
          </div>
          <div class="row">
            <label class="field">
              <span>Min. seats</span>
              <input type="number" name="seats" min="1" max="15" [(ngModel)]="draft.seats" />
            </label>
            <label class="field">
              <span>Max price / day</span>
              <input type="number" name="maxPrice" min="0" [(ngModel)]="draft.maxPrice" />
            </label>
          </div>
          <label class="field">
            <span>Sort by</span>
            <select name="sort" [(ngModel)]="draft.sort">
              <option value="newest">Nearest / newest</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
              <option value="rating">Top rated</option>
            </select>
          </label>
          @if (formError()) {
            <p class="alert alert-error" role="alert">{{ formError() }}</p>
          }
          <div class="row actions">
            <button type="submit" class="btn btn-primary btn-block">Show cars</button>
            <button type="button" class="btn btn-ghost" (click)="reset()">Clear</button>
          </div>
        </form>
      </app-sheet>
    }
  `,
})
export class SearchComponent implements OnInit {
  private api = inject(ApiService);

  protected readonly today = todayIso();

  /** The search that produced the current results. */
  protected readonly applied = signal({ location: '', start: '', end: '', sort: 'newest' });
  /** What the filter sheet is editing. */
  protected draft = this.emptyFilters();

  protected readonly vehicles = signal<Vehicle[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly formError = signal('');
  protected readonly filtersOpen = signal(false);
  protected readonly expanded = signal(false);
  protected readonly mapOnly = signal(false);
  protected readonly selectedId = signal<number | null>(null);
  protected readonly userPos = signal<{ lat: number; lng: number } | null>(null);
  protected readonly locationError = signal('');
  protected readonly locationStatus = signal<'checking' | 'located' | 'unavailable'>('checking');
  private gestureStartY: number | null = null;
  private gestureStartTime = 0;
  protected readonly sheetDrag = signal(0);
  private suppressHandleClick = false;

  /** Location is enforced by the API; sort those in-radius results by distance by default. */
  protected readonly shown = computed(() => {
    const list = this.vehicles();
    const pos = this.userPos();
    if (this.applied().location || !pos || this.applied().sort !== 'newest') return list;
    const miles = (v: Vehicle) => (v.lat === null || v.lng === null ? Infinity : milesBetween(pos, { lat: v.lat, lng: v.lng }));
    return [...list].sort((a, b) => miles(a) - miles(b));
  });

  protected readonly dateLabel = computed(() => {
    const { start, end } = this.applied();
    return start && end ? `${shortDate(start)} – ${shortDate(end)}` : 'Any dates';
  });

  ngOnInit(): void {
    this.locate();
  }

  protected toggleExpanded(): void {
    if (this.suppressHandleClick) {
      this.suppressHandleClick = false;
      return;
    }
    this.expanded.update((value) => !value);
  }

  protected startSheetGesture(event: PointerEvent): void {
    if (event.target instanceof Element && event.target.closest('.link-btn')) return;
    this.suppressHandleClick = false;
    this.gestureStartY = event.clientY;
    this.gestureStartTime = event.timeStamp;
    this.sheetDrag.set(0);
  }

  protected moveSheetGesture(event: PointerEvent): void {
    if (this.gestureStartY === null) return;
    this.sheetDrag.set(event.clientY - this.gestureStartY);
  }

  protected endSheetGesture(event: PointerEvent): void {
    if (this.gestureStartY === null) return;
    const deltaY = event.clientY - this.gestureStartY;
    const elapsed = Math.max(1, event.timeStamp - this.gestureStartTime);
    const velocity = deltaY / elapsed;
    this.gestureStartY = null;
    const threshold = Math.max(32, window.innerHeight * 0.08);
    const flicked = Math.abs(velocity) > 0.55;
    if (Math.abs(deltaY) < threshold && !flicked) {
      this.sheetDrag.set(0);
      return;
    }

    this.suppressHandleClick = true;
    if (deltaY < 0) {
      this.showCarsExpanded();
    } else if (this.expanded() && deltaY < window.innerHeight * 0.28) {
      this.sheetDrag.set(0);
      this.expanded.set(false);
    } else {
      this.showMap();
    }
  }

  protected cancelSheetGesture(): void {
    this.gestureStartY = null;
    this.sheetDrag.set(0);
  }

  protected showMap(): void {
    this.sheetDrag.set(0);
    this.mapOnly.set(true);
    this.expanded.set(false);
  }

  protected showCars(): void {
    this.sheetDrag.set(0);
    this.mapOnly.set(false);
  }

  private showCarsExpanded(): void {
    this.sheetDrag.set(0);
    this.mapOnly.set(false);
    this.expanded.set(true);
  }

  protected endMin(): string {
    return this.draft.start ? nextDay(this.draft.start) : this.today;
  }

  protected distanceOf(v: Vehicle): string {
    const pos = this.userPos();
    if (this.applied().location || !pos || v.lat === null || v.lng === null) return '';
    return distanceLabel(milesBetween(pos, { lat: v.lat, lng: v.lng }));
  }

  protected pick(id: number): void {
    this.selectedId.set(id);
    document.getElementById('vc-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  protected locate(): void {
    this.locationError.set('');
    this.locationStatus.set('checking');
    if (!navigator.geolocation) {
      this.locationError.set('Your browser cannot share its location.');
      this.locationStatus.set('unavailable');
      this.search();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.userPos.set({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        this.locationStatus.set('located');
        this.search();
      },
      () => {
        this.locationError.set('Location access was denied.');
        this.locationStatus.set('unavailable');
        this.search();
        setTimeout(() => this.locationError.set(''), 4000);
      },
      { timeout: 10000, maximumAge: 60000 },
    );
  }

  protected reset(): void {
    this.draft = this.emptyFilters();
    this.apply();
  }

  protected apply(): void {
    const { start, end } = this.draft;
    if (!!start !== !!end) {
      this.formError.set('Choose both a pick-up and a return date, or leave both empty.');
      return;
    }
    if (start && end && end <= start) {
      this.formError.set('The return date must be after the pick-up date.');
      return;
    }
    this.formError.set('');
    this.filtersOpen.set(false);
    this.search();
  }

  private search(): void {
    const d = this.draft;
    const location = d.location.trim();
    const pos = location ? null : this.userPos();
    this.error.set('');
    if (!location && !pos) {
      this.vehicles.set([]);
      this.applied.set({ location: '', start: d.start, end: d.end, sort: d.sort });
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.api.searchVehicles({
      ...d,
      location,
      ...(pos ? { lat: pos.lat, lng: pos.lng } : {}),
    }).subscribe({
      next: (res) => {
        this.vehicles.set(res.vehicles);
        this.applied.set({ location, start: d.start, end: d.end, sort: d.sort });
        this.selectedId.set(null);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }

  private emptyFilters() {
    return {
      location: '',
      start: '',
      end: '',
      transmission: '',
      fuel: '',
      seats: null as number | null,
      maxPrice: null as number | null,
      sort: 'newest',
    };
  }
}
