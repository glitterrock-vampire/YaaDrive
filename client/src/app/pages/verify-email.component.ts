import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { errorMessage } from '../core/util';

@Component({
  selector: 'app-verify-email',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="pad">
      <section class="auth-card card stack verify-card" aria-live="polite">
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

        @if (state() === 'checking') {
          <h1>Verifying your email…</h1>
          <p class="muted">Please wait while we confirm your address.</p>
        } @else if (state() === 'verified') {
          <h1>Email verified</h1>
          <p>Your YaadDrive account is ready. You can now sign in.</p>
          <a class="btn btn-primary btn-block" routerLink="/login">Sign in</a>
        } @else {
          @if (state() === 'invalid') {
            <h1>That link didn’t work</h1>
            <p class="alert alert-error" role="alert">{{ error() }}</p>
          } @else {
            <h1>Verify your email</h1>
            <p>Enter the email address you used to sign up and we’ll send a new verification link.</p>
          }
          <form class="stack" (ngSubmit)="resend()">
            <label class="field">
              <span>Email address</span>
              <input type="email" name="email" [(ngModel)]="email" required maxlength="200" autocomplete="email" />
            </label>
            @if (resent()) {
              <p class="alert alert-info" role="status">If this address has a pending account, a verification email will be sent.</p>
            }
            @if (resendError()) {
              <p class="alert alert-error" role="alert">{{ resendError() }}</p>
            }
            <button type="submit" class="btn btn-primary" [disabled]="busy() || !email">
              {{ busy() ? 'Sending…' : 'Send verification email' }}
            </button>
          </form>
          <p class="muted">Already verified? <a routerLink="/login">Sign in</a></p>
        }
      </section>
    </div>
  `,
})
export class VerifyEmailComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly state = signal<'checking' | 'verified' | 'invalid' | 'request'>('checking');
  protected readonly error = signal('');
  protected readonly resendError = signal('');
  protected readonly busy = signal(false);
  protected readonly resent = signal(false);
  protected email = '';

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.state.set('request');
      return;
    }
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { token: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });

    this.api.verifyEmail(token).subscribe({
      next: () => this.state.set('verified'),
      error: (err) => {
        this.error.set(errorMessage(err));
        this.state.set('invalid');
      },
    });
  }

  protected resend(): void {
    if (this.busy() || !this.email) return;
    this.busy.set(true);
    this.resent.set(false);
    this.resendError.set('');
    this.api.resendVerificationEmail(this.email).subscribe({
      next: () => {
        this.resent.set(true);
        this.busy.set(false);
      },
      error: (err) => {
        this.resendError.set(errorMessage(err));
        this.busy.set(false);
      },
    });
  }
}
