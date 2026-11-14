# Chroniques Oubliées 2 — Character & Rules App

## Project Knowledge & Source Material
- The complete official ruleset is in `./DOC-20250811-WA0000.pdf`.
- **First step:** Before building UI components, parse `./DOC-20250811-WA0000.pdf` and extract all rules (Peuples, Profils, Voies, Capacités, Équipements, États préjudiciables) into structured JSON files inside `src/data/` so they can be queried cleanly without re-reading the raw PDF.
- Keep all UI labels, data, and game terms strictly in **French**, matching the PDF terminology.

## Tech Stack & Design Rules
- React + Vite + Tailwind CSS + Lucide icons, configured as a mobile-first PWA for iPhone and Android (`100dvh`, bottom tab bar, 44px+ touch targets).
- Support Dark Fantasy and Parchemin themes.
- Persist characters in `localStorage` with JSON import/export.