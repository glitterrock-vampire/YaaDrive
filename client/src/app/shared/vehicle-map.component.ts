import { Component, ElementRef, OnDestroy, afterNextRender, effect, input, output, signal, untracked, viewChild } from '@angular/core';
import { Vehicle } from '../core/api.service';
import { CURRENCY_SYMBOL, DEFAULT_CENTER } from '../core/util';

// Leaflet is loaded from a CDN <script> in index.html.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const L: any;

/** Map with a blue price pin for every vehicle that has coordinates. */
@Component({
  selector: 'app-vehicle-map',
  template: `
    <div #host class="map-host" role="application" aria-label="Map of available vehicles"></div>
    @if (failed()) {
      <div class="map-fallback">The map could not load. You can still browse the list below.</div>
    }
  `,
})
export class VehicleMapComponent implements OnDestroy {
  readonly vehicles = input<Vehicle[]>([]);
  readonly selectedId = input<number | null>(null);
  readonly userPos = input<{ lat: number; lng: number } | null>(null);
  readonly picked = output<number>();

  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('host');
  protected readonly failed = signal(false);
  private readonly ready = signal(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private map: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private markers = new Map<number, any>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private userMarker: any;

  constructor() {
    afterNextRender(() => this.init());

    // Rebuild the pins whenever the results change, then fit the map to them.
    effect(() => {
      const list = this.vehicles();
      if (!this.ready()) return;
      untracked(() => this.renderPins(list));
    });

    effect(() => {
      const id = this.selectedId();
      if (!this.ready()) return;
      untracked(() => this.applySelection(id));
    });

    // Show the user's position and centre on it when it becomes known.
    effect(() => {
      const pos = this.userPos();
      if (!this.ready() || !pos) return;
      untracked(() => {
        this.userMarker?.remove();
        this.userMarker = L.marker([pos.lat, pos.lng], {
          icon: L.divIcon({ className: 'user-pin', html: '<span class="halo"></span><span class="dot"></span>', iconSize: [64, 64], iconAnchor: [32, 32] }),
          interactive: false,
          keyboard: false,
        }).addTo(this.map);
        this.map.setView([pos.lat, pos.lng], 13);
      });
    });
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  private init(): void {
    if (typeof L === 'undefined') {
      this.failed.set(true);
      return;
    }
    this.map = L.map(this.host().nativeElement, { zoomControl: false, attributionControl: false }).setView(DEFAULT_CENTER, 11);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(this.map);
    // The container may not have its final size yet.
    setTimeout(() => this.map?.invalidateSize(), 0);
    this.ready.set(true);
  }

  private renderPins(list: Vehicle[]): void {
    for (const m of this.markers.values()) m.remove();
    this.markers.clear();

    const points: [number, number][] = [];
    for (const v of list) {
      if (v.lat === null || v.lng === null) continue;
      const price = `${CURRENCY_SYMBOL}${Math.round(v.pricePerDay)}`; // numeric, so safe to put in markup
      const marker = L.marker([v.lat, v.lng], {
        icon: L.divIcon({
          className: 'price-pin',
          html: `<span class="pin-label">${price}</span><i class="pin-dot"></i>`,
          iconSize: [64, 44],
          iconAnchor: [32, 44],
        }),
        keyboard: true,
        title: `${v.make} ${v.model}, ${price} per day`,
      });
      marker.on('click', () => this.picked.emit(v.id));
      marker.addTo(this.map);
      this.markers.set(v.id, marker);
      points.push([v.lat, v.lng]);
    }

    if (points.length > 1) this.map.fitBounds(points, { padding: [60, 60], maxZoom: 14 });
    else if (points.length === 1) this.map.setView(points[0], 13);
    this.applySelection(this.selectedId());
  }

  private applySelection(id: number | null): void {
    for (const [vid, marker] of this.markers) {
      marker.getElement()?.classList.toggle('selected', vid === id);
      marker.setZIndexOffset(vid === id ? 1000 : 0);
    }
  }
}
