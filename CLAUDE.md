# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Personal brand site for Christopher Kleinman — a single-page portfolio/resume hybrid. Deployed on Vercel. No build system, no package manager, no tests — pure HTML, CSS, and JavaScript served as static files.

## Deployment

- Hosted on Vercel with configuration in `vercel.json` (clean URLs, redirects, security headers)
- Push to `main` triggers auto-deploy
- Local preview: `python3 -m http.server 8080`
- `/portfolio` redirects to `/` (302)
- `/scrab` redirects to `auditbuffet.com/games/scrab` (301)

## Architecture

- **`index.html`** — Single-page homepage with anchored sections: Hero, About, Featured Projects, More Projects, Contact/Footer. Uses `styles/main.css` and `scripts/main.js`.
- **`presentations/index.html`** — Standalone page (`/presentations`) listing talks and decks. Two sections: Conferences (currently VBRC 2026) and Vibe Code Club (monthly series). Reuses `styles/main.css` and `scripts/main.js`; page-specific styles live in an inline `<style>` block.
- **`projects/`** — Each subdirectory contains a self-contained `index.html`. Project tools (`vetguide/`, `frago/`, `vbrc-tracker/`) are copied from external repos. Presentation decks (`vbrc-2026/`, `vcc-audits/`, `vcc-api-mcp/`, `vcc-context-engineering/`) are also self-contained — surfaced through the `/presentations` page.
- **`vercel.json`** — Routing, redirects, and security headers (CSP, HSTS, X-Frame-Options, etc.)
- **`api/`** — Empty placeholder for future Vercel serverless functions.
- **`sitemap.xml`** — Hand-maintained. Update when adding new project pages.

## JavaScript (`scripts/main.js`)

Single IIFE, no modules or build step. All interactive features live here:

- **Theme toggle** — Flips `data-theme` on `<html>`, persists to `localStorage`. Watches `prefers-color-scheme` only when no user choice is stored.
- **Scrollspy + smooth scroll** — IntersectionObserver picks the section with the highest visible ratio. `more-projects` aliases to `projects` in the nav.
- **Reveal animations** — Any element with class `.reveal` fades in via IntersectionObserver. Cards inside `.projects-grid` auto-detect their column index and get `reveal-from-left`/`reveal-from-right` for multi-direction entrance.
- **Scroll progress bar** — Thin (3px) vertical strip down the left edge of the page (`.scroll-progress`), divided into five segments mapped to hero/about/projects/more-projects/contact. `updateProgressBar()` creates a `.scroll-progress-fill` div inside each segment and animates its `scaleY` as the viewport passes the section. Hidden below 768px.
- **Showcase scroll entrance, parallax, hover tilt, magnetic buttons, click ripples, cursor gradient** — All gated on `prefers-reduced-motion: no-preference` and (where pointer matters) `pointer: fine`. Follow this pattern when adding new effects.
- All scroll-driven effects share a single `requestAnimationFrame` loop (`onScrollFrame`) to avoid layout thrash. New scroll effects should hook into this loop, not add their own scroll listeners.

## Design System

- **Light mode default** with dark mode toggle. Theme set via `data-theme` attribute on `<html>`. FOUC prevented by inline `<script>` in `<head>` that reads localStorage before CSS loads.
- CSS custom properties in `:root` (light) and `[data-theme="dark"]` define the full palette.
- **Accent color:** `#3A65D9` (light) / `#4F7BF7` (dark) — signature electric blue.
- **Typography:** Inter (body/headings) + JetBrains Mono (badges, labels, mono accents) via Google Fonts.
- **Cards:** 12px radius, category-colored 3px top border, shadow-lift hover effect.
- **Featured projects:** Full-width alternating 2-column rows (image | text), with CSS `order` flip for even rows. Mobile: single column, image always on top.
- **Screenshots:** Use `@2x` srcset pattern (e.g., `auditbuffet.png` + `auditbuffet@2x.png`) for retina rendering. Both files must exist.

## Key Constraints

- Project pages under `projects/` are standalone builds copied from external repos. Edits here may diverge from their source repos.
- CSP in `vercel.json` restricts allowed sources — update it when adding new external resources.
- **CSP / X-Frame-Options must allow same-origin iframes site-wide.** The VBRC 2026 deck embeds its 5 demo tools via same-origin `<iframe src="tools/inquiry.html">` etc. The generic `/(.*) ` rule in `vercel.json` therefore sets `frame-ancestors 'self'` and `X-Frame-Options: SAMEORIGIN` (NOT `'none'` / `DENY`). Path-specific overrides for `/projects/vbrc-2026/(.*)` add CDN allowances (jsdelivr) and explicit `frame-src 'self'`. If you ever lock the generic rule back to `'none'` / `DENY` to harden clickjacking protection, you MUST also keep the override applying — or the deck iframes silently break in production. Vercel merges matching `headers` rules with last-match-wins per header key, but that behavior isn't officially documented, so prefer making the generic rule permissive enough to not require an override.
- Theme toggle inline script in `<head>` must stay before the CSS `<link>` to prevent flash of wrong theme.
- Screenshots in `assets/screenshots/` are captured from live sites via Playwright.
