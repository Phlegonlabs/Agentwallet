# Design System

AgentWallet landing page design system. All values map to Tailwind CSS v4 utility classes defined in `apps/landing/src/styles/global.css`.

---

## Colors

### Primary palette -- Slate

Used for backgrounds, text, and borders. Slate is the only gray scale in the system.

| Token | Hex | Usage |
|-------|-----|-------|
| `slate-50` | `#f8fafc` | Section backgrounds (alternating), card hover fills |
| `slate-100` | `#f1f5f9` | Card borders, badge backgrounds, icon containers, chain pills |
| `slate-200` | `#e2e8f0` | -- reserved -- |
| `slate-300` | `#cbd5e1` | Arrow icons between workflow steps |
| `slate-400` | `#94a3b8` | Muted heading text (hero subtitle), helper text, terminal prompts |
| `slate-500` | `#64748b` | Body text, descriptions, nav links, terminal labels |
| `slate-600` | `#475569` | Icon strokes, badge text, secondary body text |
| `slate-700` | `#334155` | Terminal dots, emphasized inline text |
| `slate-800` | `#1e293b` | Terminal border lines, CTA input background |
| `slate-900` | `#0f172a` | Headings, card titles, terminal command text bg, numbered circles |
| `slate-950` | `#020617` | Terminal block backgrounds, CTA section background |

### Accent -- Emerald

Used for interactive elements, success states, and CTAs.

| Token | Hex | Usage |
|-------|-----|-------|
| `emerald-400` | `#34d399` | Terminal prompt `$`, success checkmarks, JSON keys in terminal |
| `emerald-500` | `#10b981` | Step number circles, status dots, checkmark icons |
| `emerald-600` | `#059669` | -- reserved for hover states -- |

### Semantic colors (in-component only, not in global theme)

These are used sparingly via Tailwind's built-in palette, not registered as theme variables.

| Color | Usage |
|-------|-------|
| `blue-50` / `blue-400` / `blue-700` | Audit log: info severity |
| `amber-50` / `amber-300` / `amber-400` / `amber-700` | Audit log: warn severity; terminal JSON string values |
| `red-50` / `red-100` / `red-400` / `red-600` / `red-700` | Audit log: critical severity; "You only" permission rows |
| `emerald-50` / `emerald-100` / `emerald-600` / `emerald-700` | Agent permission rows (allowed) |

---

## Typography

### Font families

```css
--font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
--font-mono: "JetBrains Mono", ui-monospace, monospace;
```

Loaded from Google Fonts: `Inter:wght@400;500;600;700` and `JetBrains Mono:wght@400;500`.

### Type scale

| Element | Classes | Example |
|---------|---------|---------|
| Hero heading | `text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]` | "One command." |
| CTA heading | `text-3xl font-bold text-white` | "Ready to secure your wallets?" |
| Section heading | `text-2xl font-bold text-center text-slate-900` | "Everything you need." |
| Card title | `font-semibold text-slate-900` | "Multi-chain support" |
| Section subtitle | `text-slate-500 text-center max-w-xl mx-auto` | Paragraph below heading |
| Body text | `text-sm text-slate-500 leading-relaxed` | Card descriptions |
| Small text | `text-xs text-slate-400` | Helper text, notes, terminal labels |
| Code inline | `text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono` | `agentwallet` |
| Terminal text | `font-mono text-sm leading-relaxed` | All terminal blocks |

### Hierarchy rules

- Only one `h1` per page (Hero)
- Section headings are always `h2`, centered, with a subtitle `p` below
- Card headings are `h3`, left-aligned
- No `h4`-`h6` used

---

## Spacing

### Section rhythm

All sections follow the same vertical padding:

```
py-20 px-6
```

Exceptions:
- Hero: `pt-32 pb-20 px-6` (extra top padding for fixed header)
- Chains bar: `py-16 px-6` (tighter)
- Footer: `py-12 px-6` (tighter)

### Container widths

| Width | Usage |
|-------|-------|
| `max-w-5xl mx-auto` | Wide sections: Features, Security, Skills, AuditLog, X402 |
| `max-w-3xl mx-auto` | Narrow sections: Hero, Terminal demo, Getting Started |
| `max-w-2xl mx-auto` | Inline elements: CTA block, Skills install terminal |
| `max-w-xl mx-auto` | Subtitle text constraint |
| `max-w-lg mx-auto` | Features subtitle |

### Section heading spacing

```
mb-3     (heading to subtitle)
mb-14    (subtitle to content grid, most sections)
mb-12    (subtitle to content, Security)
mb-10    (subtitle to content, Terminal)
mb-8     (subtitle to content, Chains)
```

### Card internal spacing

```
p-6      (standard card padding)
p-5      (security layer cards, security reminder)
gap-6    (grid gap between cards)
gap-4    (internal element spacing)
mb-4     (icon to title)
mb-2     (title to description)
```

---

## Components

### Card

Standard content card used in Features, Security, X402, AuditLog.

```
bg-white rounded-xl p-6 border border-slate-100
```

Variants:
- **With icon**: 40px icon container at top, then title + description
- **With numbered circle**: Circle left, text right (`flex items-start gap-4`)
- **Full-width**: Used as wrapper in Getting Started steps

### Badge / Pill

Inline status indicator used in Hero.

```
inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-sm
```

With status dot: `w-2 h-2 rounded-full bg-emerald-500`

### Chain pill

Used in Chains section and X402 chain list.

```
text-xs px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 font-medium
```

With icon variant (Chains section):
```
flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-50 border border-slate-100
```

### Terminal block

Dark code block used across Terminal, Getting Started, Skills, X402, AuditLog.

```html
<!-- Outer container -->
<div class="bg-slate-950 rounded-2xl overflow-hidden shadow-2xl shadow-slate-900/10">
  <!-- Header with dots -->
  <div class="flex items-center gap-2 px-4 py-3 bg-slate-900/50 border-b border-slate-800">
    <div class="w-3 h-3 rounded-full bg-slate-700"></div>
    <div class="w-3 h-3 rounded-full bg-slate-700"></div>
    <div class="w-3 h-3 rounded-full bg-slate-700"></div>
    <span class="ml-2 text-xs text-slate-500 font-mono">label</span>
  </div>
  <!-- Content -->
  <div class="p-6 font-mono text-sm leading-relaxed space-y-6">
    <!-- Command line -->
    <div class="flex items-center gap-2 text-slate-400">
      <span class="text-emerald-400">$</span>
      <span class="text-white">command here</span>
    </div>
    <!-- Output -->
    <div class="mt-1 text-slate-500 pl-4">...</div>
  </div>
</div>
```

Smaller variant (Getting Started inline terminals): `w-2.5 h-2.5` dots, `py-2` header, `p-4` content.

Terminal color conventions:
- `text-emerald-400` -- prompt `$`, success checkmarks, JSON keys
- `text-white` -- commands, highlighted output
- `text-slate-400` -- default output text
- `text-slate-500` -- secondary output, comments, braces
- `text-slate-600` -- ellipsis (`...`)
- `text-amber-300` -- JSON string values

### Step indicator

Numbered circle used in Getting Started, Security layers, X402 flow.

```
flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-bold
```

Dark variant (Security layers, X402):
```
bg-slate-900 text-white
```

Small variant (X402):
```
w-7 h-7 text-xs
```

### Icon container

Square container for feature icons.

```
w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600
```

Large variant (Skills workflow):
```
w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center
```

Emerald variant (Skills AI agent):
```
w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600
```

### Permission row

Used in Security agent permission model.

Agent-allowed:
```
flex items-center justify-between p-3 rounded-lg bg-emerald-50
text-emerald-700 (label)
bg-emerald-100 text-emerald-600 (badge)
```

User-only:
```
bg-red-50
text-red-700 (label)
bg-red-100 text-red-600 (badge)
```

### Install command block

Dark inline command used in Hero and CTA.

Hero (interactive, with copy button):
```
flex items-center gap-3 bg-slate-900 text-white rounded-xl px-5 py-3.5 font-mono text-sm
```

CTA (static):
```
inline-flex items-center gap-3 bg-slate-800 text-white rounded-xl px-5 py-3.5 font-mono text-sm
```

### Separator dot

Used in CTA meta row and nav.

```
w-1 h-1 rounded-full bg-slate-700
```

---

## Layout

### Page structure

```
Header  (fixed, z-50, bg-white/80 backdrop-blur)
Hero    (pt-32 to clear fixed header)
Chains  (border-t divider)
GettingStarted  (bg-slate-50)
Features        (bg-slate-50)
Terminal        (bg-white)
Skills          (bg-white)
X402            (bg-slate-50)
AuditLog        (bg-white)
Security        (bg-white)
CTA             (bg-slate-950, dark)
Footer          (border-t divider)
```

Background alternation pattern: white and slate-50 sections alternate. CTA is the only dark (slate-950) section.

### Grid patterns

| Pattern | Usage |
|---------|-------|
| `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6` | Feature cards (6 items) |
| `grid-cols-1 md:grid-cols-3 gap-6` | Skills workflow (3 items) |
| `grid-cols-1 lg:grid-cols-2 gap-8` | Security, AuditLog, X402 (content + sidebar) |
| `grid-cols-3 gap-3` | Token cards in X402 |
| `flex flex-wrap gap-4 sm:gap-6` | Chain pills |

### Fixed header

```
fixed top-0 w-full z-50 bg-white/80 backdrop-blur-sm border-b border-slate-100
```

Inner: `max-w-5xl mx-auto px-6 h-16 flex items-center justify-between`

### Sticky sidebar

Used in X402 and AuditLog terminal blocks:

```
sticky top-8
```

---

## Icons

All icons are inline SVGs -- no icon library.

### Standard icon props

```html
<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"
     viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
```

Small variant: `width="16" height="16"`
Large variant: `width="24" height="24"`

### Checkmark (success lists)

```html
<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"
     viewBox="0 0 24 24" class="text-emerald-500 flex-shrink-0">
  <path d="M20 6L9 17l-5-5" />
</svg>
```

### Arrow (workflow connectors)

```html
<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"
     viewBox="0 0 24 24">
  <path d="M5 12h14m-7-7l7 7-7 7" />
</svg>
```

Positioned: `hidden md:block absolute -left-3 top-1/2 -translate-y-1/2 text-slate-300`

### GitHub icon

```html
<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385..." />
</svg>
```

---

## Responsive breakpoints

| Breakpoint | Width | Key changes |
|------------|-------|-------------|
| default | 0px | Single column, stacked layout |
| `sm` | 640px | Nav visible, 2-col feature grid, hero buttons horizontal |
| `md` | 768px | 3-col Skills grid, workflow arrows visible |
| `lg` | 1024px | 3-col feature grid, 2-col split layouts (Security, X402, AuditLog), hero text scales up |

### Mobile-hidden elements

- Desktop nav: `hidden sm:flex`
- Workflow arrows: `hidden md:block`

---

## Interaction patterns

### Copy to clipboard (Hero)

1. User clicks copy icon on install command
2. Icon swaps to checkmark (`M20 6L9 17l-5-5`)
3. Reverts after 2 seconds

### Navigation

- Header nav uses anchor links (`#features`, `#security`, `#getting-started`, `#audit`, `#x402`, `#skills`)
- All section containers have matching `id` attributes
- Link hover: `hover:text-slate-900 transition-colors`

### External links

All open in new tab: `target="_blank" rel="noopener"`
- GitHub repo
- npm registry
- GitHub issues

---

## File reference

| File | Purpose |
|------|---------|
| `src/styles/global.css` | Theme tokens (fonts, colors) |
| `src/layouts/Layout.astro` | HTML wrapper, meta tags, font loading |
| `src/components/Header.astro` | Fixed nav bar |
| `src/components/Hero.astro` | Hero + install command + copy button |
| `src/components/Chains.astro` | Chain logo strip |
| `src/components/GettingStarted.astro` | 5-step onboarding |
| `src/components/Features.astro` | 6 feature cards |
| `src/components/Terminal.astro` | Terminal demo |
| `src/components/Skills.astro` | AI agent workflow + install |
| `src/components/X402.astro` | Payment protocol |
| `src/components/AuditLog.astro` | Audit log |
| `src/components/Security.astro` | Security layers + permissions |
| `src/components/Cta.astro` | Bottom CTA |
| `src/components/Footer.astro` | Footer links |
