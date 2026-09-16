---
name: Neo-Brutalist Dark
colors:
  surface: '#121214'
  surface-dim: '#121214'
  surface-bright: '#27272A'
  surface-container-lowest: '#09090B'
  surface-container-low: '#18181B'
  surface-container: '#1E1E24'
  surface-container-high: '#27272A'
  surface-container-highest: '#3F3F46'
  on-surface: '#FFFFFF'
  on-surface-variant: '#E4E4E7'
  inverse-surface: '#FFFFFF'
  inverse-on-surface: '#09090B'
  outline: '#FFFFFF'
  outline-variant: '#FFFFFF'
  surface-tint: '#ADFF2F'
  primary: '#ADFF2F'
  on-primary: '#000000'
  primary-container: '#ADFF2F'
  on-primary-container: '#000000'
  inverse-primary: '#ADFF2F'
  secondary: '#FF4A4A'
  on-secondary: '#FFFFFF'
  secondary-container: '#FF4A4A'
  on-secondary-container: '#000000'
  tertiary: '#FBBF24'
  on-tertiary: '#000000'
  tertiary-container: '#FDE047'
  on-tertiary-container: '#000000'
  error: '#FF0000'
  on-error: '#FFFFFF'
  error-container: '#7F0000'
  on-error-container: '#FFC7C7'
  background: '#09090B'
  on-background: '#FFFFFF'
  surface-variant: '#27272A'
typography:
  display:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  body-lg:
    fontFamily: Space Grotesk
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 28px
  body-md:
    fontFamily: Space Grotesk
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  body-sm:
    fontFamily: Space Grotesk
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-md:
    fontFamily: Space Mono
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Space Mono
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
rounded:
  sm: 0px
  DEFAULT: 0px
  md: 0px
  lg: 0px
  xl: 0px
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 80px
---

# Neo-Brutalist Dark Command Center

## Brand & Style
This design system is a raw, high-impact dark theme built on the **Neo-Brutalist** design language. It rejects gradients, smooth border curves, and soft ambient shadows in favor of structural clarity, harsh geometric boundaries, and saturated neon color blocks. The brand personality is aggressive, technical, and uncompromising—reminiscent of low-level hacker terminals combined with bold modern editorial grids.

## Visual Design Rules

- **Slab Outlines:** Every container box, menu rail, list element, and button must use a solid `2px` or `3px` outline border. The borders use pure white (`#FFFFFF`) against the deep zinc base to ensure razor-sharp structure.
- **Hard Offset Shadows:** Flat solid drop-shadows with no blur are used to indicate elevated elements or active hover items.
  - Standard container hover: `box-shadow: 4px 4px 0px 0px #000000;` or `box-shadow: 4px 4px 0px 0px #ADFF2F;`
- **Zero Roundness:** All elements (inputs, cards, navigation buttons, sidebar rail) have sharp `0px` corners. Curves are forbidden.
- **Neon Saturated Triggers:** A single saturated Neon Yellow-Green (`#ADFF2F`) is used for primary interactive states, online tags, active buttons, and selection lines.

## Color Tokens

- **Base Background (#09090B):** Pure dark zinc void.
- **Base Surface (#121214):** Lifted panels, cards, and sidebar containers.
- **Primary Neon Accent (#ADFF2F):** Bright yellow-green for active states.
- **Secondary Alert (#FF4A4A):** Solid bold red for dismiss/critical actions.
- **Outline (#FFFFFF):** Thick white border lines.
- **Overlay Shadows (#000000):** Flat solid black block offset shadows.

## Typography

- **Headings & Body (Space Grotesk):** A raw, geometric neo-grotesque sans-serif that fits the stark brutalist layout perfectly.
- **Technical Metadata (Space Mono):** Used for code inputs, lists counts, status pills, and time stamps.
