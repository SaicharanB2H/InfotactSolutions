# ⚡ StreamWeaver — High-Throughput No-Code ETL Platform

StreamWeaver is a high-throughput, memory-safe, no-code ETL (Extract, Transform, Load) platform designed to stream, transform, map, and bulk-ingest multi-gigabyte CSV/JSON datasets (5M+ rows) into MongoDB with real-time WebSocket progress monitoring.

---

## 📁 Repository Structure

* **[`client/`](./client)**: Modern React 19 + Vite + Tailwind CSS v4 + React Window frontend application.
* **[`backend/`](./backend)**: Node.js Streams + Express + MongoDB BulkWrite + WebSockets + V8 Sandbox backend API server.

---

## 🚀 Quick Start Guide

### 1. Start MongoDB Server
Ensure MongoDB is running locally at `mongodb://127.0.0.1:27017/streamweaver`.

### 2. Start Backend Server

```bash
cd backend
npm install
npm run dev
```

Backend server runs on `http://localhost:5000` (WebSocket at `ws://localhost:5000/ws`).

### 3. Start Frontend Client

```bash
cd client
npm install
npm run dev
```

Frontend application runs on `http://localhost:5173`.

---

## ⚙️ Documentation

* Read the **[Client Documentation](./client/README.md)** for UI features, components, and hooks.
* Read the **[Backend Documentation](./backend/README.md)** for architecture, REST endpoints, streaming pipelines, and sandbox security.

---

## 📄 License

MIT License.