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
    <div class="pad"><div class="auth-card card stack"><a class="brand" routerLink="/"><span class="brand-mark" aria-hidden="true">D</span>DriveShare</a>
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
