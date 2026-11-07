import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { ApiService, VehicleInput } from '../core/api.service';
import { CURRENCY_SYMBOL, errorMessage, imageUrl } from '../core/util';
import { IconComponent } from '../shared/icon.component';
import { SheetComponent } from '../shared/sheet.component';

/** "List your car" / "Edit your car", presented as a bottom sheet over the host area. */
@Component({
  selector: 'app-vehicle-form',
  imports: [FormsModule, IconComponent, SheetComponent],
  template: `
    <app-sheet [title]="editId ? 'Edit your car' : 'List your car'" (closed)="close()">
      @if (loading()) {
        <p class="muted center">Loading…</p>
      } @else {
        <form class="stack" (ngSubmit)="save()" #f="ngForm" novalidate>
          <div class="photo-grid">
            @for (src of form.photos; track src; let i = $index) {
              <div class="photo-tile">
                <img [src]="url(src)" [alt]="'Photo ' + (i + 1)" />
                <button type="button" class="tile-x" [attr.aria-label]="'Remove photo ' + (i + 1)" (click)="removePhoto(i)">
                  <app-icon name="x" [size]="14" />
                </button>
              </div>
            }
            @if (form.photos.length < maxPhotos) {
              <label class="photo-add" [class.busy]="uploading()">
                <app-icon name="plus" [size]="22" />
                <span>{{ uploading() ? 'Uploading…' : 'Add photo' }}</span>
                <input class="sr-only" type="file" multiple accept="image/jpeg,image/png,image/webp" (change)="onFiles($event)" [disabled]="uploading()" />
              </label>
            }
          </div>
          <p class="muted small">Up to {{ maxPhotos }} photos, JPEG, PNG or WebP, 5 MB each. The first photo is the cover.</p>

          <div class="group card">
            <label class="row-field"><span>Make</span><input name="make" [(ngModel)]="form.make" required maxlength="40" placeholder="Toyota" /></label>
            <label class="row-field"><span>Model</span><input name="model" [(ngModel)]="form.model" required maxlength="40" placeholder="Corolla" /></label>
            <label class="row-field"><span>Year</span><input type="number" name="year" [(ngModel)]="form.year" required min="1980" [max]="maxYear" /></label>
            <label class="row-field"><span>Plate</span><input name="plate" [(ngModel)]="form.plate" maxlength="15" placeholder="Not shown to renters" autocapitalize="characters" /></label>
          </div>

          <div class="group card">
            <div class="row-field">
              <span class="price-label"><strong>{{ symbol }}{{ form.pricePerDay || 0 }}</strong> per day</span>
              <div class="stepper">
                <button type="button" (click)="bump(-1)" aria-label="Decrease price"><app-icon name="minus" [size]="18" /></button>
                <input type="number" name="pricePerDay" [(ngModel)]="form.pricePerDay" required min="1" step="1" aria-label="Price per day" />
                <button type="button" (click)="bump(1)" aria-label="Increase price"><app-icon name="plus" [size]="18" /></button>
              </div>
            </div>
            <div class="row-field">
              <span id="weekends-label">Available weekends</span>
              <button
                type="button"
                class="switch"
                role="switch"
                aria-labelledby="weekends-label"
                [attr.aria-checked]="form.availableWeekends"
                [class.on]="form.availableWeekends"
                (click)="form.availableWeekends = !form.availableWeekends"
              ><span class="knob"></span></button>
            </div>
            @if (editId) {
              <div class="row-field">
                <span id="listed-label">Listed for renters</span>
                <button
                  type="button"
                  class="switch"
                  role="switch"
                  aria-labelledby="listed-label"
                  [attr.aria-checked]="form.active"
                  [class.on]="form.active"
                  (click)="form.active = !form.active"
                ><span class="knob"></span></button>
              </div>
            }
          </div>

          <div class="group card">
            <label class="row-field"><span>Pick-up</span><input name="location" [(ngModel)]="form.location" required minlength="2" maxlength="100" placeholder="Town or area" /></label>
            <div class="row-field">
              <span>Map pin</span>
              <button type="button" class="btn btn-secondary btn-sm" (click)="pinLocation()" [disabled]="pinning()">
                <app-icon name="locate" [size]="16" />
                {{ pinning() ? 'Locating…' : form.lat !== null ? 'Update pin' : 'Use my location' }}
              </button>
            </div>
            @if (form.lat === null) {
              <p class="group-note">No pin yet, so this car won't appear on the map. It will still show in the list.</p>
            } @else {
              <p class="group-note ok"><app-icon name="check" [size]="14" /> Pinned. Renters see the car near this spot.</p>
            }
            <label class="row-field">
              <span>Gearbox</span>
              <select name="transmission" [(ngModel)]="form.transmission">
                <option value="automatic">Automatic</option>
                <option value="manual">Manual</option>
              </select>
            </label>
            <label class="row-field">
              <span>Fuel</span>
              <select name="fuel" [(ngModel)]="form.fuel">
                <option value="petrol">Petrol</option>
                <option value="diesel">Diesel</option>
                <option value="hybrid">Hybrid</option>
                <option value="electric">Electric</option>
              </select>
            </label>
            <label class="row-field"><span>Seats</span><input type="number" name="seats" [(ngModel)]="form.seats" required min="1" max="15" /></label>
            <label class="row-field"><span>Range (mi)</span><input type="number" name="rangeMiles" [(ngModel)]="form.rangeMiles" min="1" max="2000" placeholder="Optional" /></label>
            <label class="row-field"><span>Colour</span><input name="color" [(ngModel)]="form.color" maxlength="30" /></label>
            <label class="field stacked">
              <span>Description</span>
              <textarea name="description" rows="4" maxlength="2000" [(ngModel)]="form.description" placeholder="Condition, features, pick-up instructions, house rules"></textarea>
            </label>
          </div>

          @if (error()) {
            <p class="alert alert-error" role="alert">{{ error() }}</p>
          }

          <button type="submit" class="btn btn-primary btn-block btn-lg" [disabled]="busy() || uploading() || f.invalid">
            {{ busy() ? 'Saving…' : editId ? 'Save changes' : 'Publish listing' }}
          </button>
        </form>
      }
    </app-sheet>
  `,
})
export class VehicleFormComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  protected readonly symbol = CURRENCY_SYMBOL;
  protected readonly maxYear = new Date().getFullYear() + 1;
  protected readonly maxPhotos = 8;
  protected editId: number | null = null;

  protected form: VehicleInput = {
    make: '',
    model: '',
    year: new Date().getFullYear(),
    plate: '',
    color: '',
    transmission: 'automatic',
    fuel: 'petrol',
    seats: 5,
    rangeMiles: null,
    location: '',
    lat: null,
    lng: null,
    pricePerDay: 50,
    description: '',
    photos: [],
    availableWeekends: true,
    active: true,
  };

  protected readonly loading = signal(false);
  protected readonly busy = signal(false);
  protected readonly uploading = signal(false);
  protected readonly pinning = signal(false);
  protected readonly error = signal('');

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.editId = Number(id);
    this.loading.set(true);
    this.api.myVehicles().subscribe({
      next: ({ vehicles }) => {
        const v = vehicles.find((x) => x.id === this.editId);
        if (!v) {
          // Not among *my* vehicles: it either doesn't exist or belongs to someone else.
          this.router.navigateByUrl('/host');
          return;
        }
        this.form = {
          make: v.make,
          model: v.model,
          year: v.year,
          plate: v.plate ?? '',
          color: v.color ?? '',
          transmission: v.transmission,
          fuel: v.fuel,
          seats: v.seats,
          rangeMiles: v.rangeMiles,
          location: v.location,
          lat: v.lat,
          lng: v.lng,
          pricePerDay: v.pricePerDay,
          description: v.description ?? '',
          photos: [...v.photos],
          availableWeekends: v.availableWeekends,
          active: v.active,
        };
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }

  protected url(src: string): string | null {
    return imageUrl(src);
  }

  protected close(): void {
    this.router.navigateByUrl('/host');
  }

  protected bump(delta: number): void {
    this.form.pricePerDay = Math.max(1, (Number(this.form.pricePerDay) || 0) + delta);
  }

  protected removePhoto(index: number): void {
    this.form.photos = this.form.photos.filter((_, i) => i !== index);
  }

  protected onFiles(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []).slice(0, this.maxPhotos - this.form.photos.length);
    input.value = '';
    if (files.length === 0) return;

    const tooBig = files.find((f) => f.size > 5 * 1024 * 1024);
    if (tooBig) {
      this.error.set(`"${tooBig.name}" is larger than 5 MB.`);
      return;
    }
    this.error.set('');
    this.uploading.set(true);
    this.uploadNext(files, 0);
  }

  /** Upload one at a time so the photos keep the order they were picked in. */
  private uploadNext(files: File[], i: number): void {
    if (i >= files.length) {
      this.uploading.set(false);
      return;
    }
    this.api.uploadImage(files[i]).subscribe({
      next: ({ url }) => {
        this.form.photos = [...this.form.photos, url];
        this.uploadNext(files, i + 1);
      },
      error: (err) => {
        this.error.set(errorMessage(err));
        this.uploading.set(false);
      },
    });
  }

  protected pinLocation(): void {
    if (!navigator.geolocation) {
      this.error.set('Your browser cannot share its location.');
      return;
    }
    this.error.set('');
    this.pinning.set(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.form.lat = pos.coords.latitude;
        this.form.lng = pos.coords.longitude;
        this.pinning.set(false);
      },
      () => {
        this.pinning.set(false);
        this.error.set('Location access was denied. Allow it in your browser to drop a pin.');
      },
      { timeout: 10000 },
    );
  }

  protected save(): void {
    this.busy.set(true);
    this.error.set('');
    const body: VehicleInput = {
      ...this.form,
      year: Number(this.form.year),
      seats: Number(this.form.seats),
      pricePerDay: Number(this.form.pricePerDay),
      rangeMiles: this.form.rangeMiles ? Number(this.form.rangeMiles) : null,
    };
    const request: Observable<{ id: number } | { ok: boolean }> = this.editId
      ? this.api.updateVehicle(this.editId, body)
      : this.api.createVehicle(body);
    request.subscribe({
      next: () => this.router.navigateByUrl('/host'),
      error: (err) => {
        this.busy.set(false);
        this.error.set(errorMessage(err));
      },
    });
  }
}
