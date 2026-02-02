# Extinguisher Tracker SaaS

**Paid Subscription Version** - Fire extinguisher inspection management SaaS with subscription tiers (Basic, Pro, Enterprise). Built with React 18 + Vite and Firebase (Auth, Firestore, Storage, Analytics) with Stripe integration.

This rewrite focuses documentation on the complete feature set, accurate to the current main branch after the Unified Inspection UI merge.

## Feature Summary

- Authentication and real-time cloud sync (Firebase)
- Unified inspection UI for all entry points (scan, list, search)
- 13-point NFPA-style checklist with pass/fail and notes
- Photos per asset and per inspection, with gallery and main photo
- GPS capture for assets/inspections with open-in-maps links
- Section-based organization with counts, sorting, and notes
- Time tracking per section with export to Excel
- Barcode scanning via camera (BarcodeDetector + polyfill) and handheld/wedge
- Search, sort, filter, and quick navigation
- Import/export with Excel (ExcelJS) including optional photos/GPS/checklist
- Admin tools: duplicate cleanup, edit/replace assets, bulk ops
- Workspaces by month with easy month switching and data isolation

## Unified Inspection UI

All inspection paths now land on a single full-page detail view: `ExtinguisherDetailView`.

- Entry points: camera scan, handheld scan input, section list, global search
- Behaviors: shows asset details, checklist, photos, history, GPS
- Pending status: interactive 13-point checklist, notes, optional photo/GPS capture, Pass/Fail
- Non-pending: read-only view with history, photos, and quick actions (Edit/Replace)
- Smooth navigation back to originating context using `returnPath`

Files: `src/components/ExtinguisherDetailView.jsx:1`, `src/App.jsx:3398`

## Detailed Features

Authentication and Sync
- Firebase Authentication (email/password)
- Firestore real-time listeners; user-scoped data segregation
- Firebase Storage for photos; download URLs stored on items

Workspaces (Monthly)
- Separate inspection cycles per month; data isolated by workspace
- Long-press the month badge to switch months; create/copy from previous month
- Time tracking and notes are scoped to the current month

Inspections
- 13-point checklist (pin, seal, gauge, weight, damage, location, visibility, distance, mount height, clearance, secure, recency, tag)
- Pass/Fail with auto-generated failed-item summary in notes
- Auto-save notes while pending
- Inline expiration date edit and save
- Full inspection history with timestamps and optional photos/GPS

Photos
- Upload multiple persistent “reference” photos per asset (first is main)
- Capture an optional photo with an inspection; history gallery shows them
- Thumbnail grid with click-to-open; deletion persists to Storage

GPS
- Capture location during inspection; accuracy and coordinates displayed
- Open in Google Maps; store last inspection GPS and asset GPS

Organization
- Sections: Main Hospital, Buildings A–D, WMC, Employee/Visitor Parking, FED
- Per-section counts (Pending/Passed/Failed) and smart sort by floor/room
- Section notes with optional carry-forward to the next month

Time Tracking
- Start/pause/stop per section with live elapsed
- Section summary modal and Excel export of time data

Scanning
- Camera scanning powered by `BarcodeDetector` with `@undecaf/barcode-detector-polyfill`
- Handheld scanner (keyboard wedge) input field for fast scans
- After scan, navigate directly to `ExtinguisherDetailView`

Search and Navigation
- Search by Asset ID, Vicinity, or Serial
- Quick links into sections and assets; calculator shortcut

Import/Export
- Import CSV/XLS/XLSX lists; map to Asset ID, Serial, Vicinity, Parent Location
- Export inspections to XLSX via ExcelJS with options:
  - Include photos (reference and latest inspection photo)
  - Include GPS (last inspection and asset location)
  - Include checklist data and inspection history
- Export time tracking per section

Admin and Safety
- Duplicate cleanup utility to merge and remove dup records by Asset ID
- Edit item and Replace item workflows
- Protected bulk operations and confirmations for destructive actions

Offline-Tolerant Reads/Writes
- Firestore persistence enabled (IndexedDB): cached reads and queued writes
- Note: Photo uploads require connectivity; upload retries when online

## Tech Stack

- Frontend: React 18, Vite, Tailwind CSS, React Router
- Icons: `lucide-react`
- Barcode scanning: native `BarcodeDetector` + `@undecaf/barcode-detector-polyfill`
- Backend: Firebase (Auth, Firestore, Storage, Analytics)
- Excel import/export: `exceljs`

## Getting Started

Prereqs
- Node 18+ and npm
- Firebase project with credentials configured in `.env` file

Install
- `npm install`

Run
- `npm run dev` — start dev server with Fast Refresh
- `npm run build` — build to `dist/`
- `npm run preview` — serve the production build locally
- `npm run lint` — lint JS/JSX (no warnings allowed)

## Configuration

**Required:** Create `.env.local` or `.env.development` with your Firebase config:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...

# Optional: external calculator app URL
VITE_CALCULATOR_URL=https://your-calc-app.web.app
```

Notes
- Storage bucket name should be `<project-id>.appspot.com`
- See `.env.example` for a complete template
- All Firebase credentials must be provided via environment variables for security

## How To Use

1) Sign in
- Email/password via Firebase Auth

2) Choose/Create the month (workspace)
- Long-press the month badge to switch or create a new month
- Optionally copy extinguishers forward (reset to pending)

3) Get to an extinguisher
- Scan a barcode (camera or handheld) and you’ll land on the unified detail view
- Or search/select from a section list

4) Inspect in the unified view
- The 13-point checklist defaults to pass; mark any failures
- Add notes; optionally capture a photo and GPS
- Tap Pass or Fail — inspection is logged and you’re returned to your prior view

5) Manage assets
- Edit or replace an extinguisher, add reference photos and asset GPS

6) Track time
- Start/pause/stop timers by section; export a summary to Excel

7) Import/Export
- Import asset lists via CSV/XLS/XLSX
- Export inspections and time tracking to Excel; include optional photos/GPS/checklist

8) Admin tools
- Run duplicate cleanup to merge dup Asset IDs (keeps newest/most complete)

## Troubleshooting

Camera Scanning
- Allow camera permissions; prefer Chrome/Edge; ensure good lighting

GPS
- Allow location access; wait a few seconds for accuracy to improve

Sync
- Requires internet for initial auth and any photo uploads
- Firestore reads cache and writes queue while offline

Import
- Ensure expected columns: Asset ID, Serial, Vicinity, Parent Location

## Project Structure

- App entry: `src/main.jsx`
- Global styles: `src/index.css` (Tailwind)
- Core UI: `src/App.jsx`
- Key components: `src/components/ExtinguisherDetailView.jsx`, `src/components/BarcodeScanner.jsx`, `src/components/SectionDetail.jsx`
- Firebase setup: `src/firebase.js`

## License

Copyright 2025 David Beck (built_by_Beck). All rights reserved.

This software is proprietary and confidential. See LICENSE for details.

## Changelog

See `CHANGELOG.md` for release notes. Latest: `v0.1.0` (Unified Inspection UI).

