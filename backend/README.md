# 🌊 StreamWeaver — High-Throughput No-Code ETL Pipeline Backend

StreamWeaver is a high-throughput, memory-safe, no-code ETL (Extract, Transform, Load) pipeline backend engineered with **Node.js Native Streams and Backpressure**.

It processes multi-gigabyte CSV and JSON datasets (5M+ rows) without loading entire files into RAM or causing V8 heap out-of-memory crashes (`JavaScript heap out of memory`).

---

## 🏗️ Architecture & Pipeline Flow

```text
               STREAMWEAVER BACKEND PIPELINE ARCHITECTURE
               
                         HTTP Multipart Upload
                                  │
                                  ▼
                         Busboy Streaming
                                  │
                                  ▼
                        File Write Stream (Disk)
                                  │
                                  ▼
                       fs.createReadStream
                                  │
                        ┌─────────┴─────────┐
                        ▼                   ▼
                   CSV Parser          JSON / NDJSON Parser
                   (csv-parser)          (split2 / json)
                        └─────────┬─────────┘
                                  │
                                  ▼
                      StreamWeaver Transform
                    (Column Mapping Engine)
                                  │
                                  ▼
                       V8 Sandbox Executor
                        (isolated-vm / vm)
                                  │
                                  ▼
                      StreamWeaver Validation
                   (Schema & Field Rules Engine)
                                  │
                       ┌──────────┴──────────┐
                       │                     │
                     Valid                Invalid
                       │                     │
                       ▼                     ▼
                  Mongo Bulk Writable     FailedRow Collection
                (bulkWrite Batch 5000)     (Buffered Insert)
                       │
                       ├────────────────────┐
                       ▼                    ▼
                Job Statistics        WebSocket Progress
               (Rows/sec, Progress)     (ws:// /ws/jobs/:id)
                       │                    │
                       ▼                    ▼
               Mongoose Storage      React Frontend UI
```

---

## 🛠️ Required Stack & Technologies

* **Node.js** (v18+ with ES Modules `"type": "module"`)
* **Express.js** (REST API framework)
* **MongoDB & Mongoose** (Dynamic destination collections & metadata)
* **Native Node.js `stream` & `fs`** (Zero-copy backpressured streaming pipeline)
* **`busboy`** (Streaming multipart upload processing)
* **`csv-parser` & `split2`** (Streaming CSV/JSON line parsers)
* **`isolated-vm`** (Secure V8 JS transformation sandbox with `node:vm` fallback)
* **`ws`** (Real-time WebSocket progress reporting)
* **`dotenv` / `cors` / `helmet` / `express-rate-limit`** (Security & Config)

---

## ⚙️ Installation & Environment Setup

### 1. Clone & Install Dependencies

```bash
cd infotact_backend
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/streamweaver
UPLOAD_DIR=./uploads
TEMP_DIR=./temp

MAX_FILE_SIZE_GB=10

WS_PATH=/ws

SANDBOX_TIMEOUT_MS=100
SANDBOX_MEMORY_MB=32

BATCH_SIZE=5000
MAX_CONCURRENT_JOBS=2

NODE_ENV=development
```

### 3. Start Local MongoDB Server

Ensure local MongoDB is running:

```bash
# Windows / Mac / Linux local MongoDB service
mongod --dbpath /data/db
```

---

## 🚀 Running the Server

### Development Mode (with auto-reload)

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

---

## 🧪 Testing & Memory Audits

### Run Automated Unit & Integration Tests

```bash
npm test
```

### Generate a 1,000,000 Row Test CSV File

```bash
node scripts/generate-csv.js 1000000
```

### Run Memory Safety Audit

```bash
npm run memory-test
```

---

## 📡 API Endpoints Reference

### 1. Health Checks
* `GET /api/health`: Check server and database connection status.
* `GET /api/health/ready`: Readiness probe for deployment.

### 2. Streaming File Upload
* `POST /api/upload`: Multipart upload with field `file` and optional field `pipelineId`.
  * Response: `{ "success": true, "jobId": "uuid", "fileName": "...", "fileSize": 1048576 }`

### 3. Pipeline Definitions (CRUD)
* `POST /api/pipelines`: Create ETL pipeline configuration.
* `GET /api/pipelines`: List all pipeline configurations.
* `GET /api/pipelines/:id`: Get pipeline details by ID.
* `PUT /api/pipelines/:id`: Update pipeline details.
* `DELETE /api/pipelines/:id`: Delete pipeline configuration.

#### Pipeline JSON Example:

```json
{
  "name": "Customer Import Pipeline",
  "sourceFormat": "CSV",
  "destinationCollection": "customers",
  "mapping": {
    "firstName": "Column A",
    "email": "Column B",
    "age": "age"
  },
  "transformations": [
    {
      "sourceField": "firstName",
      "targetField": "firstName",
      "code": "return value.toUpperCase();"
    }
  ],
  "validationRules": {
    "email": { "required": true, "type": "email" },
    "age": { "type": "number", "min": 18 }
  }
}
```

### 4. Job Control & Management
* `POST /api/jobs/:jobId/start`: Start executing an uploaded job.
* `GET /api/jobs/:jobId`: Get current progress metrics & job status.
* `POST /api/jobs/:jobId/cancel`: Cancel an actively processing job.
* `GET /api/jobs/:jobId/errors?page=1&limit=50`: Paginated list of failed rows.
* `DELETE /api/jobs/:jobId`: Delete job record and associated temporary files.

---

## 🔌 WebSocket Real-Time Progress API

Connect from your frontend using standard WebSockets:

```javascript
const socket = new WebSocket('ws://localhost:5000/ws/jobs/YOUR_JOB_ID');

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Progress Update:', data);
};
```

### Progress Payload Example:

```json
{
  "type": "progress",
  "jobId": "b1a2c3d4",
  "status": "PROCESSING",
  "processedRows": 250000,
  "failedRows": 14,
  "rowsPerSecond": 18500,
  "progress": 25
}
```

---

## 🛡️ Security & Sandboxing Features

1. **V8 Isolated Execution (`isolated-vm`)**: User-written transformation scripts run inside an isolated V8 isolate context with 100ms timeouts and 32MB RAM limits.
2. **Zero `eval()`**: User code is NEVER executed in the main Node.js event loop thread context.
3. **Stream Backpressure**: The stream pipeline pauses automatically when MongoDB bulk writes are pending, preventing unbounded memory growth.
4. **Filename Sanitization**: Sanitizes input filenames to prevent path traversal attacks.

---

## 📄 License

MIT License.
