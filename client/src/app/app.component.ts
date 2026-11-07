import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from './core/auth.service';
import { ThemeService } from './core/theme.service';
import { IconComponent } from './shared/icon.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  template: `
    <div class="app-shell" [class.has-tabbar]="showTabs()" [class.on-explore]="onExplore()">
      <main>
        <router-outlet />
      </main>

      @if (showTabs()) {
        <nav class="tabbar" [class.role-tabs]="auth.user()" aria-label="Main">
          <a routerLink="/explore" routerLinkActive="active" class="tab">
            <app-icon name="search" [size]="24" /><span>Explore</span>
          </a>
          @if (!auth.user() || auth.user()?.accountType === 'renter') {
            <a routerLink="/trips" routerLinkActive="active" class="tab">
              <app-icon name="car" [size]="24" /><span>Trips</span>
            </a>
          }
          @if (!auth.user() || auth.user()?.accountType === 'host') {
            <a routerLink="/host" routerLinkActive="active" class="tab tab-host">
              <span class="tab-plus"><app-icon name="plus" [size]="18" /></span><span>Host</span>
            </a>
          }
          <a routerLink="/profile" routerLinkActive="active" class="tab">
            <app-icon name="user" [size]="24" /><span>Profile</span>
          </a>
        </nav>
      }
    </div>
  `,
})
export class AppComponent {
  private router = inject(Router);
  protected readonly auth = inject(AuthService);
  private readonly theme = inject(ThemeService);
  private readonly url = signal(this.router.url);

  /** Detail pages and the list-a-car sheet are full-screen, like the mockups (no tab bar). */
  protected readonly showTabs = computed(() => {
    const path = this.url().split('?')[0];
    return path !== '/' && path !== '/login' && path !== '/register'
      && !path.startsWith('/vehicles/') && !path.startsWith('/host/vehicles');
  });
  protected readonly onExplore = computed(() => this.url().split('?')[0] === '/explore');

  constructor() {
    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe((e) => this.url.set(e.urlAfterRedirects));
  }
}
