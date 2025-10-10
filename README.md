# Fire Extinguisher Tracker

A comprehensive web application for managing and tracking fire extinguisher inspections at Brookwood Hospital. Built with React and designed for offline-first operation, this tool streamlines the monthly inspection workflow with barcode scanning, time tracking, and detailed reporting capabilities.

## Overview

The Fire Extinguisher Tracker is a single-page application (SPA) that enables hospital maintenance staff to efficiently conduct monthly fire extinguisher inspections across multiple hospital sections. The application tracks inspection status, maintains historical records, and provides powerful data import/export capabilities for compliance reporting.

## Key Features

### 📋 Inspection Management
- **Pass/Fail workflow** with optional notes for each inspection
- **Inspection history tracking** with timestamps and previous results
- **Status indicators** (pending, pass, fail) with visual color coding
- **Quick inspection modal** for rapid pass/fail marking

### 🏥 Section-Based Organization
- Organize extinguishers by hospital sections:
  - Main Hospital
  - Building A, B, C, D
  - WMC (Women's Medical Center)
  - Parking areas (Deck, Lot 1, Lot 2)
  - FED (Front Entrance Drive)
- **Filter by section** to focus on specific areas
- **"All" tab** to view all extinguishers across sections

### ⏱️ Time Tracking
- Built-in timer system for tracking inspection time per section
- Start/stop timers with automatic persistence
- Export time tracking data for labor reporting
- Total time calculation per section

### 📱 Barcode Scanner Integration
- Quick asset lookup via barcode scanning
- Instant navigation to scanned extinguisher
- Supports standard hospital asset barcode formats

### 📊 Data Import/Export
- **Import from Excel/CSV**: Bulk upload extinguisher data with automatic section assignment
- **Export options**:
  - All data (complete inventory)
  - Passed items only
  - Failed items only (for maintenance follow-up)
  - Time tracking report
- Section assignment during import for organized data management

### 💾 Offline-First Architecture
- All data stored in browser localStorage
- No internet connection required for operation
- Automatic data persistence on every change
- Session state preservation across browser sessions

### 🔍 Search and Filter
- Real-time search across asset IDs, serial numbers, and locations
- Combined section filtering and search
- Instant results as you type

## Technology Stack

- **Frontend Framework**: React 18
- **Build Tool**: Vite (with Hot Module Replacement)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Data Processing**: XLSX (SheetJS) for Excel/CSV handling
- **State Management**: React hooks with localStorage persistence
- **Backend**: Firebase (authentication and potential cloud sync)

## Data Structure

Each fire extinguisher record contains:

```javascript
{
  id: "unique-identifier",
  assetId: "FE-12345",
  serial: "SN789456",
  vicinity: "Near elevator bank",
  parentLocation: "2nd Floor East Wing",
  section: "Main Hospital",
  status: "pending" | "pass" | "fail",
  checkedDate: "2025-10-10T14:30:00Z",
  notes: "Pressure gauge in green zone",
  inspectionHistory: [
    {
      date: "2025-09-10T10:15:00Z",
      status: "pass",
      notes: "All checks normal"
    }
  ]
}
```

## Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn package manager

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd Fire_Extinguisher_Tracker
```

2. Install dependencies:
```bash
npm install
```

3. Configure Firebase (optional, for cloud features):
   - Create a Firebase project at https://console.firebase.google.com
   - Copy your Firebase config to `src/firebase.js`

4. Start development server:
```bash
npm run dev
```

5. Open your browser to `http://localhost:5173`

## Usage

### Starting a New Inspection Cycle

1. **Import Data**: Click "Import Excel" and select your asset list file
2. **Assign Section**: Choose the hospital section for the imported data
3. **Select Section Tab**: Click on the section you want to inspect
4. **Start Timer**: Click "Start Timer" to begin tracking inspection time

### Conducting Inspections

1. **Scan or Search**: Use the barcode scanner or search bar to find an extinguisher
2. **Inspect Equipment**: Perform physical inspection of the fire extinguisher
3. **Mark Status**: Click on the extinguisher card to open the inspection modal
4. **Pass or Fail**: Click "Pass" or "Fail" button
5. **Add Notes** (optional): Enter any observations or issues
6. **Save**: Click "Save" to record the inspection

### Completing a Section

1. **Stop Timer**: Click "Stop Timer" when finished with the section
2. **Review**: Check for any remaining pending items
3. **Export Failed Items**: Export failed items list for maintenance follow-up
4. **Move to Next Section**: Switch tabs to continue inspections

### Monthly Reporting

1. **Export All Data**: Generate complete inventory report
2. **Export Passed**: Create compliance report of successful inspections
3. **Export Failed**: Generate work orders for failed items
4. **Export Time Tracking**: Submit labor hours report

## Development

### Available Commands

- `npm run dev` — Start development server with hot reload
- `npm run build` — Create production build
- `npm run preview` — Preview production build locally
- `npm run lint` — Run ESLint checks

### Code Organization

```
src/
├── App.jsx           # Main application component
├── main.jsx          # React entry point
├── index.css         # Tailwind CSS configuration
├── firebase.js       # Firebase configuration
└── components/       # Reusable components (future modularization)
```

### localStorage Keys

- `extinguishers` — Main fire extinguisher data
- `sessionState` — Current filters and UI state
- `sectionTimes` — Time tracking data per section
- `lastSaved` — Last save timestamp

## Browser Compatibility

- Chrome/Edge (recommended): Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Responsive design, full functionality

## License

Copyright © 2025 David Beck (built_by_Beck). All rights reserved.

This software is proprietary and confidential. See LICENSE file for details.

## Developer

**David Beck** (built_by_Beck)

For questions, support, or licensing inquiries, please contact the developer.

---

Built with React + Vite | Designed for Brookwood Hospital | Offline-First Architecture
