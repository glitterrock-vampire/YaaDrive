import { Component, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { errorMessage } from '../core/util';
import { safeReturnUrl } from './login.component';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="pad">
      <div class="auth-card signup-card card stack">
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
        @if (verificationEmail(); as email) {
          <section class="signup-step stack verification-pending" aria-live="polite">
            <h1>Check your email</h1>
            @if (verificationEmailSent()) {
              <p>We sent a verification link to <strong>{{ email }}</strong>. Verify your address before signing in.</p>
            } @else {
              <p>Your account was created, but we couldn’t send a verification link to <strong>{{ email }}</strong>. Please try again.</p>
            }
            @if (!verificationEmailSent()) {
              <p class="alert alert-error" role="alert">We couldn’t send the email just now. Please try again.</p>
            }
            @if (resendMessage()) {
              <p class="alert alert-info" role="status">{{ resendMessage() }}</p>
            }
            <button type="button" class="btn btn-primary" (click)="resendVerification()" [disabled]="resending()">
              {{ resending() ? 'Sending…' : 'Resend verification email' }}
            </button>
            <a routerLink="/login">Back to sign in</a>
          </section>
        } @else {
        <div class="signup-progress" role="progressbar" [attr.aria-valuenow]="step() + 1" [attr.aria-valuemin]="1" [attr.aria-valuemax]="stepCount">
          <span [style.width.%]="((step() + 1) / stepCount) * 100"></span>
        </div>
        <p class="muted small">Step {{ step() + 1 }} of {{ stepCount }}</p>

        <form class="stack signup-form" (ngSubmit)="continue(f)" #f="ngForm">
          @switch (step()) {
            @case (0) {
              <section class="signup-step" [class.signup-step-backward]="direction() < 0">
                <h1>Hi! What’s your first name?</h1>
                <label class="field">
                  <span class="sr-only">First name</span>
                  <input #stepInput name="firstName" [(ngModel)]="form.firstName" required minlength="1" maxlength="39" autocomplete="given-name" placeholder="First name" />
                </label>
              </section>
            }
            @case (1) {
              <section class="signup-step" [class.signup-step-backward]="direction() < 0">
                <h1>And your last name?</h1>
                <label class="field">
                  <span class="sr-only">Last name</span>
                  <input #stepInput name="lastName" [(ngModel)]="form.lastName" required minlength="1" maxlength="39" autocomplete="family-name" placeholder="Last name" />
                </label>
              </section>
            }
            @case (2) {
              <section class="signup-step" [class.signup-step-backward]="direction() < 0">
                <h1>What’s your email?</h1>
                <label class="field">
                  <span class="sr-only">Email address</span>
                  <input #stepInput type="email" name="email" [(ngModel)]="form.email" required maxlength="200" autocomplete="email" placeholder="Email address" />
                </label>
              </section>
            }
            @case (3) {
              <section class="signup-step" [class.signup-step-backward]="direction() < 0">
                <h1>Do you want to rent or host a vehicle?</h1>
                <fieldset class="stack account-roles" aria-describedby="account-type-help">
                  <legend class="sr-only">Choose your account type</legend>
                  <label class="field card account-choice">
                    <span><input #stepInput type="radio" name="accountType" [(ngModel)]="form.accountType" value="renter" required /> Renter</span>
                    <small class="muted">Book cars from local Hosts.</small>
                  </label>
                  <label class="field card account-choice">
                    <span><input type="radio" name="accountType" [(ngModel)]="form.accountType" value="host" required /> Host</span>
                    <small class="muted">List your car and manage booking requests.</small>
                  </label>
                  <small id="account-type-help" class="muted">Each account has one role. Create a separate account if you need both.</small>
                </fieldset>
              </section>
            }
            @case (4) {
              <section class="signup-step stack" [class.signup-step-backward]="direction() < 0">
                <h1>How can we reach you?</h1>
                <label class="field">
                  <span>Mobile number</span>
                  <input #stepInput type="tel" name="phone" [(ngModel)]="form.phone" required minlength="7" maxlength="30"
                    pattern="[+0-9(). -]{7,30}" autocomplete="tel" placeholder="+1 876 555 0100" aria-describedby="phone-help" />
                  <small id="phone-help" class="muted">Include your country code. Your number is shared with the other party after a booking is confirmed.</small>
                </label>
                <label class="field">
                  <span>Parish in Jamaica <span class="muted">(optional)</span></span>
                  <select name="parish" [(ngModel)]="form.parish" autocomplete="address-level1">
                    <option value="">Select a parish</option>
                    @for (parish of parishes; track parish) {
                      <option [value]="parish">{{ parish }}</option>
                    }
                  </select>
                </label>
                <p class="muted small">We’ll collect identity documents separately through a secure verification process. Don’t enter licence or national ID numbers here.</p>
              </section>
            }
            @case (5) {
              <section class="signup-step stack" [class.signup-step-backward]="direction() < 0">
                <h1>Set a password</h1>
                <label class="field">
                  <span>Password (8–100 characters)</span>
                  <input #stepInput type="password" name="password" [(ngModel)]="form.password" required minlength="8" maxlength="100" autocomplete="new-password" placeholder="Create a password" />
                </label>
                <label class="field">
                  <span>Confirm password</span>
                  <input type="password" name="confirmPassword" [(ngModel)]="form.confirmPassword" required autocomplete="new-password" placeholder="Re-enter your password" />
                </label>
                @if (form.confirmPassword && form.password !== form.confirmPassword) {
                  <p class="alert alert-error" role="alert">Passwords do not match.</p>
                }
              </section>
            }
          }

          @if (error()) {
            <p class="alert alert-error" role="alert">{{ error() }}</p>
          }

          <div class="row signup-actions">
            @if (step() > 0) {
              <button type="button" class="btn btn-ghost" (click)="back()" [disabled]="busy()">Back</button>
            }
            <button type="submit" class="btn btn-primary" [disabled]="busy() || (step() === stepCount - 1 && form.password !== form.confirmPassword)">
              {{ busy() ? 'Creating account…' : step() === stepCount - 1 ? 'Create account' : 'Continue' }}
            </button>
          </div>
        </form>

        <p class="muted">Already registered? <a routerLink="/login" [queryParams]="{ returnUrl: returnUrl }">Sign in</a></p>
        }
      </div>
    </div>
  `,
})
export class RegisterComponent {
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);

  protected readonly stepCount = 6;
  protected readonly step = signal(0);
  protected readonly direction = signal(1);
  protected readonly parishes = [
    'Clarendon', 'Hanover', 'Kingston', 'Manchester', 'Portland', 'Saint Andrew', 'Saint Ann',
    'Saint Catherine', 'Saint Elizabeth', 'Saint James', 'Saint Mary', 'Saint Thomas', 'Trelawny', 'Westmoreland',
  ];
  protected form = {
    firstName: '',
    lastName: '',
    email: '',
    accountType: '' as '' | 'renter' | 'host',
    phone: '',
    parish: '',
    password: '',
    confirmPassword: '',
  };
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly verificationEmail = signal('');
  protected readonly verificationEmailSent = signal(true);
  protected readonly resending = signal(false);
  protected readonly resendMessage = signal('');
  protected readonly returnUrl = safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'));

  protected continue(form: NgForm): void {
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }
    this.error.set('');
    if (this.step() < this.stepCount - 1) {
      this.direction.set(1);
      this.step.update((step) => step + 1);
      return;
    }
    this.submit();
  }

  protected back(): void {
    if (this.step() > 0 && !this.busy()) {
      this.error.set('');
      this.direction.set(-1);
      this.step.update((step) => step - 1);
    }
  }

  private submit(): void {
    const accountType = this.form.accountType;
    if (!accountType || this.form.password !== this.form.confirmPassword) return;
    this.busy.set(true);
    this.error.set('');
    const { firstName, lastName, email, phone, parish, password } = this.form;
    this.auth.register({
      accountType,
      name: `${firstName} ${lastName}`.trim(),
      email,
      phone,
      parish,
      password,
    }).subscribe({
      next: (response) => {
        this.verificationEmail.set(response.email);
        this.verificationEmailSent.set(response.emailSent);
        this.busy.set(false);
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(errorMessage(err));
      },
    });
  }

  protected resendVerification(): void {
    const email = this.verificationEmail();
    if (!email || this.resending()) return;
    this.resending.set(true);
    this.resendMessage.set('');
    this.auth.resendVerificationEmail(email).subscribe({
      next: ({ message }) => {
        this.resendMessage.set(message);
        this.resending.set(false);
      },
      error: (err) => {
        this.resendMessage.set(errorMessage(err));
        this.resending.set(false);
      },
    });
  }
}
