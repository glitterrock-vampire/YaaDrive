import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { errorMessage } from '../core/util';

/** Only allow redirects to paths inside this app (prevents open redirects). */
export function safeReturnUrl(url: string | null): string {
  return url && url.startsWith('/') && !url.startsWith('//') ? url : '/explore';
}

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="pad"><div class="auth-card card stack">
      <a class="auth-brand-lockup" aria-label="YaadDrive" routerLink="/">
        <svg class="auth-brand-mark" viewBox="0 0 250 254" aria-hidden="true">
          <rect width="250" height="254" rx="38" fill="#0f4a34" />
          <path d="M0 84 118 6q7-6 14 0l118 78-12 20L125 30 12 104z" fill="#f5b700" />
          <path d="m150 90 78-2L72 252H17zM22 94l64-4 54 80-28 35z" fill="#f7f4ec" />
          <path d="M232 104q-97 56-124 148h64q10-82 76-140z" fill="#f5b700" />
          <path d="m145.7 243.8 5-16.9-4.9-1.7-5.2 17.4zm10.8-31.9 7.7-16-4.5-2.4-8 16.3zm16-30 10.5-15-4.1-3.2-10.7 15.4zm21.3-28.2 13.3-14-3.6-3.7-13.6 14.3zm26.6-26.3 14.6-11.8-3.2-4.2-14.8 12.1z" fill="#06291e" />
        </svg>
        <span class="auth-brand-name"><span>Yaa</span><strong>Drive</strong></span>
        <span class="auth-brand-tagline">SHARE <i>•</i> RENT <i>•</i> RIDE</span>
      </a>
      <h1>Sign in</h1>
      <form class="stack" (ngSubmit)="submit()" #f="ngForm">
        <label class="field">
          <span>Email</span>
          <input type="email" name="email" [(ngModel)]="email" required autocomplete="email" />
        </label>
        <label class="field">
          <span>Password</span>
          <input type="password" name="password" [(ngModel)]="password" required autocomplete="current-password" />
        </label>
        @if (error()) {
          <p class="alert alert-error" role="alert">{{ error() }}</p>
        }
        <button type="submit" class="btn btn-primary" [disabled]="busy() || f.invalid">
          {{ busy() ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>
      <p class="muted">New here? <a routerLink="/register" [queryParams]="{ returnUrl: returnUrl }">Create an account</a></p>
    </div></div>
  `,
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  protected email = '';
  protected password = '';
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly returnUrl = safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'));

  protected submit(): void {
    this.busy.set(true);
    this.error.set('');
    this.auth.login(this.email, this.password).subscribe({
      next: () => this.router.navigateByUrl(this.returnUrl),
      error: (err) => {
        this.busy.set(false);
        this.error.set(errorMessage(err));
      },
    });
  }
}
