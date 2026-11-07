import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-welcome',
  imports: [RouterLink],
  template: `
    <div class="welcome pad">
      <section class="welcome-content">
        <a class="brand welcome-brand" routerLink="/" aria-label="DriveShare home">
          <span class="brand-mark" aria-hidden="true">D</span>
          <span>DriveShare</span>
        </a>
        <div class="welcome-copy">
          <p class="welcome-eyebrow">YOUR JOURNEY, YOUR WAY</p>
          <h1>Find the right car for wherever life takes you.</h1>
          <p class="muted">Discover cars shared by local Hosts across Jamaica.</p>
        </div>
        <div class="welcome-actions">
          <a routerLink="/login" [queryParams]="{ returnUrl: returnUrl }" class="btn btn-primary btn-block btn-lg">Sign in</a>
          <a routerLink="/register" [queryParams]="{ returnUrl: returnUrl }" class="btn btn-ghost btn-block btn-lg">Create account</a>
        </div>
      </section>
    </div>
  `,
})
export class WelcomeComponent {
  protected readonly returnUrl = '/explore';
}
