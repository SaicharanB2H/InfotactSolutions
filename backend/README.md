# StreamWeaver — High-Performance Streaming ETL Backend

StreamWeaver is a production-quality Node.js backend specialized in processing massive CSV datasets (GBs of data, millions of rows) while maintaining a low, flat memory footprint (under 150MB RSS). 

By leveraging native Node.js streams, strict backpressure propagation, secure Javascript sandboxing via V8 isolates, and batch database ingestion, the system prevents V8 heap exhaustion and server crashes under heavy load.

---

## 1. System Architecture & Data Flow

StreamWeaver coordinates an end-to-end streaming data pipeline. Data is read incrementally, transformed in V8 Isolates, validated, batched, and bulk-inserted into MongoDB.

```mermaid
flowchart TD
    Client[HTTP client / upload] -->|Raw multipart stream| Busboy[Busboy Stream Parser]
    Busboy -->|Incremental chunks| WriteTemp[fs.createWriteStream]
    WriteTemp -->|Save to disk| TempFile[(Temp CSV on Disk)]
    TempFile -->|fs.createReadStream| ByteCounter[Byte Counter Stream]
    ByteCounter -->|Raw chunks| CSVParser[csv-parser Transform]
    CSVParser -->|Row Objects + _rowNumber| MappingStream[Mapping Stream]
    MappingStream -->|Renamed Keys| SandboxStream[Sandbox Transform]
    SandboxStream -->|V8 Isolate Execution| ValidationStream[Validation Stream]
    ValidationStream -->|Type Checking & Constraints| BulkWriteStream[Bulk Write Writable]
    
    subgraph Stream Pipeline (Backpressure Managed)
        ByteCounter
        CSVParser
        MappingStream
        SandboxStream
        ValidationStream
        BulkWriteStream
    end
    
    BulkWriteStream -->|Batch Size: 5000| MongoDB[(MongoDB bulkWrite)]
    BulkWriteStream -.->|Throttled Metrics| WS[WebSocket Server]
    WS -.->|Live Progress updates| Frontend[Frontend UI]
```

---

## 2. Preventing V8 Heap Exhaustion & Managing Backpressure

### Why Traditional Uploads Fail
A standard Node.js server loading files via `fs.readFile()` or buffering requests via `multer` stores the entire file content as a single buffer in RAM. When handling a 2GB+ file, this immediately exceeds the default V8 heap allocation limits (~1.4GB on 64-bit systems), resulting in an `Out of Memory (OOM)` crash.

### StreamWeaver's Memory-Safe Pipeline
1. **Direct Disk Stream**: Busboy streams raw socket bytes straight to a temporary file on disk. Node.js never retains more than a few kilobytes of the incoming upload in memory at a time.
2. **Backpressure Propagation**: When MongoDB is slow to process writes, downstream streams fill up. If the batch in `BulkWriteStream` is currently writing to MongoDB, it delays invoking the `_write` callback. This propagates backpressure upstream:
   - The validation, transformation, mapping, and CSV parser streams pause.
   - The file read stream pauses reading chunks from the disk.
   - Node.js native V8 engine pauses allocating memory for incoming buffers, resulting in a flat, predictable memory profile regardless of file size.
3. **Sandbox Garbage Collection**: The JavaScript sandbox instantiates a V8 `Isolate` per job. After processing, the isolate is explicitly disposed of, returning native C++ memory back to the OS.

---

## 3. Installation & Setup

### Prerequisites
* **Node.js** v20.x or newer (Node.js v24.x supported)
* **Visual Studio Build Tools (C++ compiler)** and **Python** (Required on Windows to compile native bindings for `isolated-vm`)
* **MongoDB** instance (Local or Atlas remote connection)

### Steps
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies (on npm v11+, approve compilation scripts if prompted):
   ```bash
   npm install
   npm approve-scripts isolated-vm
   ```
3. Copy the environment template and configure variables:
   ```bash
   cp .env.example .env
   ```
4. Update the `MONGODB_URI` inside `.env` with your connection string.

---

## 4. Environment Variables

Configure these settings inside your `.env` file:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `5000` | Port for Express & WebSocket servers |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/streamweaver` | MongoDB Connection URI |
| `BULK_BATCH_SIZE` | `5000` | Number of documents to batch before executing `bulkWrite()` |
| `MAX_FILE_SIZE` | `10GB` | Maximum file upload size limit (supports units: GB, MB, KB, B) |
| `SANDBOX_TIMEOUT_MS` | `100` | CPU execution timeout for user JS sandbox per row |
| `PROGRESS_INTERVAL_MS` | `1000` | Interval (ms) for throttled WebSocket progress updates |
| `NODE_ENV` | `development` | Deployment environment (`development` or `production`) |

---

## 5. API Reference

### 1. Pipelines

* **POST** `/api/pipelines`
  Create a data mapping and validation pipeline.
  
  **Request Body:**
  ```json
  {
    "name": "Customer Import Pipeline",
    "mappings": [
      { "source": "Column A", "destination": "username" },
      { "source": "Column B", "destination": "email" },
      { "source": "Column C", "destination": "age" }
    ],
    "transformations": [
      { "field": "username", "code": "return value.trim().toUpperCase();" }
    ],
    "validationRules": [
      { "field": "username", "required": true, "type": "string" },
      { "field": "email", "required": true, "type": "string", "regex": "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$" },
      { "field": "age", "required": true, "type": "number", "min": 18, "max": 100 }
    ]
  }
  ```
  **Response (201 Created):** Returns the created pipeline document including its `_id`.

* **GET** `/api/pipelines/:id`
  Fetch pipeline configuration details.

---

### 2. File Ingestion & Processing

* **POST** `/api/upload`
  Stream upload a CSV file and initiate a background ETL job.
  
  **Content-Type**: `multipart/form-data`
  
  **Form Fields**:
  - `pipelineId`: The ObjectId of the Pipeline configuration.
  - `file`: The raw CSV file.
  
  **Response (202 Accepted):**
  ```json
  {
    "message": "File upload completed successfully. Processing has started.",
    "jobId": "64b58e766fd5e6...",
    "fileName": "customers.csv",
    "totalBytes": 104857600
  }
  ```

* **GET** `/api/jobs/:id`
  Retrieve the real-time execution statistics for a job.
  
  **Response (200 OK):**
  ```json
  {
    "_id": "64b58e766fd5e6...",
    "status": "processing",
    "fileName": "customers.csv",
    "pipelineId": "64b58a123fd5e6...",
    "totalRows": 0,
    "processedRows": 245000,
    "failedRows": 32,
    "rowsPerSecond": 18500,
    "startedAt": "2026-08-18T13:00:00.000Z"
  }
  ```

* **POST** `/api/jobs/:id/cancel`
  Cancel an active, running ETL stream job. Halts reads and database operations immediately.

* **GET** `/api/jobs/:id/errors`
  Retrieve paginated row-level failures for audit.
  
  **Query Parameters**:
  - `page`: Page index (default: `1`)
  - `limit`: Records per page (default: `50`, max: `100` to prevent RAM bloat)
  
  **Response (200 OK):**
  ```json
  {
    "errors": [
      {
        "_id": "64b58f886fd5e...",
        "jobId": "64b58e766fd5e6...",
        "rowNumber": 1204,
        "originalData": { "Column A": "john", "Column B": "invalid-email", "Column C": "25" },
        "errorMessage": "Field 'email' value does not match regex '...'",
        "stage": "validation",
        "timestamp": "2026-08-18T13:02:10.000Z"
      }
    ],
    "pagination": { "total": 1, "page": 1, "limit": 50, "pages": 1 }
  }
  ```

---

### 3. CSV Dataset Preview

* **POST** `/api/preview`
  Generate a 1,000-row preview directly from a multipart upload stream without writing to disk or reading the full file.
  
  **Content-Type**: `multipart/form-data`
  
  **Response (200 OK):**
  ```json
  {
    "columns": ["Column A", "Column B", "Column C"],
    "rows": [
      { "Column A": "John", "Column B": "john@example.com", "Column C": "25" }
    ],
    "totalPreviewRows": 1
  }
  ```

---

### 4. WebSocket Progress Tracking

* **Connection URI**: `ws://localhost:5000/ws/jobs/:jobId`
  
  **Server Emits (Throttled Frame):**
  ```json
  {
    "event": "progress",
    "jobId": "64b58e766fd5e6...",
    "status": "processing",
    "rowsProcessed": 450000,
    "rowsFailed": 14,
    "rowsPerSecond": 19200,
    "percentage": 18,
    "elapsedMs": 23400,
    "estimatedRemainingMs": 106500
  }
  ```

---

## 6. Performance Benchmarking & Memory Profiling

StreamWeaver includes native benchmark profiling.

### 1. Generate Synthetic Data
Generate a massive CSV file (e.g. 100MB, 500MB, 1GB, 2GB) safely:
```bash
# Formats: 100MB, 500MB, 1GB, 2GB
node scripts/generate-large-csv.js 500MB
```

### 2. Execute Benchmark Profile
Runs the complete ETL process locally, tracking peak RSS (Resident Set Size) and throughput speed:
```bash
node scripts/benchmark.js
```

### Benchmark Profile Metrics Sample (100MB File, 2.6M Rows)
```text
================== BENCHMARK PROFILE REPORT ==================
Source File       : D:\vue js\Infotact Solutons\backend\large-dataset.csv
File Size         : 100.00 MB
Total Rows        : 2,611,703
Processing Time   : 84.15 seconds
Throughput Rate   : 31,036 rows/sec
Peak RSS Memory   : 92.45 MB
Peak Heap Used    : 45.10 MB
Success Writes    : 2,611,703
Failed Rows       : 0
MongoDB Batches   : 523
Job Status        : completed
==============================================================
```
*(Notice that Peak RSS stays well below the 150MB target limit even after processing millions of rows).*

---

## 7. Security Configurations
* **JavaScript Sandbox limits**: Code runs inside an isolated V8 instance restricted to `8MB` heap memory and a `100ms` CPU runtime. Standard Node.js contexts (`require`, `process`, `fs`, `network`) are completely omitted from the execution isolate.
* **Multipart Limits**: File uploads are restricted by `MAX_FILE_SIZE` and handled with streaming safety limits.
* **filename Sanitization**: Sanitizes input strings using `path.basename` to prevent path traversal attacks.
* **REST Security**: Integrates `helmet` security headers, CORS protection, and `express-rate-limit` rate-limiting.
