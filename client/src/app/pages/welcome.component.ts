import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-welcome',
  imports: [RouterLink],
  template: `
    <main class="welcome-screen">
      <svg class="welcome-scene" viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice"
        role="img" aria-labelledby="scene-title scene-description">
        <title id="scene-title">YaaDrive</title>
        <desc id="scene-description">A gold car travels a Jamaican country road toward the sunset.</desc>
        <defs>
          <linearGradient id="welcome-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#04231a" />
            <stop offset=".55" stop-color="#0b3a2a" />
            <stop offset=".85" stop-color="#3e5b1e" />
            <stop offset="1" stop-color="#d39a10" />
          </linearGradient>
          <radialGradient id="welcome-sun-glow">
            <stop offset="0" stop-color="#f5b700" stop-opacity=".55" />
            <stop offset="1" stop-color="#f5b700" stop-opacity="0" />
          </radialGradient>
          <linearGradient id="welcome-road" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#12372b" />
            <stop offset="1" stop-color="#0a241b" />
          </linearGradient>
        </defs>

        <rect width="390" height="330" fill="url(#welcome-sky)" />
        <g class="sun">
          <circle cx="195" cy="330" r="150" fill="url(#welcome-sun-glow)" />
          <circle cx="195" cy="326" r="58" fill="#f5b700" />
        </g>
        <path d="M0 336v-44q48-40 110-2t104-4q76-40 176 10v40z" fill="#0f4a34" />
        <path d="M0 336v-24q70-32 140-2t150-4q60-16 100 8v22z" fill="#0a3123" />
        <rect y="330" width="390" height="514" fill="#07261b" />
        <path d="M190 330h10l182 514H8z" fill="url(#welcome-road)" />
        <path d="M190 330 8 844m192-514 182 514" fill="none" stroke="#f7f4ec" stroke-opacity=".55" stroke-width="3" />

        <g class="roadside roadside-left">
          <rect x="-12" y="640" width="14" height="70" fill="#0a2a1f" />
          <circle cx="-5" cy="624" r="38" fill="#14573c" />
          <rect x="40" y="690" width="7" height="40" rx="2" fill="#f7f4ec" />
        </g>
        <g class="roadside roadside-right">
          <rect x="392" y="660" width="14" height="70" fill="#0a2a1f" />
          <circle cx="399" cy="644" r="38" fill="#14573c" />
          <rect x="343" y="690" width="7" height="40" rx="2" fill="#f5b700" />
        </g>
        <g class="road-markers" fill="#f5b700">
          <rect x="190" y="690" width="12" height="96" rx="3" />
          <rect x="190" y="690" width="12" height="96" rx="3" />
          <rect x="190" y="690" width="12" height="96" rx="3" />
        </g>
        <g transform="translate(0 -90)">
          <g class="car">
          <g class="car-bob">
            <ellipse cx="195" cy="704" rx="84" ry="10" fill="#000" opacity=".4" />
            <rect x="127" y="668" width="26" height="36" rx="7" fill="#0a0f0d" />
            <rect x="237" y="668" width="26" height="36" rx="7" fill="#0a0f0d" />
            <rect x="122" y="640" width="146" height="50" rx="16" fill="#f5b700" />
            <path d="m146 642 12-42q2-6 10-6h54q8 0 10 6l12 42z" fill="#e8a800" />
            <path d="m156 636 9-32h60l9 32z" fill="#0b1f18" />
            <path d="m168 608 8 0-6 24h-8z" fill="#fff" opacity=".12" />
            <rect x="138" y="636" width="114" height="5" rx="2.5" fill="#c88f00" />
            <ellipse class="tail-light" cx="146" cy="658" rx="34" ry="14" fill="#ff4b3e" />
            <ellipse class="tail-light" cx="244" cy="658" rx="34" ry="14" fill="#ff4b3e" />
            <rect x="128" y="652" width="36" height="11" rx="5.5" fill="#ff5a4d" />
            <rect x="226" y="652" width="36" height="11" rx="5.5" fill="#ff5a4d" />
            <rect x="170" y="662" width="50" height="19" rx="3" fill="#f7f4ec" />
            <text x="195" y="675.5" text-anchor="middle" fill="#0a2e22" font-size="10" font-weight="800" letter-spacing="1">YAAD</text>
          </g>
          </g>
        </g>
      </svg>

      <div class="welcome-shade" aria-hidden="true"></div>
      <section class="welcome-content" aria-labelledby="welcome-title">
        <div class="brand-lockup" aria-label="YaaDrive">
          <svg class="brand-mark" viewBox="0 0 250 254" aria-hidden="true">
            <path d="M0 84 118 6q7-6 14 0l118 78-12 20L125 30 12 104z" fill="#f5b700" />
            <path d="m150 90 78-2L72 252H17zM22 94l64-4 54 80-28 35z" fill="#f7f4ec" />
            <path d="M232 104q-97 56-124 148h64q10-82 76-140z" fill="#f5b700" />
            <path d="m145.7 243.8 5-16.9-4.9-1.7-5.2 17.4zm10.8-31.9 7.7-16-4.5-2.4-8 16.3zm16-30 10.5-15-4.1-3.2-10.7 15.4zm21.3-28.2 13.3-14-3.6-3.7-13.6 14.3zm26.6-26.3 14.6-11.8-3.2-4.2-14.8 12.1z" fill="#06291e" />
          </svg>
          <div class="brand-name" id="welcome-title"><span>Yaa</span><strong>Drive</strong></div>
          <p class="brand-tagline">SHARE <i>•</i> RENT <i>•</i> RIDE</p>
        </div>

        <div class="welcome-actions">
          <a routerLink="/login" [queryParams]="{ returnUrl: returnUrl }" class="welcome-button welcome-primary">Sign in</a>
          <a routerLink="/register" [queryParams]="{ returnUrl: returnUrl }" class="welcome-button welcome-secondary">Create account</a>
          <p class="welcome-note">Your island. Your ride. Your way.</p>
        </div>
      </section>
    </main>
  `,
  styles: [`
    :host { display: block; min-height: 100dvh; }
    .welcome-screen {
      position: relative; display: flex; min-height: 100dvh; overflow: hidden;
      align-items: stretch; justify-content: center; isolation: isolate;
      background: #07261b; color: #f7f4ec;
    }
    .welcome-scene { position: absolute; z-index: -2; inset: 0; width: 100%; height: 100%; }
    .welcome-shade {
      position: absolute; z-index: -1; inset: 0;
      background: linear-gradient(180deg, rgba(4,35,26,.06) 0%, transparent 36%, rgba(7,38,27,.08) 57%, #07261b 88%);
    }
    .welcome-content {
      display: flex; width: min(100%, 520px); min-height: 100dvh; flex-direction: column;
      align-items: center; justify-content: space-between;
      padding: calc(44px + env(safe-area-inset-top)) 28px calc(28px + env(safe-area-inset-bottom));
    }
    .brand-lockup { display: flex; flex-direction: column; align-items: center; }
    .brand-mark { width: 62px; height: 64px; opacity: 0; animation: rise-in .9s cubic-bezier(.2,.9,.25,1) .15s both; }
    .brand-name {
      margin-top: 12px; color: #f7f4ec; font-size: clamp(42px, 12vw, 50px); font-weight: 800;
      line-height: 1.15; letter-spacing: -1.5px; white-space: nowrap;
    }
    .brand-name span, .brand-name strong { display: inline-block; opacity: 0; animation: rise-in .9s cubic-bezier(.2,.9,.25,1) both; }
    .brand-name span { animation-delay: .35s; }
    .brand-name strong { color: #f5b700; animation-delay: .5s; }
    .brand-tagline {
      margin: 8px 0 0; color: #f7f4ec; font-size: 11px; font-weight: 700;
      letter-spacing: 5px; opacity: 0; animation: tagline-in 1s ease-out .8s both;
    }
    .brand-tagline i { color: #f5b700; font-style: normal; }
    .welcome-actions {
      display: grid; width: min(100%, 360px); gap: 12px;
      opacity: 0; animation: rise-in .7s cubic-bezier(.2,.9,.25,1) 1s both;
    }
    .welcome-button {
      display: flex; min-height: 56px; align-items: center; justify-content: center;
      border: 1px solid transparent; border-radius: 999px; padding: 14px 22px;
      font: inherit; font-size: 16px; font-weight: 800; text-decoration: none;
      transition: transform 180ms ease, background 180ms ease, border-color 180ms ease;
    }
    .welcome-button:active { transform: scale(.97); }
    .welcome-primary { background: #f5b700; color: #07261b; box-shadow: 0 8px 26px rgba(0,0,0,.2); }
    .welcome-primary:hover { background: #ffd04d; }
    .welcome-secondary { border-color: rgba(247,244,236,.56); background: rgba(7,38,27,.58); color: #f7f4ec; backdrop-filter: blur(8px); }
    .welcome-secondary:hover { border-color: #f5b700; background: rgba(7,38,27,.86); }
    .welcome-note { margin: 5px 0 0; color: rgba(247,244,236,.76); text-align: center; font-size: 12px; }
    .sun { transform-box: fill-box; transform-origin: center; animation: sun-float 6s ease-in-out infinite; }
    .car { transform-box: fill-box; transform-origin: center bottom; animation: car-sway 6s ease-in-out infinite; }
    .car-bob { transform-box: fill-box; transform-origin: center bottom; animation: car-bob .7s ease-in-out infinite; }
    .tail-light { animation: tail-glow 1.4s ease-in-out infinite; }
    .roadside { animation: roadside-pass 4s ease-in-out infinite; }
    .roadside-right { animation-delay: -2s; }
    .road-markers { transform-box: fill-box; transform-origin: center; animation: marker-pass 1.7s linear infinite; }
    @keyframes rise-in { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes tagline-in { from { opacity: 0; letter-spacing: 1px; } to { opacity: 1; letter-spacing: 5px; } }
    @keyframes sun-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
    @keyframes car-sway { 0%,100% { transform: translateX(-8px) rotate(-.6deg); } 50% { transform: translateX(8px) rotate(.6deg); } }
    @keyframes car-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
    @keyframes tail-glow { 0%,100% { opacity: .25; } 50% { opacity: .65; } }
    @keyframes roadside-pass { 0% { opacity: .25; transform: translateY(-8px) scale(.8); } 50% { opacity: 1; } 100% { opacity: .3; transform: translateY(16px) scale(1.2); } }
    @keyframes marker-pass { from { transform: translateY(-100px) scale(.4); opacity: .2; } to { transform: translateY(100px) scale(1.5); opacity: 1; } }
    @media (max-height: 700px) {
      .welcome-content { padding-top: calc(22px + env(safe-area-inset-top)); padding-bottom: calc(18px + env(safe-area-inset-bottom)); }
      .brand-mark { width: 48px; height: 50px; }
      .brand-name { margin-top: 4px; font-size: 40px; }
      .brand-tagline { margin-top: 2px; }
      .welcome-button { min-height: 50px; }
    }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; }
      .brand-mark, .brand-name span, .brand-name strong, .brand-tagline, .welcome-actions { opacity: 1; }
    }
  `],
})
export class WelcomeComponent {
  protected readonly returnUrl = '/explore';
}
