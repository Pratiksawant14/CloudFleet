# CloudFleet — Serverless Edge Kiosk & Digital Signage Fleet Management System
## Authoritative Project Knowledge & Technical Architecture Specification

---

## 1. Document Overview & Governance

### 1.1 Purpose of this Document
This document is the **single authoritative source of truth** for the **CloudFleet** project. It outlines the complete product concept, cloud computing architecture, on-demand serverless integration, edge kiosk behavior, S3 asset distribution pipeline, data models, and demonstration workflows.

### 1.2 Document Governance Policy
1. **Single Source of Truth**: All implementation steps across frontend, backend, simulator, and infrastructure must conform to the specifications in this file.
2. **Scope Guardrails**: The architecture specifically targets **Offline-First Smart Kiosks and Digital Signage Displays** using an on-demand serverless cloud model (API Gateway + AWS Lambda + Amazon S3). High-frequency streaming protocols (MQTT) and continuously active servers (EC2) are intentionally rejected.

---

## 2. Project Purpose & Cloud Computing Case Study

### 2.1 The Real-World Scenario
In modern retail, transportation hubs, and public venues (e.g. shopping malls, metro stations, restaurant kiosks):
- **Digital signage screens and interactive kiosks run 24/7 locally**.
- **They operate offline-first**: Promotional videos, high-resolution banners, menus, and themes are stored **on the device's local disk**.
- **They do NOT stream media continuously from the internet**:
  - Continuous cloud streaming wastes massive cellular/Wi-Fi bandwidth.
  - Video streams stutter or freeze if store Wi-Fi drops.
  - Continuous egress bandwidth from cloud servers creates exorbitant cloud bills.

### 2.2 The Cloud Computing Challenge: On-Demand Serverless Updates
The only time edge kiosks need to communicate with the cloud is when:
1. An administrator publishes a **new media campaign, promotional video, or menu update**.
2. A kiosk checks for available updates and **downloads the new assets into its local storage**.
3. A kiosk sends a periodic health heartbeat or acknowledges a successful update.

### 2.3 The Architectural Decision: Why Lambda + S3 Over EC2 & MQTT
This real-world problem highlights fundamental cloud computing principles:

| Architectural Question | Traditional Approach (Rejected) | CloudFleet Serverless Approach (Selected) | Cloud Computing Principle |
| :--- | :--- | :--- | :--- |
| **Compute Choice** | **Amazon EC2**: Running an EC2 instance 24/7 to wait for occasional updates. | **AWS Lambda**: Event-driven serverless functions invoked only during update check-ins. | **Utility Computing & Zero Idle Cost**: EC2 charges 24/7 even when idle. Lambda scales to zero and costs **$0.00** during local playback. |
| **Communication Protocol** | **MQTT / WebSockets**: Keeping persistent TCP socket connections open continuously. | **HTTPS REST over Amazon API Gateway**: Kiosks connect only when an update check or sync is needed. | **Decoupled Stateless Ingress**: Eliminates managing stateful MQTT brokers; API Gateway handles connection bursts and terminates TLS. |
| **Storage Architecture** | **Database Storage**: Storing large video/image binaries inside a relational database. | **Amazon S3**: Central object store hosting campaign manifests and media asset bundles. | **Object Storage Durability & Throughput**: Databases choke on binary video files. S3 provides 11 9s durability and limitless asset download bandwidth. |

---

## 3. System Architecture & End-to-End Operational Flow

```
+───────────────────────────────────────────────────────────────────────────────────────────+
|                                    1. CLOUD FLEET MANAGER                                 |
|                       Admin Dashboard (Web UI for Brand & Fleet Managers)                 |
+───────────────────────────────────────────────────────────────────────────────────────────+
   │ 1. Admin creates & publishes new Campaign (e.g., "Summer Promo v2.0")
   │    Uploads media assets to S3 and registers update manifest via API Gateway
   ▼
+─────────────────────────────────────+            +────────────────────────────────────────+
|            AMAZON S3                |            |         AMAZON API GATEWAY             |
|   (Central Asset & Media Store)     |            |       (On-Demand Cloud Ingress)        |
|                                     |            +────────────────────────────────────────+
|  campaigns/{id}/manifest.json       |                                │
|  campaigns/{id}/assets/promo.mp4    |                                ▼
|  kiosks/{id}/state.json             |            +────────────────────────────────────────+
|  kiosks/{id}/sync_history.json      |            |              AWS LAMBDA                |
+─────────────────────────────────────+            |     (Serverless Update Controller)     |
   ▲                                               |   - Wakes up on /check-update          |
   │                                               |   - Checks S3 for new manifests        |
   │ 3. Direct Asset Download                      |   - Emits download URLs to kiosk       |
   │    (Pulls heavy video/images                  |   - Shuts down immediately ($0 idle)   |
   │     into local disk cache)                    +────────────────────────────────────────+
   │                                                                   ▲
   └───────────────────────────────────────────────────┐               │ 2. Kiosk checks in:
                                                       │               │    POST /check-update
+───────────────────────────────────────────────────────────────────────────────────────────+
|                                  2. EDGE SMART KIOSKS                                     |
|           Software Edge Display Simulator (Kiosk 001, Kiosk 002 in Shops/Malls)           |
|                                                                                           |
|  - Runs 24/7 LOCALLY offline displaying cached campaign media                             |
|  - Doesn't need continuous internet for playback                                          |
|  - Periodically checks for cloud updates (or triggered on schedule)                       |
|  - Downloads new media from S3 -> saves to local disk -> switches screen to new campaign  |
|  - Acknowledges update completion to Lambda (POST /sync-ack)                              |
+───────────────────────────────────────────────────────────────────────────────────────────+
```

---

## 4. S3 Storage Hierarchy & Key Partitioning

The Amazon S3 bucket strictly organizes campaigns, asset files, and kiosk state:

```text
s3://cloudfleet-storage-{env}-{accountId}/
├── campaigns/
│   ├── CMP-DEFAULT-001/
│   │   ├── manifest.json              # Version, theme, headline, asset list
│   │   └── assets/
│   │       ├── banner.png             # Promotional banner asset
│   │       └── video_loop.mp4         # High-resolution video asset
│   └── CMP-SUMMER-2026/
│       ├── manifest.json
│       └── assets/
│           └── summer_sale.png
├── kiosks/
│   ├── KIOSK-RETAIL-001/
│   │   ├── state.json                 # Current active campaign version & heartbeat
│   │   ├── sync_history.json          # Historical log of applied updates
│   │   └── pending_update.json        # Targeted campaign update (if staged)
│   ├── KIOSK-MALL-002/
│   │   └── state.json
│   └── registry.json                  # Index of all active kiosks in the fleet
└── config/
    └── fleet_settings.json            # Heartbeat thresholds & default policies
```

---

## 5. Domain Models & Data Contracts

### 5.1 Campaign Manifest Schema
Stored at `campaigns/{campaignId}/manifest.json`:
```json
{
  "campaignId": "CMP-SUMMER-2026",
  "name": "Summer Mega Sale Promo",
  "version": "2.0.0",
  "themeColor": "#f59e0b",
  "headline": "Up to 50% Off Everything This Weekend!",
  "description": "Featured seasonal promotion for retail shop displays",
  "mediaType": "VIDEO_AND_BANNER",
  "assets": [
    {
      "assetId": "ast_banner_01",
      "filename": "summer_banner.png",
      "sizeBytes": 2450000,
      "url": "https://s3.amazonaws.com/.../summer_banner.png",
      "checksum": "sha256-a1b2c3d4..."
    }
  ],
  "targetKiosks": ["ALL"],
  "status": "PUBLISHED",
  "publishedAt": "2026-11-16T10:00:00.000Z"
}
```

### 5.2 Kiosk State Schema
Stored at `kiosks/{kioskId}/state.json`:
```json
{
  "kioskId": "KIOSK-RETAIL-001",
  "name": "Downtown Store Entrance Display",
  "kioskType": "RETAIL_KIOSK",
  "location": "Mall of India - Bay 3",
  "status": "ONLINE",
  "activeCampaign": {
    "campaignId": "CMP-DEFAULT-001",
    "name": "Welcome to Store Promo",
    "version": "1.0.0",
    "headline": "Explore Our Latest Arrivals"
  },
  "localCache": {
    "totalAssetsCached": 3,
    "diskUsageMb": 142.5
  },
  "lastHeartbeat": "2026-11-16T10:15:00.000Z",
  "systemMetrics": {
    "cpuUsage": 12.4,
    "temperature": 32.1,
    "storageFreeMb": 48200
  }
}
```

---

## 6. Demonstration Scenario (The Complete Kiosk Update Flow)

1. **Local Playback**: Kiosks run locally in shops displaying `Campaign v1.0 - Welcome Promo` from their local cache. Zero cloud requests are made during playback.
2. **Admin Publishes Update**: Admin logs into CloudFleet Dashboard, uploads a new campaign `CMP-SUMMER-2026` (v2.0.0) with new promotional banners and headline, and clicks **"Publish Campaign"**.
3. **On-Demand Check-in**: Kiosk contacts the cloud API (`POST /kiosks/{id}/check-update`).
4. **Lambda Wakes Up**: AWS Lambda spins up, compares the kiosk's current version (`1.0.0`) with the published version (`2.0.0`), and returns the update manifest with S3 download URLs.
5. **Asset Download**: The kiosk downloads the new assets directly from S3 into its local disk cache folder (`.kiosk-cache/{id}/`).
6. **Screen Transition**: The kiosk updates its local display screen to show the new Summer Promo v2.0 campaign.
7. **Acknowledgement**: The kiosk posts an acknowledgement (`POST /sync-ack`) to the cloud.
8. **Serverless Shutdown**: Lambda shuts down. Total cloud cost returns to **$0.00**.
