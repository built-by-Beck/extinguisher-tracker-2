# Fire Extinguisher Tracker

A comprehensive web application for managing and tracking fire extinguisher inspections. Built with React and Firebase, this tool streamlines the monthly inspection workflow with barcode scanning, GPS location tracking, photo management, detailed checklists, and time tracking capabilities.

## Overview

The Fire Extinguisher Tracker is a full-featured inspection management system that enables hospital maintenance staff to efficiently conduct monthly fire extinguisher inspections across multiple hospital sections. The application provides user authentication, cloud data storage, comprehensive inspection checklists, photo and GPS capture, historical tracking, and powerful reporting capabilities for compliance and maintenance workflows.

## Key Features

### 🔐 User Authentication & Cloud Storage
- **Firebase Authentication**: Secure user login with email/password
- **Cloud Firestore Database**: Real-time data synchronization across devices
- **User-specific data**: Each user has their own isolated dataset
- **Firebase Storage**: Cloud storage for inspection photos (up to 5 per asset)
- **Real-time updates**: Changes sync instantly across all sessions

### 📋 Advanced Inspection Management
- **Detailed 13-point checklist** covering all NFPA compliance requirements:
  - Pin present
  - Tamper seal intact
  - Gauge shows correct pressure
  - Correct weight
  - No physical damage
  - In designated location
  - Clearly visible
  - Nearest extinguisher under 75ft
  - Top under 5ft from floor
  - Bottom over 4 inches from floor
  - Mounted securely
  - Last inspection within 30 days
  - Tag signed and dated
- **Pass/Fail workflow** with individual checklist item tracking
- **Photo capture** during inspection (with camera integration)
- **GPS location tracking** for precise asset positioning
- **Inspection notes** with automatic failed-items summary
- **Complete inspection history** with timestamps, inspector info, and checklist data
- **Status reset capability** for re-inspection workflows

### 📸 Photo Management System
- **Up to 5 photos per asset** with cloud storage
- **Main photo designation**: Set primary photo for each asset
- **Thumbnail gallery** with full-size preview
- **Add/delete photos** individually
- **Inspection photos**: Capture photo during each inspection
- **Photo timestamps**: Automatic upload date tracking
- **Hard delete**: Photos are permanently removed from storage when deleted

### 📍 GPS Location Tracking
- **Capture GPS coordinates** for assets and inspections
- **Accuracy tracking**: Shows GPS precision (±meters)
- **Google Maps integration**: "Open in Maps" links for navigation
- **Asset location**: Store permanent GPS coordinates for each asset
- **Inspection location**: Track where each inspection was performed
- **Manual GPS capture**: Button-triggered location recording with high accuracy

### 🏥 Section-Based Organization
- Organize extinguishers by hospital sections:
  - Main Hospital
  - Building A, B, C, D
  - WMC (Women's Medical Center)
  - Employee Parking
  - Visitor Parking
  - FED (Front Entrance Drive)
- **Section filtering** to focus work on specific areas
- **"All Sections" view** for searching across entire inventory
- **Per-section statistics**: Pending, passed, and failed counts
- **Smart sorting**: Automatic organization by floor and room number for efficient walking routes

### ⏱️ Time Tracking System
- **Per-section timers** with start/pause/stop controls
- **Real-time display** showing hours, minutes, and seconds
- **Persistent storage**: Timer data saved across sessions
- **Section time summary** modal with complete breakdown
- **Export time data** to Excel with calculated metrics
- **Clear individual or all times**: Easy reset for new inspection cycles

### 📱 Dual Barcode Scanning
- **Camera-based scanning**: Uses device camera with BarcodeDetector API
- **Manual entry mode**: Keyboard input for handheld scanners or manual lookup
- **Multi-format support**: Code 128, QR codes, Data Matrix, and more
- **Instant asset lookup**: Immediate navigation to scanned extinguisher
- **Search by Asset ID or Serial Number**: Flexible matching
- **Real-time feedback**: Visual and audio confirmation of successful scans

### 📊 Comprehensive Data Management
- **Excel/CSV Import**: Bulk upload with automatic section assignment
- **Section-specific imports**: Assign all imported items to a chosen section
- **Export options**:
  - **All data**: Complete inventory with full checklist details
  - **Passed items only**: Compliance reporting
  - **Failed items only**: Maintenance work orders
  - **Time tracking report**: Labor hours by section with item counts
- **Checklist data in exports**: Full pass/fail status for each inspection point
- **Monthly cycle reset**: Archive current month and start fresh with one click

### 🔄 Monthly Inspection Cycle Management
- **Start new monthly cycle**: Reset all extinguishers to "pending" status
- **Historical logging**: Save previous month's results to inspection logs
- **Inspection history preservation**: All past inspections remain accessible
- **Confirmation dialogs**: Prevent accidental resets
- **Status summary**: Shows counts before reset for verification

### 🎯 Smart Filtering & Sorting
- **Real-time search**: Filter by Asset ID, Serial Number, Vicinity, or Location
- **Section view modes**: Toggle between "Unchecked" and "Checked" items per section
- **Persistent view preferences**: View mode saved per section
- **Walking-order sorting**: Automatic organization by:
  - Floor level (basement to top floor)
  - Room numbers (numerical order)
  - Vicinity name (alphabetical)
- **Status filtering**: View pending, passed, or failed items

### 👨‍💼 Admin Mode
- **Protected database operations**: Toggle admin mode for sensitive actions
- **Import controls**: Restrict bulk data imports to admins
- **Add new assets**: Create individual fire extinguisher records
- **Edit asset details**: Modify Asset ID, Serial, Location, Section, GPS
- **Delete extinguishers**: Remove obsolete or duplicate assets
- **Clear all data**: Nuclear option for complete database reset (with confirmation)

### 📈 Real-Time Dashboard
- **Global statistics**: Total pending, passed, failed, and completion percentage
- **Per-section breakdowns**: Individual statistics for each hospital area
- **Visual progress tracking**: Color-coded status indicators
- **Time tracking display**: Active timer and accumulated time per section
- **Completion percentage**: Automatic calculation of inspection progress

### 💾 Data Persistence
- **Firebase Firestore**: Primary cloud database storage
- **Real-time sync**: Automatic data synchronization via onSnapshot listeners
- **User isolation**: Data scoped by Firebase user ID
- **Session state**: UI preferences saved to localStorage
- **Offline support**: Local timer data with cloud sync capability

## Technology Stack

- **Frontend Framework**: React 18 with React Router
- **Build Tool**: Vite (with Hot Module Replacement)
- **Styling**: Tailwind CSS with responsive design
- **Icons**: Lucide React icon library
- **Backend**: Firebase (Authentication, Firestore, Storage)
- **Data Processing**: XLSX (SheetJS) for Excel/CSV import/export
- **State Management**: React hooks with Firestore real-time listeners
- **Barcode Scanning**: Native BarcodeDetector API with polyfill fallback
- **Geolocation**: Native browser Geolocation API with high accuracy mode

## Data Structure

Each fire extinguisher record contains:

```javascript
{
  id: "firestore-document-id",
  assetId: "FE-12345",
  serial: "SN789456",
  vicinity: "Near elevator bank",
  parentLocation: "2nd Floor East Wing",
  section: "Main Hospital",
  status: "pending" | "pass" | "fail",
  checkedDate: "2025-10-10T14:30:00Z",
  notes: "Pressure gauge in green zone",
  userId: "firebase-user-uid",
  createdAt: "2025-10-01T08:00:00Z",

  // Photo management (up to 5 photos)
  photos: [
    {
      url: "https://firebase-storage-url/photo1.jpg",
      uploadedAt: "2025-10-15T10:30:00Z",
      path: "assets/FE-12345/1729000000_photo.jpg"
    }
  ],

  // GPS location
  location: {
    lat: 33.4484,
    lng: -84.3880,
    accuracy: 15,
    capturedAt: "2025-10-15T10:30:00Z"
  },

  // Latest inspection photo and GPS
  lastInspectionPhotoUrl: "https://firebase-storage-url/inspection.jpg",
  lastInspectionGps: {
    lat: 33.4484,
    lng: -84.3880,
    accuracy: 10,
    capturedAt: "2025-10-21T14:30:00Z"
  },

  // Detailed checklist data
  checklistData: {
    pinPresent: "pass" | "fail" | "n/a",
    tamperSealIntact: "pass" | "fail" | "n/a",
    gaugeCorrectPressure: "pass" | "fail" | "n/a",
    weightCorrect: "pass" | "fail" | "n/a",
    noDamage: "pass" | "fail" | "n/a",
    inDesignatedLocation: "pass" | "fail" | "n/a",
    clearlyVisible: "pass" | "fail" | "n/a",
    nearestUnder75ft: "pass" | "fail" | "n/a",
    topUnder5ft: "pass" | "fail" | "n/a",
    bottomOver4in: "pass" | "fail" | "n/a",
    mountedSecurely: "pass" | "fail" | "n/a",
    inspectionWithin30Days: "pass" | "fail" | "n/a",
    tagSignedDated: "pass" | "fail" | "n/a"
  },

  // Complete inspection history
  inspectionHistory: [
    {
      date: "2025-09-21T10:15:00Z",
      status: "pass",
      notes: "All checks normal",
      inspector: "user@example.com",
      checklistData: { /* full checklist */ },
      photoUrl: "https://firebase-storage-url/inspection.jpg",
      gps: { lat: 33.4484, lng: -84.3880, accuracy: 12 }
    }
  ],

  lastMonthlyReset: "2025-10-01T00:00:00Z"
}
```

## Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn package manager
- Firebase account (free tier works fine)

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

3. **Configure Firebase** (required):
   - Create a Firebase project at https://console.firebase.google.com
   - Enable **Authentication** (Email/Password provider)
   - Enable **Firestore Database** (start in test mode, then configure security rules)
   - Enable **Storage** (for photo uploads)
   - Copy your Firebase config to `src/firebase.js`:
   ```javascript
   import { initializeApp } from 'firebase/app';
   import { getAuth } from 'firebase/auth';
   import { getFirestore } from 'firebase/firestore';
   import { getStorage } from 'firebase/storage';

   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_AUTH_DOMAIN",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_STORAGE_BUCKET",
     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
     appId: "YOUR_APP_ID"
   };

   const app = initializeApp(firebaseConfig);
   export const auth = getAuth(app);
   export const db = getFirestore(app);
   export const storage = getStorage(app);
   ```

4. **Configure Firestore Security Rules**:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /extinguishers/{docId} {
         allow read, write: if request.auth != null &&
                            request.resource.data.userId == request.auth.uid;
       }
       match /inspectionLogs/{docId} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

5. **Configure Storage Security Rules**:
   ```javascript
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /assets/{userId}/{allPaths=**} {
         allow read, write: if request.auth != null;
       }
       match /inspections/{userId}/{allPaths=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

6. Start development server:
```bash
npm run dev
```

7. Open your browser to `http://localhost:5173`

8. **Create user account**: Use the login screen to register a new account

## Usage

### First-Time Setup

1. **Login/Register**: Create an account or login with existing credentials
2. **Enable Admin Mode**: Click the settings icon to toggle admin mode
3. **Import Initial Data**: Click menu → "Import Data File (By Section)"
4. **Select Section**: Choose which hospital section the data belongs to
5. **Upload File**: Select your Excel/CSV file with asset data

### Starting a Monthly Inspection Cycle

1. **Select Section**: Click on the hospital section you want to inspect
2. **Start Timer**: Click "Start Timer" to begin tracking inspection time
3. **View Unchecked Items**: Default view shows pending inspections

### Conducting Detailed Inspections

1. **Find Extinguisher**: Use one of three methods:
   - Click **"Camera Scan"** to scan barcode with device camera
   - Click **"Manual Entry"** to type or use handheld scanner
   - Use the **search bar** to filter by Asset ID, Serial, or Location

2. **Open Inspection Modal**: Click on extinguisher card or scan to open

3. **Review Details**: Verify Asset ID, Serial, Location, Section

4. **Add Photos** (optional):
   - Click "Add Photo" to capture up to 5 photos
   - First photo becomes the main photo
   - Hover over photos to set as main or delete

5. **Capture GPS** (optional):
   - Click "Capture GPS" for precise location coordinates
   - View accuracy rating (±meters)
   - Click "Open in Maps" to verify location

6. **Complete 13-Point Checklist**:
   - Mark each item as Pass, Fail, or N/A
   - All items default to "Pass" for efficiency
   - Failed items automatically added to notes

7. **Add Notes** (optional):
   - Enter specific observations or issues
   - Notes combine with failed checklist items

8. **Capture Inspection Photo** (optional):
   - Take photo during inspection for compliance proof

9. **Mark Status**: Click **"PASS"** or **"FAIL"**
   - Checklist data, photo, GPS, and notes all saved together

### Section Progress Tracking

1. **Monitor Progress**: Watch real-time statistics update
   - Pending count decreases as inspections complete
   - Completion percentage increases
   - Timer shows accumulated time

2. **Pause/Resume Timer**: Use pause button for breaks
3. **Switch Views**: Toggle between "Unchecked" and "Checked" items
4. **View Checked Items**: Review completed inspections

### Managing Assets

1. **Edit Asset Details**:
   - Open asset inspection modal
   - Click "Edit Extinguisher Details"
   - Update Asset ID, Serial, Location, Section, GPS, or Photos
   - Click "Save Changes"

2. **Delete Asset** (admin only):
   - Open edit modal
   - Click "Delete" button
   - Confirm deletion

3. **Add New Asset** (admin only):
   - Enable admin mode
   - Click menu → "Add New Fire Extinguisher"
   - Fill in Asset ID (required), Serial, Vicinity, Parent Location
   - Select Section
   - Optionally add photo and GPS
   - Click "Add Fire Extinguisher"

### Completing a Section

1. **Stop Timer**: Click "Stop Timer" when section is complete
2. **Review Failed Items**: Toggle to "Checked" view, filter by status
3. **Export Failed Items**: Menu → "Export Failed Only" for work orders
4. **Move to Next Section**: Select another section tab

### End of Month Reporting

1. **View Time Tracking**: Click "View All Times" or menu → time summary
2. **Export Reports**:
   - **Export All Data**: Complete inventory with checklist details
   - **Export Passed Only**: Compliance report
   - **Export Failed Only**: Maintenance work orders
   - **Export Time Data**: Labor hours by section

3. **Start New Monthly Cycle**:
   - Click menu → "Start New Monthly Cycle"
   - Review confirmation dialog (shows current month stats)
   - Confirm to reset all statuses to "pending"
   - Previous month data saved to inspection logs

### Monthly Reset Process

The monthly reset:
- ✅ Resets all extinguisher statuses to "pending"
- ✅ Preserves all inspection history on each asset
- ✅ Creates inspection log snapshot of current month
- ✅ Clears current month checklist data
- ✅ Keeps all photos and GPS locations
- ✅ Maintains asset details (ID, Serial, Location, Section)

## Development

### Available Commands

- `npm run dev` — Start Vite development server with React Fast Refresh
- `npm run build` — Create production build in `dist/` directory
- `npm run preview` — Serve the built `dist/` locally for verification
- `npm run lint` — Run ESLint across source files (zero warnings policy)

### Code Organization

```
src/
├── App.jsx                     # Main application component and business logic
├── main.jsx                    # React entry point with Router
├── index.css                   # Tailwind CSS configuration
├── firebase.js                 # Firebase configuration (Auth, Firestore, Storage)
├── Login.jsx                   # Authentication UI component
└── components/
    ├── BarcodeScanner.jsx      # Camera-based barcode scanning component
    ├── SectionGrid.jsx         # Section overview grid (home page)
    └── SectionDetail.jsx       # Section detail view with checklist modal
```

### Firebase Collections

- **`extinguishers`** — Fire extinguisher assets (scoped by `userId`)
- **`inspectionLogs`** — Monthly inspection cycle snapshots

### localStorage Keys

- `sessionState_{userId}` — Current filters and UI state per user
- `sectionTimes_{userId}` — Time tracking data per section per user
- `sectionView_{section}` — View mode preference per section (unchecked/checked)

### Photo Storage Structure

```
firebase-storage/
├── assets/
│   └── {assetId}/
│       └── {timestamp}_{filename}.jpg    (up to 5 photos per asset)
└── inspections/
    └── {assetId}/
        └── {timestamp}_{filename}.jpg    (one photo per inspection)
```

## Browser Compatibility

- **Chrome/Edge (recommended)**: Full support including BarcodeDetector API
- **Firefox**: Full support with BarcodeDetector polyfill
- **Safari**: Full support with BarcodeDetector polyfill
- **Mobile browsers**: Responsive design, full functionality
- **iOS Safari/Chrome**: Camera access for barcode scanning and photo capture
- **Android Chrome**: Native BarcodeDetector API support

## Feature Highlights

### 🎯 What Makes This App Special

1. **Complete Offline Capability**: All timer data stored locally; works even when internet drops
2. **13-Point NFPA Compliance Checklist**: Automated compliance tracking for fire code requirements
3. **Smart Walking Routes**: Automatic sorting by floor and room number for efficient inspections
4. **Photo Management**: Up to 5 reference photos per asset plus inspection photos
5. **GPS Precision**: Track exact asset locations with accuracy ratings
6. **Firebase Real-time Sync**: Changes instantly appear across all logged-in devices
7. **Monthly Audit Trail**: Complete historical logging of inspection cycles
8. **Dual Scanning Modes**: Both camera-based and handheld scanner support
9. **Time Tracking**: Accurate labor reporting by hospital section
10. **Admin Safeguards**: Protected controls prevent accidental data loss

### 📱 Mobile-First Design

- Fully responsive interface works on phones, tablets, and desktops
- Touch-optimized buttons and controls
- Camera integration for photo capture and barcode scanning
- GPS location services for asset mapping
- Works great on hospital Wi-Fi or cellular data

### 🔒 Security Features

- Firebase Authentication with email/password
- User-scoped data (users only see their own data)
- Firestore security rules enforce user isolation
- Storage security rules protect uploaded photos
- Admin mode toggle for sensitive operations

### 🚀 Performance

- React 18 with Fast Refresh for instant development updates
- Vite build system for lightning-fast builds
- Real-time Firestore listeners for instant data sync
- Optimized photo thumbnails and lazy loading
- Efficient filtering and sorting algorithms

## Troubleshooting

### Camera Scanner Not Working
- **Check browser permissions**: Allow camera access when prompted
- **Use HTTPS**: Camera API requires secure connection (or localhost)
- **Try different browser**: Chrome/Edge have best support
- **Check lighting**: Ensure barcode is well-lit and in focus

### GPS Location Issues
- **Enable location services**: Check device settings
- **Allow browser permission**: Grant location access when prompted
- **Wait for high accuracy**: GPS may take 5-10 seconds to achieve best accuracy
- **Move to open area**: GPS works best with clear view of sky

### Data Not Syncing
- **Check internet connection**: Firestore requires connectivity
- **Verify Firebase config**: Ensure `src/firebase.js` is properly configured
- **Check console for errors**: Open browser DevTools for detailed error messages
- **Verify Firestore rules**: Ensure security rules allow authenticated access

### Photos Not Uploading
- **Check Storage rules**: Verify Firebase Storage security rules
- **Verify file size**: Large photos may take time to upload
- **Check internet speed**: Slow connections may timeout
- **Try smaller photos**: Compress images if necessary

### Import Failing
- **Check file format**: Only CSV, XLS, and XLSX supported
- **Verify column names**: Should include "Asset ID", "Serial", "Vicinity", "Parent Location"
- **Check for special characters**: Some characters may cause parsing issues
- **Try smaller batches**: Import in chunks if file is very large

## Roadmap

Future enhancements under consideration:

- [ ] Offline mode with background sync when connection returns
- [ ] Scheduled notifications for upcoming inspections
- [ ] Barcode printing integration for new assets
- [ ] Advanced analytics and trend reporting
- [ ] Multi-user collaboration features
- [ ] Mobile app versions (iOS/Android)
- [ ] QR code generation for quick asset access
- [ ] Integration with work order systems
- [ ] Automated monthly report email distribution
- [ ] Custom checklist templates per building/section

## License

Copyright © 2025 David Beck (built_by_Beck). All rights reserved.

This software is proprietary and confidential. See LICENSE file for details.

## Developer

**David Beck** (built_by_Beck)
Life Safety Technician

For questions, support, or licensing inquiries, please contact the developer.

---

Built with React + Vite + Firebase | Cloud-First with Offline Support
