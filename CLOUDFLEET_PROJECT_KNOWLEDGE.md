# CloudFleet — Serverless IoT Fleet Management System
## Authoritative Project Knowledge & Technical Architecture Specification

---

## 1. Document Overview & Governance

### 1.1 Purpose of this Document
This document is the **single authoritative source of truth** for the **CloudFleet** Minimum Viable Product (MVP). It outlines the complete product concept, system architecture, data models, persistence strategies, API interfaces, security controls, simulator mechanics, and demonstration workflows.

Every future architectural decision, implementation task, schema modification, or scope adjustment **must** be reconciled with this document. Competing "project knowledge" files, ad-hoc roadmaps, or divergent markdown summaries must not be created.

### 1.2 Document Governance Policy
1. **Single Source of Truth**: All implementation steps across frontend, backend, simulator, and infrastructure must conform to the specifications in this file.
2. **Change Management**: If an architectural change, schema addition, or scope revision is approved, this document must be updated directly to reflect the change before or alongside code implementation.
3. **Scope Guardrails**: Any feature marked under **Excluded / Future Scope** cannot be introduced silently. Moving an item from Excluded to Approved MVP Scope requires an explicit requirement and a documented change entry in this section.

### 1.3 Version & Revision History
| Version | Date | Status | Description |
| :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-15 | **Approved Baseline** | Initial baseline product concept, simplified S3-based serverless architecture, simulator design, and MVP scope definition established. |

---

## 2. Project Purpose & High-Level Concept

### 2.1 Executive Summary
**CloudFleet** is a simplified, cloud-native Serverless IoT Fleet Management System designed as a functional MVP. It demonstrates the complete end-to-end operational flow of an industrial IoT fleet management platform without requiring physical hardware, proprietary device firmware, or heavyweight IoT brokers.

### 2.2 Core Motivation & Educational/Demonstration Goals
Traditional IoT architectures often require significant operational overhead, hardware provisioning, device credential management, and complex networking protocols (e.g., MQTT brokers, X.509 mutual TLS). 

CloudFleet demonstrates that modern serverless cloud patterns can simulate and execute the fundamental lifecycle of an IoT fleet:
- **Device Identity & Lifecycle**: Provisioning, tracking status (`ONLINE`, `OFFLINE`, `WARNING`), and heartbeats.
- **Telemetry Ingestion & Processing**: Collecting time-stamped environmental/operational metrics, validating them, evaluating thresholds, and persisting historical data.
- **State Synchronization & Visibility**: Rendering real-time fleet health, active alerts, and metrics on a responsive web dashboard.
- **Bi-directional Command & Control**: Sending administrative commands (`START`, `STOP`, `RESTART`, `SET_MODE`), receiving execution confirmations, and reflecting operational state changes across the system.

### 2.3 Software-Simulated IoT Concept
CloudFleet relies on a dedicated **Software Device Simulator** that behaves identically to physical hardware from the backend's perspective.
- Simulated devices hold distinct identities (`CF-DEVICE-001`, `CF-DEVICE-002`, etc.).
- They run stateful software loops generating realistic, time-varying sensor metrics (temperature, humidity, battery level).
- They transmit standard HTTP telemetry payloads to the backend API Gateway.
- They poll or receive commands dispatched by operators from the dashboard, transition internal states, and emit command acknowledgements.
- They simulate degradation, battery decay, thermal spikes, network drops, and graceful or ungraceful offline events.

### 2.4 Real Working Software Standard
CloudFleet is **not** a UI-only prototype, mockup, or static wireframe:
- Backend logic runs on **AWS Lambda** via **Amazon API Gateway**.
- Data persists in **Amazon S3** objects structured systematically.
- Dashboards fetch live state from real API endpoints.
- Commands travel through real API routes, change actual simulator states, and write real audit records.
- All errors, malformed payloads, and edge cases are validated and logged to **Amazon CloudWatch**.

---

## 3. Repository Baseline Findings & Workspace Status

### 3.1 Initial Repository Inspection Findings
On 2026-11-15, an exhaustive inspection of the project workspace (`D:\Sem-5\CloudFeet`) revealed:
1. **Directory State**: The workspace directory is brand new and completely empty.
2. **Git Status**: No version control system (`.git`) is currently initialized.
3. **No Existing Code or Dependencies**: No `package.json`, `tsconfig.json`, `main.tf`, or frontend/backend source files exist.
4. **Naming Discrepancy**: The local filesystem directory is named `CloudFeet`, whereas the official project name is **CloudFleet**. The project codebase, packages, and architecture will strictly use the official name **CloudFleet**.

### 3.2 Target Repository Structure
To maintain clean separation of concerns without introducing microservice fragmentation, the project will be structured as a unified monorepo:

```text
CloudFeet/ (Workspace Root: CloudFleet)
├── .github/
│   └── workflows/
│       └── ci-cd.yml                # CI/CD automated build, test & lint
├── backend/
│   ├── src/
│   │   ├── handlers/                # AWS Lambda handler functions
│   │   │   ├── devices.ts           # Device registration, state, listing
│   │   │   ├── telemetry.ts         # Telemetry intake & processing
│   │   │   ├── commands.ts          # Command dispatch & acknowledgement
│   │   │   └── alerts.ts            # Alert listing & resolution
│   │   ├── services/                # Business logic & S3 storage access layer
│   │   │   ├── s3Storage.ts         # Encapsulated S3 read/write/list operations
│   │   │   ├── alertEngine.ts       # Threshold validation & alert generation
│   │   │   └── deviceState.ts       # State determination & timeout rules
│   │   ├── types/                   # Shared TypeScript models & API contracts
│   │   └── utils/                   # Payload validation & structured logger
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/              # UI components (FleetOverview, DeviceTable, etc.)
│   │   ├── pages/                   # Views (Dashboard, DeviceDetail, Alerts)
│   │   ├── services/                # Backend API client
│   │   ├── types/                   # Frontend model interfaces
│   │   └── App.tsx
│   ├── package.json
│   └── tsconfig.json
├── simulator/
│   ├── src/
│   │   ├── device.ts                # Single simulated device state machine
│   │   ├── runner.ts                # Multi-device runner / CLI orchestrator
│   │   ├── telemetryGen.ts          # Realistic value generation with variance
│   │   └── apiClient.ts             # HTTP client communicating with backend API
│   ├── package.json
│   └── tsconfig.json
├── terraform/
│   ├── main.tf                      # AWS Provider, module references
│   ├── s3.tf                        # S3 bucket, encryption, access policies
│   ├── lambda.tf                    # Lambda functions, roles, runtime settings
│   ├── apigateway.tf                # API Gateway HTTP API routes & integrations
│   ├── cloudwatch.tf                # Log groups & metric filters
│   ├── variables.tf                 # Environment parameters
│   └── outputs.tf                   # API endpoints & bucket names
├── CLOUDFLEET_PROJECT_KNOWLEDGE.md  # Single Source of Truth
└── README.md                        # Quickstart & demonstration overview
```

### 3.3 Undetermined Items / Pre-Implementation Open Questions
Before commencing code implementation, the following technical items must be resolved:
1. **Lambda & Simulator Runtime**: Confirmation of TypeScript (Node.js 20.x) across backend, frontend, and simulator for maximum code sharing and typing consistency vs. Python.
2. **Command Dispatch Mechanism**: Decision between a poll-based model (simulator periodically polls `GET /devices/{id}/commands/pending`) vs direct webhook dispatch (simulator exposes local endpoint or maintains long poll). *Recommendation: Poll-based model to adhere to serverless patterns and eliminate NAT/firewall constraints for the simulator.*
3. **Heartbeat/Offline Evaluation Trigger**: Decision between "lazy evaluation on read" (status calculated dynamically when querying `GET /devices` or `GET /devices/{id}` based on `lastSeen` vs `now - threshold`) vs "active cron worker" (EventBridge rule triggering a Lambda every 60 seconds). *Recommendation: Implement lazy evaluation on read with a complementary scheduled sweeper Lambda to raise explicit persistent `DEVICE_OFFLINE` alert records.*

---

## 4. Scope Boundaries: Approved MVP Scope vs Excluded / Future

To prevent scope creep and maintain architectural integrity, boundaries are strictly enforced.

| Domain | APPROVED MVP SCOPE | EXCLUDED / FUTURE (NOT CURRENTLY IMPLEMENTED) |
| :--- | :--- | :--- |
| **Authentication & IAM** | Open / public demo API with server-side validation; HTTPS; AWS IAM least-privilege for Lambda & S3. | Amazon Cognito, user login pools, JWT authorizers, enterprise RBAC, multi-tenant organization tenancy. |
| **Primary Persistence** | **Amazon S3 exclusively** (JSON objects partitioned by entity and timestamp). | Amazon DynamoDB, Amazon Aurora, RDS, DocumentDB, MongoDB, Redis. |
| **IoT Connectivity** | Standard HTTP/REST over API Gateway; software-simulated devices making HTTPS requests. | AWS IoT Core, MQTT brokers, CoAP, WebSockets, X.509 device certificates, hardware secure elements. |
| **Hardware** | 100% software simulation running locally (Node.js/TypeScript process). | Physical microcontrollers (ESP32, Raspberry Pi, Arduino), CAN bus, Modbus, physical sensors. |
| **Device Provisioning** | Simple REST API registration (`POST /devices`) storing metadata to S3. | AWS IoT Fleet Provisioning, claim certificates, bootstrap registration, zero-touch provisioning. |
| **Firmware Management**| Simulated state toggles via command payload (`RESTART`, `SET_MODE`). | Over-The-Air (OTA) firmware binary distribution, S3 presigned binary streaming, rollbacks. |
| **Messaging / Queues** | Direct API Gateway -> Lambda invocation -> S3 persistence. | Amazon SQS, Amazon SNS, Amazon Kinesis, Apache Kafka, EventBridge event pipes. |
| **Compute & Containers**| AWS Lambda (Serverless functions). | Kubernetes (EKS), Docker containers on ECS/Fargate, EC2 virtual machines. |
| **Alert Notifications** | In-app dashboard alert feed and persisted S3 alert status (`ACTIVE`/`RESOLVED`). | Email notifications (SES), SMS alerts (SNS), push notifications, PagerDuty/Slack webhooks. |
| **Client Interface** | Desktop-optimized responsive web dashboard (React / Vite + TypeScript). | Mobile apps (iOS/Android, React Native, Flutter), complex GIS satellite mapping layers. |

---

## 5. System Architecture & Component Design

### 5.1 End-to-End Conceptual Flow
```
+-----------------------------------------------------------------------------------+
|                            OPERATOR / FLEET DASHBOARD                             |
|                           (React + TypeScript on S3/Web)                          |
+-----------------------------------------------------------------------------------+
       |                                      ^                         |
       | 1. Register Device                   | 5. Poll/Fetch Status    | 7. Send Command
       |    (POST /devices)                   |    & Alerts             |    (POST /commands)
       v                                      |                         v
+-----------------------------------------------------------------------------------+
|                             AMAZON API GATEWAY (HTTP)                             |
|                        CORS Enabled - Structured Routing                          |
+-----------------------------------------------------------------------------------+
       |                                      ^                         |
       | Route Request                        | Return Live Fleet State | Route Command
       v                                      |                         v
+-----------------------------------------------------------------------------------+
|                                 AWS LAMBDA BACKEND                                |
|   [Device Handler]       [Telemetry Handler]        [Command Handler]     [Alerts]|
+-----------------------------------------------------------------------------------+
       |          |                   |                     |              |
       | Write    | Read              | Ingest & Validate   | Queue / Ack  | Evaluate
       v          v                   v                     v              v
+-----------------------------------------------------------------------------------+
|                                  AMAZON S3 BUCKET                                 |
|                       Primary Structured Object Storage                           |
|  devices/{id}/state.json                                                          |
|  devices/{id}/telemetry/{timestamp}_{id}.json                                     |
|  devices/{id}/commands/{commandId}.json                                           |
|  devices/{id}/alerts/{alertId}.json                                               |
+-----------------------------------------------------------------------------------+
       ^                                                            |
       | 3. Post Telemetry (POST /telemetry)                        | 8. Fetch Pending Cmds
       |                                                            v
+-----------------------------------------------------------------------------------+
|                             SOFTWARE DEVICE SIMULATOR                             |
|                      (Standalone Local Node.js Process)                           |
|                                                                                   |
|  - Manages CF-DEVICE-001 ... CF-DEVICE-00N                                        |
|  - Generates realistic fluctuating metrics (Temp, Humidity, Battery)              |
|  - Executes commands (START, STOP, RESTART, SET_MODE)                             |
|  - Emits Acknowledgment back to API Gateway (POST /commands/{id}/ack)             |
+-----------------------------------------------------------------------------------+
```

### 5.2 Component Breakdown
1. **Web Application (Frontend)**:
   - High-performance Single Page Application built with React and TypeScript.
   - Provides Fleet Overview, Device Inventory, Device Details, Telemetry History, and an interactive Command Console.
   - Communicates strictly with API Gateway via HTTPS.
2. **API Gateway**:
   - Single regional HTTP API Gateway endpoint providing RESTful endpoints.
   - Enforces payload limits, handles CORS pre-flight, and proxies requests to Lambda functions.
3. **AWS Lambda Backend**:
   - Modular TypeScript handlers responsible for:
     - Device lifecycle (registration, fetching details, listing fleet).
     - Telemetry ingestion, schema validation, and threshold evaluation.
     - Command lifecycle management (creation, delivery, acknowledgement).
     - Alert lifecycle management (generation, retrieval, resolution).
4. **Amazon S3 Persistence Store**:
   - Acts as the primary database for the system.
   - Dedicated bucket with encrypted, strictly organized object hierarchies.
5. **Amazon CloudWatch**:
   - Centralized observability engine.
   - Captures all Lambda execution logs, validation errors, state transitions, and performance metrics.
6. **Software Device Simulator**:
   - Autonomous, configurable process running on a workstation or test container.
   - Simulates physical environmental behavior with natural noise and variance.
   - Supports failure simulation (overheating, battery drain, network cutoff).
7. **Terraform**:
   - Complete declarative Infrastructure as Code (IaC) defining S3, Lambda, API Gateway, CloudWatch Log Groups, and IAM roles.
8. **GitHub Actions**:
   - Automated CI pipeline to test, build, and package the backend, frontend, and simulator code.

---

## 6. S3 Storage Architecture & Persistence Strategy

### 6.1 Architectural Rationale & Transparent Evaluation
The decision to utilize **Amazon S3** as the exclusive persistence layer for the CloudFleet MVP keeps the infrastructure footprint minimal, cost-free at low volumes, and completely serverless without managing database tables.

However, **S3 is an object store, not a relational or key-value database**. The design acknowledges and addresses the inherent constraints:
- **No Native Secondary Indexing**: Filtering or aggregate queries (e.g. "find all devices with status WARNING") cannot be done via SQL/GSI. 
- **Object Overwrite Semantics**: While Amazon S3 provides strong read-after-write consistency, it does not support transactional multi-object ACID updates.
- **Listing Latency**: Calling `ListObjectsV2` across tens of thousands of keys is slow.

### 6.2 S3 Key Hierarchy & Object Partitioning
The S3 bucket layout is structured to optimize direct key lookups:

```text
s3://cloudfleet-storage-{environment}-{accountId}/
├── config/
│   └── fleet_rules.json                         # Global thresholds (temp limits, timeout seconds)
├── devices/
│   ├── CF-DEVICE-001/
│   │   ├── state.json                           # Current materialized state & metadata
│   │   ├── telemetry/
│   │   │   ├── 2026-11-15T09-00-00Z_t1.json     # Historical time-series record
│   │   │   └── 2026-11-15T09-00-10Z_t2.json
│   │   ├── commands/
│   │   │   ├── cmd-1001.json                    # Command record & status
│   │   │   └── cmd-1002.json
│   │   └── alerts/
│   │       ├── alt-5001.json                    # Alert record
│   │       └── alt-5002.json
│   ├── CF-DEVICE-002/
│   │   ├── state.json
│   │   └── ...
│   └── registry.json                            # Master index of registered device IDs
```

### 6.3 Technical Limitations & Mitigation Strategies
1. **Device Fleet Listing**:
   - *Problem*: Enumerating hundreds of device folders using prefix delimiters can require multiple API calls.
   - *Mitigation*: Maintain a lightweight `devices/registry.json` index object updated atomically on device registration. For reads, the backend retrieves `registry.json` and loads individual `state.json` objects concurrently via `Promise.all` (bounded concurrency).
2. **Telemetry History Lookups**:
   - *Problem*: Retrieving the last 20 telemetry points.
   - *Mitigation*: Telemetry keys use ISO-8601 lexicographical timestamps in the key prefix (`devices/{deviceId}/telemetry/{ISO_TIMESTAMP}_{UUID}.json`). Listing objects with `Prefix="devices/{deviceId}/telemetry/"` and taking the most recent keys provides chronological history.
3. **Optimistic Locking / Concurrency**:
   - *Problem*: Simultaneous telemetry ingestion and command updates.
   - *Mitigation*: State updates are written to distinct keys or use ETag-based conditional updates if race conditions occur.

---

## 7. Domain Models & Data Schemas

### 7.1 Device Identity & Metadata Model
Stored at `devices/{deviceId}/state.json`:
```json
{
  "deviceId": "CF-DEVICE-001",
  "name": "Temperature Sensor 001",
  "deviceType": "ENVIRONMENTAL_MONITOR",
  "location": "Warehouse-Bay-4",
  "status": "ONLINE",
  "operationalMode": "NORMAL",
  "createdAt": "2026-11-15T08:30:00.000Z",
  "updatedAt": "2026-11-15T09:15:30.000Z",
  "lastSeen": "2026-11-15T09:15:30.000Z",
  "latestTelemetry": {
    "temperature": 26.8,
    "humidity": 58.2,
    "battery": 92.0,
    "timestamp": "2026-11-15T09:15:30.000Z"
  },
  "activeAlertCount": 0
}
```

### 7.2 Telemetry Model
Submitted by simulator and stored at `devices/{deviceId}/telemetry/{timestamp}_{telemetryId}.json`:
```json
{
  "telemetryId": "tel_8f3a9e12-32b4-4c1b-9f90-1c0029b3112a",
  "deviceId": "CF-DEVICE-001",
  "timestamp": "2026-11-15T09:15:30.000Z",
  "metrics": {
    "temperature": 28.4,
    "humidity": 62.0,
    "battery": 87.5
  },
  "simulatorMetadata": {
    "firmwareVersion": "1.0.0-sim",
    "uptimeSeconds": 3600,
    "cpuUsagePercent": 4.2
  }
}
```

### 7.3 Device State Machine & Operational Status
The system recognizes three fundamental device statuses:
- **`ONLINE`**: Telemetry or heartbeat received within the heartbeat timeout window ($\le 60\text{ seconds}$). Sensor values are within normal operating thresholds.
- **`WARNING`**: Device is communicating within timeout, but one or more telemetry metrics violate defined safety thresholds (e.g., temperature $> 35^\circ\text{C}$ or battery $< 20\%$).
- **`OFFLINE`**: No telemetry or heartbeat received for $> 60\text{ seconds}$, or the device simulator explicitly emitted a graceful shutdown message.

```
       +---------------------------------------------------------+
       |                                                         |
       v                                                         |
+--------------+   Heartbeat timeout (>60s) / Stop   +---------------+
|    ONLINE    | ----------------------------------> |    OFFLINE    |
+--------------+                                     +---------------+
  |          ^                                         ^           |
  | Exceed   | Return to                               |           | Telemetry
  | Limit    | Normal Limits                           | Timeout   | Resumed
  v          |                                         |           v
+--------------+                                       |     +-----------+
|   WARNING    | --------------------------------------+     | (Recovers |
| (High Temp / |                                             |  to State)|
| Low Battery) |                                             +-----------+
+--------------+
```

### 7.4 Command Model
Stored at `devices/{deviceId}/commands/{commandId}.json`:
```json
{
  "commandId": "cmd_a4b9c8d7-e6f5-4a3b-2c1d-0e9f8a7b6c5d",
  "deviceId": "CF-DEVICE-001",
  "type": "RESTART",
  "parameters": {
    "graceful": true,
    "restartDelaySeconds": 2
  },
  "status": "ACKNOWLEDGED",
  "createdAt": "2026-11-15T09:20:00.000Z",
  "dispatchedAt": "2026-11-15T09:20:05.000Z",
  "acknowledgedAt": "2026-11-15T09:20:08.000Z",
  "executionResult": {
    "success": true,
    "message": "Device restarted successfully in 1.84s"
  }
}
```
**Supported Command Types**:
- `START`: Instructs an idle/stopped simulated device to resume telemetry transmission.
- `STOP`: Instructs a simulated device to suspend telemetry transmission and enter an idle state.
- `RESTART`: Simulator pauses transmission, resets internal runtime counters, simulates reboot delay, and resumes streaming.
- `SET_MODE`: Toggles operational profile (e.g., `NORMAL`, `ECO` with lower frequency, `DIAGNOSTIC` with higher frequency).

**Command Lifecycle States**:
`PENDING` $\rightarrow$ `DISPATCHED` $\rightarrow$ `EXECUTED` $\rightarrow$ `ACKNOWLEDGED` (or `FAILED`).

### 7.5 Alert Model
Stored at `devices/{deviceId}/alerts/{alertId}.json`:
```json
{
  "alertId": "alt_1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
  "deviceId": "CF-DEVICE-001",
  "type": "HIGH_TEMPERATURE",
  "severity": "WARNING",
  "status": "ACTIVE",
  "message": "Temperature exceeded safe threshold: 37.8°C (Threshold: 35.0°C)",
  "metricValue": 37.8,
  "thresholdValue": 35.0,
  "triggeredAt": "2026-11-15T09:22:10.000Z",
  "resolvedAt": null
}
```
**Supported Alert Types**:
- `HIGH_TEMPERATURE`: Triggered when sensor temperature $> 35.0^\circ\text{C}$. Severity: `WARNING` (or `CRITICAL` if $> 45^\circ\text{C}$).
- `LOW_BATTERY`: Triggered when battery level $< 20.0\%$. Severity: `WARNING` (or `CRITICAL` if $< 5\%$).
- `DEVICE_OFFLINE`: Triggered when no message has been received within the configured timeout window ($60\text{s}$). Severity: `CRITICAL`.

---

## 8. API Specification & Interface Contracts

All API requests accept and return `application/json`. Timestamps use strict ISO-8601 format (`YYYY-MM-DDTHH:mm:ss.sssZ`).

### 8.1 Device Management Endpoints
- **`POST /devices`**: Register a new simulated device.
  - *Request Body*: `{"deviceId": "CF-DEVICE-001", "name": "Warehouse Sensor", "deviceType": "ENVIRONMENTAL_MONITOR", "location": "Bay-4"}`
  - *Response (201)*: Returns created device state object.
  - *Errors*: `400 Bad Request` (invalid ID or schema), `409 Conflict` (device already registered).
- **`GET /devices`**: List all devices in the fleet with aggregated state.
  - *Response (200)*: `{"devices": [ ... ], "total": 5, "online": 4, "offline": 1, "warning": 0}`
- **`GET /devices/{id}`**: Get specific device details, status, and latest telemetry.
  - *Response (200)*: Full device state object.
  - *Errors*: `404 Not Found`.

### 8.2 Telemetry Endpoints
- **`POST /devices/{id}/telemetry`**: Ingest incoming telemetry from simulator.
  - *Request Body*: `{"metrics": {"temperature": 28.4, "humidity": 62.0, "battery": 87.5}, "timestamp": "2026-11-15T09:15:30.000Z"}`
  - *Processing*:
    1. Validate payload schema and numeric sanity ranges.
    2. Read current rules from S3.
    3. Evaluate thresholds (`HIGH_TEMPERATURE`, `LOW_BATTERY`).
    4. Persist historical telemetry record to `devices/{id}/telemetry/{timestamp}_{id}.json`.
    5. Update `devices/{id}/state.json` with latest metrics and timestamp.
    6. If threshold exceeded, generate or update alert record.
  - *Response (202 Accepted)*: `{"status": "INGESTED", "telemetryId": "tel_...", "currentDeviceStatus": "ONLINE"}`
- **`GET /devices/{id}/telemetry`**: Fetch recent telemetry history for visualization.
  - *Query Params*: `?limit=50`
  - *Response (200)*: `{"deviceId": "CF-DEVICE-001", "history": [ ... ]}`

### 8.3 Command & Control Endpoints
- **`POST /devices/{id}/commands`**: Dispatch an administrative command.
  - *Request Body*: `{"type": "RESTART", "parameters": { ... }}`
  - *Response (201)*: Returns command record with status `PENDING`.
- **`GET /devices/{id}/commands`**: List recent command history for device.
  - *Response (200)*: `{"commands": [ ... ]}`
- **`GET /devices/{id}/commands/pending`**: Polled by the simulator to retrieve queued commands.
  - *Response (200)*: `{"commands": [ ... ]}`
- **`POST /devices/{id}/commands/{commandId}/ack`**: Emitted by simulator upon execution.
  - *Request Body*: `{"status": "ACKNOWLEDGED", "executionResult": {"success": true, "message": "Reboot complete"}}`
  - *Response (200)*: Updated command record.

### 8.4 Alert Management Endpoints
- **`GET /alerts`**: List all alerts across the fleet with filter support.
  - *Query Params*: `?status=ACTIVE`
  - *Response (200)*: `{"alerts": [ ... ], "activeCount": 2}`
- **`POST /alerts/{id}/resolve`**: Manually resolve or acknowledge an active alert.
  - *Response (200)*: Updated alert object with `status: "RESOLVED"`.

### 8.5 Error Response Schema
All error responses adhere to a consistent JSON structure:
```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Temperature must be a valid number between -50.0 and 100.0",
    "details": {
      "field": "metrics.temperature",
      "rejectedValue": "NaN"
    },
    "timestamp": "2026-11-15T09:25:00.000Z"
  }
}
```

---

## 9. Software Device Simulator Architecture

### 9.1 Simulator Philosophy
The simulator is an authentic, standalone Node.js/TypeScript application designed to mimic physical IoT hardware in user space. It interacts with the CloudFleet backend purely via HTTP API Gateway endpoints.

### 9.2 Key Simulator Capabilities
1. **Configurable Fleet Size**:
   - Spawns $N$ concurrent virtual devices (`CF-DEVICE-001` through `CF-DEVICE-00N`) from a configuration file or CLI flag (`--devices 5`).
2. **Realistic Metric Drift**:
   - Implements Gaussian random walks and environmental cycles (e.g. daily ambient temp drift) rather than static constants.
   - Temperature drifts smoothly with occasional anomalies.
   - Battery drains proportionally to simulated activity and transmits low battery states over time.
3. **Deterministic Testing Modes**:
   - Supports CLI flags to force specific error behaviors:
     - `--trigger-overheat <deviceId>`: Forces simulated sensor above $36.0^\circ\text{C}$ to trigger `HIGH_TEMPERATURE`.
     - `--trigger-low-battery <deviceId>`: Forces battery below $15\%$ to trigger `LOW_BATTERY`.
     - `--disconnect <deviceId>`: Immediately stops transmissions for a device to test the `OFFLINE` detection engine.
4. **Command Polling & Execution Loop**:
   - Each active simulated device checks `GET /devices/{id}/commands/pending` at a configurable cadence (e.g. every 5 seconds).
   - Upon retrieving a command, the device simulates execution latency (e.g. 2-second restart delay) and posts acknowledgement to `/ack`.

---

## 10. Fleet Dashboard & Frontend User Experience

### 10.1 UI Principles
- **Clarity & Utility**: Clean, professional design optimized for operations and fleet monitoring.
- **Zero Fake Data**: The dashboard renders exclusively data fetched from the API Gateway and persisted in S3.
- **No Heavyweight Bloat**: Avoid unnecessary 3D graphics, heavy animation libraries, or non-functional decorative widgets.

### 10.2 Core Dashboard Views
1. **Fleet Overview (Executive KPI Bar)**:
   - Total Devices, Online Devices, Offline Devices, Warning Devices.
   - Active Alert Summary banner.
   - Global quick-filter buttons (click "Warning" to filter the device list below).
2. **Device Inventory Table**:
   - Columns: Device ID, Friendly Name, Type, Status (`ONLINE`/`OFFLINE`/`WARNING` badges), Last Seen (relative time), Battery Bar, Latest Temperature, Latest Humidity.
   - Search bar and status filter dropdown.
   - Row click navigates to Device Detail View.
3. **Device Detail View**:
   - Identity & Location metadata card.
   - Real-time status indicator with heartbeat freshness timer.
   - Metric cards: Current Temperature, Current Humidity, Current Battery.
   - Time-series Telemetry Chart (using lightweight SVG or Chart.js/Recharts): Historical trends over the last 50 points.
   - Active Alerts for this device with resolution triggers.
   - Command Console: Dropdown to select command (`START`, `STOP`, `RESTART`, `SET_MODE`), optional parameter input, and a "Send Command" trigger.
   - Command History Table: Displays command ID, type, status badge (`PENDING`, `ACKNOWLEDGED`), execution timestamp, and result message.

---

## 11. Security & Operational Best Practices

Although end-user authentication (Amazon Cognito) is intentionally excluded from the MVP scope, enterprise-grade cloud security best practices are strictly enforced:

1. **Strict Server-Side Validation**:
   - All incoming API payloads are parsed against rigid schemas.
   - Device IDs are restricted to alphanumeric identifiers matching `^[A-Z0-9_-]{3,32}$`.
   - Numeric inputs (temperature, humidity, battery) are validated for plausible operational ranges.
2. **Least Privilege IAM Policies**:
   - Lambda execution roles are granted narrow permissions:
     - `s3:GetObject`, `s3:PutObject`, `s3:ListBucket` scoped specifically to `arn:aws:s3:::cloudfleet-storage-*/*`.
     - `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents` for CloudWatch.
   - No broad `s3:*` or administrative permissions are assigned.
3. **S3 Bucket Hardening**:
   - **Block Public Access**: All 4 public access block settings (`BlockPublicAcls`, `IgnorePublicAcls`, `BlockPublicPolicy`, `RestrictPublicBuckets`) are enabled (`true`).
   - **Encryption at Rest**: Enforce Server-Side Encryption with Amazon S3 managed keys (`AES256`).
   - **Enforce TLS**: Bucket policy rejects any non-HTTPS requests (`aws:SecureTransport = false`).
4. **Zero Frontend Secrets**:
   - The frontend application never receives or stores AWS IAM access keys or secret tokens. All interactions occur exclusively via API Gateway HTTPS endpoints.

---

## 12. Observability & Operational Diagnostics

### 12.1 Structured Logging Standards
All Lambda functions log to Amazon CloudWatch using structured JSON format. Unstructured `console.log` statements are prohibited.

Standard Log Format:
```json
{
  "timestamp": "2026-11-15T09:15:30.102Z",
  "level": "INFO",
  "requestId": "c6b41d3b-1821-4e2a-8800-449e7b447a19",
  "eventType": "TELEMETRY_INGESTED",
  "deviceId": "CF-DEVICE-001",
  "details": {
    "temperature": 28.4,
    "battery": 87.5,
    "statusAssigned": "ONLINE",
    "alertTriggered": false
  }
}
```

### 12.2 Critical Logged Event Types
- `DEVICE_REGISTERED`: When a new device identity is stored.
- `TELEMETRY_INGESTED`: When a valid telemetry payload is saved.
- `TELEMETRY_VALIDATION_ERROR`: When payload schema or bounds checks fail.
- `ALERT_GENERATED`: When a metric breaches safe thresholds.
- `COMMAND_DISPATCHED`: When an operator initiates a command.
- `COMMAND_ACKNOWLEDGED`: When a simulator responds with execution results.
- `DEVICE_TIMEOUT_DETECTED`: When a device transitions to `OFFLINE`.

---

## 13. Infrastructure as Code (Terraform)

### 13.1 Provisioning Strategy
Terraform is the exclusive IaC tool. It provisions only the resources strictly required for the MVP:
- `aws_s3_bucket`, `aws_s3_bucket_public_access_block`, `aws_s3_bucket_server_side_encryption_configuration`.
- `aws_apigatewayv2_api` (HTTP API), `aws_apigatewayv2_stage` (`$default` auto-deploy), `aws_apigatewayv2_route`, `aws_apigatewayv2_integration`.
- `aws_lambda_function`, `aws_iam_role`, `aws_iam_role_policy`.
- `aws_cloudwatch_log_group`.

### 13.2 Environment Independence & Zero Hardcoding
All infrastructure configuration is parameterized via `variables.tf`:
- `aws_region`: Target deployment region (e.g. `ap-south-1` or `us-east-1`).
- `environment`: Deployment tier (`dev`, `staging`, `prod`).
- `project_name`: `cloudfleet`.

---

## 14. Step-by-Step Demonstration Workflow

The MVP is engineered to prove out the following comprehensive demonstration script:

```
[ Step 1: Open CloudFleet Dashboard ]
   │  Operator launches React web application; verifies empty/clean fleet summary.
   ▼
[ Step 2: Register Simulated Device ]
   │  Operator clicks "Register Device"; submits ID: "CF-DEVICE-001", Name: "Bay Sensor 1".
   │  Backend persists state.json; device appears in dashboard with initial status "OFFLINE" (Never Seen).
   ▼
[ Step 3: Launch Device Simulator ]
   │  Operator starts simulator CLI: `npm run simulate -- --device CF-DEVICE-001`.
   │  Simulator begins sending telemetry packets every 5 seconds.
   ▼
[ Step 4: Device State Transitions to ONLINE ]
   │  Backend updates lastSeen timestamp; status transitions to "ONLINE".
   │  Dashboard reflects status badge change from OFFLINE to ONLINE in real time.
   ▼
[ Step 5: Live Telemetry Streaming ]
   │  Operator navigates to Device Detail View.
   │  Observes fluctuating live temperature (24°C - 28°C), humidity, and battery decay.
   ▼
[ Step 6: Simulate Thermal Hazard (Warning Generation) ]
   │  Operator triggers overheating on simulator: `npm run simulate:overheat -- --device CF-DEVICE-001`.
   │  Simulator transmits temperature: 38.5°C (> 35°C threshold).
   │  Backend flags WARNING state and creates HIGH_TEMPERATURE alert in S3.
   │  Dashboard displays yellow WARNING badge and shows active alert banner.
   ▼
[ Step 7: Send RESTART Command from Dashboard ]
   │  Operator selects "RESTART" from Command Console and clicks "Send Command".
   │  Backend stores command as PENDING.
   ▼
[ Step 8: Simulator Executes Command & Acknowledges ]
   │  Simulator polls pending command, logs "Received RESTART command; rebooting device...",
   │  pauses telemetry for 2 seconds, and emits ACKNOWLEDGED with success message.
   │  Dashboard command console updates to show ACKNOWLEDGED status with execution time.
   ▼
[ Step 9: Simulate Device Teardown (Offline State Detection) ]
   │  Operator terminates simulator process (`Ctrl+C`).
   │  No telemetry received for > 60 seconds.
   │  Device transitions to OFFLINE; DEVICE_OFFLINE alert is generated.
   │  Dashboard displays red OFFLINE badge.
```

---

## 15. Architectural Summary & Verification Checklist

- [x] **Project Identity**: CloudFleet — Serverless IoT Fleet Management System.
- [x] **Architecture Style**: Fully Serverless (API Gateway + AWS Lambda + Amazon S3 + CloudWatch).
- [x] **Device Modeling**: 100% Software-simulated IoT devices via autonomous Node.js runner.
- [x] **Persistence Rule**: Amazon S3 is the exclusive storage engine (No DynamoDB, No RDS).
- [x] **Explicit Exclusions Maintained**: No Cognito, No IoT Core, No MQTT, No physical hardware, No Kubernetes, No SQS/SNS.
- [x] **Security**: Input validation, IAM least privilege, private encrypted S3 buckets.
- [x] **Demonstrability**: Fully actionable, end-to-end 18-step test scenario.

