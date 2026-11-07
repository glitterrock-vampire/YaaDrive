import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { map, Observable, ReplaySubject, tap } from 'rxjs';
import { ApiService, AuthResponse, User } from './api.service';

const TOKEN_KEY = 'driveshare.token';

/** Read the stored token (used by the HTTP interceptor and the route guard). */
export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);

  readonly user = signal<User | null>(null);
  readonly loggedIn = computed(() => this.user() !== null);
  readonly sessionReady = new ReplaySubject<void>(1);

  constructor() {
    // Restore the session after a page refresh.
    if (getToken()) {
      this.api.me().subscribe({
        next: ({ user }) => this.user.set(user),
        error: () => {
          this.clear();
          this.sessionReady.next();
        },
        complete: () => this.sessionReady.next(),
      });
    } else {
      this.sessionReady.next();
    }
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.api.login({ email, password }).pipe(tap((res) => this.store(res)));
  }

  register(body: { accountType: User['accountType']; name: string; email: string; password: string; phone: string; parish: string }): Observable<AuthResponse> {
    return this.api.register(body).pipe(tap((res) => this.store(res)));
  }

  updateProfile(body: Pick<User, 'name' | 'email' | 'phone' | 'parish'>): Observable<User> {
    return this.api.updateProfile(body).pipe(
      tap(({ user }) => this.user.set(user)),
      map(({ user }) => user),
    );
  }

  updateAccountType(accountType: User['accountType']): Observable<User> {
    return this.api.updateAccountType(accountType).pipe(
      tap(({ user }) => this.user.set(user)),
      map(({ user }) => user),
    );
  }

  logout(): void {
    this.clear();
    this.router.navigateByUrl('/');
  }

  /** Called by the interceptor when the API says the token is no longer valid. */
  sessionExpired(): void {
    if (this.user() || getToken()) {
      this.clear();
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
    }
  }

  private store(res: AuthResponse): void {
    try {
      localStorage.setItem(TOKEN_KEY, res.token);
    } catch {
      /* storage unavailable: the session lasts until refresh */
    }
    this.user.set(res.user);
  }

  private clear(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
    this.user.set(null);
  }
}
