# ⚡ StreamWeaver Frontend — High-Throughput No-Code ETL SaaS Platform

StreamWeaver is a modern, high-throughput no-code ETL (Extract, Transform, Load) web platform built with **React**, **Vite**, **Tailwind CSS v4**, and **React Window**. It empowers data engineers and business users to stream, transform, map, and ingest multi-gigabyte datasets without writing complex code.

---

## 🚀 Key Features

* **🎨 Modern Data-Engineering SaaS Design System**: Dark-themed UI with high-contrast surfaces, glowing badges, skeleton loaders, and responsive layouts.
* **🔒 Authentication & Session Persistence**: Complete Login and Registration flow integrated with backend `/api/auth` endpoints and `AuthContext`.
* **⚡ 7-Step ETL Pipeline Wizard**:
  1. **Upload**: Drag-and-drop CSV/JSON dataset streaming upload.
  2. **Preview**: Virtualized dataset inspection (up to 1,000+ rows) powered by `react-window` without freezing the browser DOM.
  3. **Mapping**: Visual source-to-destination field mapping with auto-mapping heuristics.
  4. **Transform**: Transformation rule builder (UPPERCASE, lowercase, trim, prefix/suffix, custom JS sandbox snippet strings).
  5. **Destination**: MongoDB target collection configuration.
  6. **Review**: Configuration summary before execution.
  7. **Process**: Live launch of stream execution.
* **📡 Real-Time WebSocket Progress Monitoring**: Live connection to `ws://localhost:5000/ws/jobs/:jobId` displaying:
  * Progress percentage bar (%)
  * Processed rows counter & ingested total
  * Real-time throughput speed meter (**rows/sec**)
  * Failed rows tally & error alerts
  * Elapsed timer
  * Status badges (`QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`, `CANCELLED`)
  * Interactive pipeline execution timeline phases
* **⚠️ Failed Record Inspector & Export**: Paginated inspection of failed dataset records with 1-click JSON export.
* **📂 Pipeline Catalog & History**: Filterable pipeline catalog page (Status tabs: `ALL`, `RUNNING`, `COMPLETED`, `FAILED`), search bar, and action triggers.
* **🔍 Deep Pipeline Inspection**: View mapping rules, transformation snippets, target collection, and execution history.
* **⚙️ Infrastructure Health Dashboard**: Real-time status monitoring for Express API health and MongoDB database cluster state.

---

## 🛠️ Technology Stack

* **Core**: React 19, Vite 8, JavaScript (ES Modules)
* **Styling**: Tailwind CSS v4, React Icons (`react-icons/fi`)
* **Routing**: React Router v7
* **Virtualization**: `react-window` (`FixedSizeList`)
* **CSV Parsing**: `papaparse`
* **HTTP Client**: `axios`
* **WebSockets**: Native Browser WebSocket API with custom `useWebSocket` React hook

---

## 📁 Project Structure

```text
client/src/
├── components/
│   ├── common/
│   │   ├── EmptyState.jsx          # Reusable empty states with CTAs
│   │   ├── SkeletonLoader.jsx      # Animated skeleton loaders
│   │   ├── StatusBadge.jsx         # Status pill badges (Completed, Processing, etc.)
│   │   └── Toast.jsx               # Notification alerts
│   ├── layout/
│   │   ├── Layout.jsx              # Main dark SaaS layout container
│   │   ├── Navbar.jsx              # Header with system health status & user drawer
│   │   └── Sidebar.jsx             # Collapsible sidebar navigation & brand logo
│   ├── mapping/
│   │   └── ColumnMapper.jsx        # Source-to-destination field mapper
│   ├── preview/
│   │   └── VirtualizedTable.jsx    # High-performance react-window dataset table
│   ├── processing/
│   │   └── LiveProgressView.jsx    # Real-time WebSocket throughput & timeline monitor
│   └── transformation/
│       └── TransformBuilder.jsx    # Rule builder for casing, trimming, JS sandboxing
├── context/
│   └── AuthContext.jsx             # JWT token & user session management
├── hooks/
│   ├── useAuth.js                  # Exported AuthContext hook
│   └── useWebSocket.js             # Real-time WebSocket metric hook
├── pages/
│   ├── Dashboard/
│   │   └── Dashboard.jsx           # Overview dashboard with real pipeline metrics
│   ├── Login/
│   │   └── Login.jsx               # Sign in page
│   ├── Register/
│   │   └── Register.jsx            # Account creation page
│   ├── CreatePipeline.jsx          # Interactive 7-step ETL creation wizard
│   ├── Landing.jsx                 # Public landing page with features & workflow
│   ├── PipelineDetails.jsx         # Detailed pipeline configuration viewer
│   ├── Pipelines.jsx               # Filterable pipeline catalog
│   ├── Processing.jsx              # Dedicated WebSocket processing & error inspector
│   ├── Settings.jsx                # System health status & engine limits monitor
│   └── Upload/
│       └── Upload.jsx              # Standalone Quick Upload interface
├── routes/
│   └── AppRoutes.jsx               # Router configuration & protected routes
└── services/
    ├── api.js                      # Axios instance with request authorization headers
    ├── authService.js              # Register & Login API calls
    ├── healthService.js            # Infrastructure health API call
    ├── jobService.js               # Start, status, cancel, and error log calls
    ├── pipelineService.js          # Full CRUD operations on /api/pipelines
    ├── previewService.js           # Streaming CSV preview parser call
    ├── uploadService.js            # Multipart dataset streaming upload call
    └── websocket.js                # Job WebSocket connection manager
```

---

## ⚙️ Installation & Setup

### 1. Install Dependencies

```bash
cd client
npm install
```

### 2. Configure Environment Variables

Create or edit `.env` in the `client/` directory:

```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

### 4. Build for Production

```bash
npm run build
```

The production output will be generated in `client/dist`.

---

## 🔌 API & WebSocket Integration Summary

* **Backend Base URL**: Configured via `VITE_API_URL` (`http://localhost:5000/api`).
* **Authentication**: Token stored in `localStorage` under `token` and automatically attached via Axios interceptors.
* **WebSocket Endpoint**: Connects dynamically to `ws://localhost:5000/ws/jobs/:jobId` to receive real-time progress events:
  * `{ type: 'started', jobId, status }`
  * `{ type: 'progress', jobId, processedRows, failedRows, rowsPerSecond, progress }`
  * `{ type: 'completed', jobId, processedRows, totalRows, rowsPerSecond }`
  * `{ type: 'error', jobId, message }`

---

## 📄 License

MIT License.
