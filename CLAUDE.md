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
- **`projects/`** — Each subdirectory (`vetguide/`, `frago/`, `vbrc-tracker/`) contains a self-contained `index.html` copied from external repos.
- **`vercel.json`** — Routing, redirects, and security headers (CSP, HSTS, X-Frame-Options, etc.)

## Design System

- **Light mode default** with dark mode toggle. Theme set via `data-theme` attribute on `<html>`. FOUC prevented by inline `<script>` in `<head>` that reads localStorage before CSS loads.
- CSS custom properties in `:root` (light) and `[data-theme="dark"]` define the full palette.
- **Accent color:** `#3A65D9` (light) / `#4F7BF7` (dark) — signature electric blue.
- **Typography:** Inter (body/headings) + JetBrains Mono (badges, labels, mono accents) via Google Fonts.
- **Cards:** 12px radius, category-colored 3px top border, shadow-lift hover effect.
- **Featured projects:** Full-width alternating 2-column rows (image | text), with CSS `order` flip for even rows. Mobile: single column, image always on top.

## Key Constraints

- Project pages under `projects/` are standalone builds copied from external repos. Edits here may diverge from their source repos.
- CSP in `vercel.json` restricts allowed sources — update it when adding new external resources.
- Theme toggle inline script in `<head>` must stay before the CSS `<link>` to prevent flash of wrong theme.
- Screenshots in `assets/screenshots/` are captured from live sites via Playwright.
