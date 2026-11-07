import { Component, input } from '@angular/core';

export type IconName =
  | 'search' | 'calendar' | 'sliders' | 'heart' | 'chevron-right' | 'chevron-left' | 'share' | 'x' | 'plus'
  | 'minus' | 'car' | 'user' | 'locate' | 'pin' | 'star' | 'seat' | 'battery' | 'arrow-up-right' | 'arrow-down-right'
  | 'gear' | 'fuel' | 'check';

/** Small inline SVG icon set (stroke icons that inherit the text colour). */
@Component({
  selector: 'app-icon',
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      [attr.fill]="filled() ? 'currentColor' : 'none'"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      @switch (name()) {
        @case ('search') { <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /> }
        @case ('calendar') { <rect x="3" y="4" width="18" height="18" rx="3" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /> }
        @case ('sliders') { <line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="17" x2="20" y2="17" /><circle cx="9" cy="7" r="2.2" fill="var(--surface, #fff)" /><circle cx="15" cy="17" r="2.2" fill="var(--surface, #fff)" /> }
        @case ('heart') { <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /> }
        @case ('chevron-right') { <polyline points="9 18 15 12 9 6" /> }
        @case ('chevron-left') { <polyline points="15 18 9 12 15 6" /> }
        @case ('share') { <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /> }
        @case ('x') { <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /> }
        @case ('plus') { <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /> }
        @case ('minus') { <line x1="5" y1="12" x2="19" y2="12" /> }
        @case ('car') { <path d="M3 13l2-5.5A2 2 0 0 1 6.9 6h10.2A2 2 0 0 1 19 7.5L21 13v5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1h-11v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" /><line x1="3" y1="13" x2="21" y2="13" /><circle cx="7.5" cy="15.2" r=".6" /><circle cx="16.5" cy="15.2" r=".6" /> }
        @case ('user') { <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /> }
        @case ('locate') { <polygon points="3 11 22 2 13 21 11 13 3 11" /> }
        @case ('pin') { <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /> }
        @case ('star') { <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /> }
        @case ('seat') { <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /> }
        @case ('battery') { <rect x="1" y="6" width="18" height="12" rx="2" /><line x1="23" y1="13" x2="23" y2="11" /> }
        @case ('arrow-up-right') { <line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" /> }
        @case ('arrow-down-right') { <line x1="7" y1="7" x2="17" y2="17" /><polyline points="17 7 17 17 7 17" /> }
        @case ('gear') { <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /> }
        @case ('fuel') { <path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16" /><line x1="3" y1="21" x2="15" y2="21" /><path d="M14 9h2a2 2 0 0 1 2 2v5a1.5 1.5 0 0 0 3 0V8l-3-3" /><line x1="7" y1="8" x2="11" y2="8" /> }
        @case ('check') { <polyline points="20 6 9 17 4 12" /> }
      }
    </svg>
  `,
  host: { style: 'display:inline-flex;line-height:0' },
})
export class IconComponent {
  readonly name = input.required<IconName>();
  readonly size = input(22);
  readonly filled = input(false);
}
