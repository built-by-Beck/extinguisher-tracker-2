# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` — Start Vite development server with React Fast Refresh
- `npm run build` — Create production build in `dist/` directory
- `npm run preview` — Serve the built `dist/` locally for verification
- `npm run lint` — Run ESLint across source files (zero warnings policy)

## Project Architecture

This is a single-page React application for tracking fire extinguisher inspections at Brookwood Hospital. The application is built with:

- **Frontend**: React 18 with Vite build system
- **Styling**: Tailwind CSS with custom utilities
- **Icons**: Lucide React icon library
- **Data handling**: XLSX library for spreadsheet import/export
- **State management**: Local component state with localStorage persistence
- **Data persistence**: Browser localStorage for offline capability

### Key Application Features

- **Section-based organization**: Fire extinguishers are organized by hospital sections (Main Hospital, Buildings A-D, WMC, parking areas, FED)
- **Inspection workflow**: Pass/Fail inspection with notes and history tracking
- **Time tracking**: Built-in timer system for tracking inspection time per section
- **Data import/export**: Excel/CSV file import and export with section assignment
- **Scanning functionality**: Barcode scanner integration for quick asset lookup
- **Offline-first**: All data persists in localStorage for offline operation

### Core Data Structure

Each fire extinguisher record contains:
- `id`: Unique identifier (assetId + timestamp)
- `assetId`: Primary identifier for the fire extinguisher
- `serial`: Serial number
- `vicinity`: Location description
- `parentLocation`: Parent/container location
- `section`: Hospital section assignment
- `status`: 'pending' | 'pass' | 'fail'
- `checkedDate`: ISO timestamp of last inspection
- `notes`: Inspection notes
- `inspectionHistory`: Array of previous inspection records

### Application State Management

- Main data stored in `extinguishers` state array
- Session state (filters, search) persisted to localStorage
- Time tracking data stored separately in `sectionTimes`
- All data automatically saves to localStorage on changes

## Code Organization

- `src/App.jsx`: Main application component containing all logic and UI
- `src/main.jsx`: React entry point
- `src/index.css`: Tailwind CSS imports and base styles
- `index.html`: HTML entry point with root div
- `public/`: Static assets (currently empty)

## Development Guidelines

- **Component style**: Single large component architecture (App.jsx contains all functionality)
- **State patterns**: Use useState hooks with localStorage synchronization
- **CSS approach**: Tailwind utility classes, avoid custom CSS when possible
- **Event handling**: Modal-based interactions for inspections and data entry
- **Data validation**: Basic client-side validation for required fields

## Testing

No test framework is currently configured. When adding tests:
- Use Jest + React Testing Library
- Place tests in `src/**/__tests__/` or `*.test.jsx` next to components
- Focus on critical user flows: inspection process, data import/export, timer functionality

## Key Business Logic

1. **Inspection Flow**: Items start as 'pending', can be marked 'pass' or 'fail' with optional notes
2. **Section Filtering**: Users can filter view by hospital section to focus work
3. **Time Tracking**: Manual start/stop timers per section with persistent storage
4. **Data Import**: Excel/CSV files parsed and assigned to specific sections
5. **Export Options**: Separate exports for all data, passed items, failed items, and time tracking

## Local Storage Keys

- `extinguishers`: Main fire extinguisher data array
- `sessionState`: Current filters and UI state
- `sectionTimes`: Time tracking data per section
- `lastSaved`: Timestamp of last data save