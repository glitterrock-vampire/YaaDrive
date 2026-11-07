import { Injectable, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';

/** The signed-in user's saved cars (the hearts). */
@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);

  private readonly ids = signal<ReadonlySet<number>>(new Set());

  constructor() {
    effect(() => {
      if (this.auth.loggedIn()) {
        this.api.favoriteIds().subscribe({ next: (r) => this.ids.set(new Set(r.ids)), error: () => undefined });
      } else {
        this.ids.set(new Set());
      }
    });
  }

  has(id: number): boolean {
    return this.ids().has(id);
  }

  toggle(id: number): void {
    if (!this.auth.loggedIn()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    const wasSaved = this.has(id);
    this.set(id, !wasSaved);
    const call = wasSaved ? this.api.removeFavorite(id) : this.api.addFavorite(id);
    // Roll back if the server rejects it.
    call.subscribe({ error: () => this.set(id, wasSaved) });
  }

  private set(id: number, saved: boolean): void {
    const next = new Set(this.ids());
    if (saved) next.add(id);
    else next.delete(id);
    this.ids.set(next);
  }
}
