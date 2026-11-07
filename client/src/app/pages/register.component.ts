import { Component, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { errorMessage } from '../core/util';
import { safeReturnUrl } from './login.component';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="pad">
      <div class="auth-card signup-card card stack">
        <a class="brand" routerLink="/"><span class="brand-mark" aria-hidden="true">D</span>DriveShare</a>
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
      </div>
    </div>
  `,
})
export class RegisterComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
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
      next: () => this.router.navigateByUrl(this.returnUrl),
      error: (err) => {
        this.busy.set(false);
        this.error.set(errorMessage(err));
      },
    });
  }
}
