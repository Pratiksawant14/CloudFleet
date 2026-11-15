# CloudFleet — Serverless IoT Fleet Management System

[![CI/CD](https://github.com/cloudfleet/cloudfleet/actions/workflows/ci.yml/badge.svg)](https://github.com/cloudfleet/cloudfleet/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![Terraform](https://img.shields.io/badge/terraform-%3E%3D1.5.0-blueviolet.svg)](https://www.terraform.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**CloudFleet** is a cloud-native, serverless IoT Fleet Management System built as a fully functional software MVP. It demonstrates the complete end-to-end operational lifecycle of an industrial IoT fleet platform without requiring physical hardware devices or heavyweight IoT brokers.

---

## Architecture Overview

```
                                +-----------------------------+
                                |   Fleet Operations Center   |
                                |   (React / TypeScript SPA)  |
                                +-----------------------------+
                                       |              ^
                 1. Register / Command |              | 5. Poll Fleet Status
                                       v              |
                                +-----------------------------+
                                |  Amazon API Gateway (HTTP)  |
                                +-----------------------------+
                                       |              ^
                                       v              |
                                +-----------------------------+
                                |      AWS Lambda Backend     |
                                |  (Validation & Logic Engine)|
                                +-----------------------------+
                                       |              ^
                        2. Persist JSON|              | Read State
                                       v              |
                                +-----------------------------+
                                |    Amazon S3 Object Store   |
                                |  devices/{id}/state.json    |
                                |  devices/{id}/telemetry/... |
                                |  devices/{id}/commands/...  |
                                |  devices/{id}/alerts/...    |
                                +-----------------------------+
                                       ^              |
               3. POST Telemetry Stream|              | 4. Poll Pending Commands
                                       |              v
                                +-----------------------------+
                                |  Software Device Simulator  |
                                |  (CF-DEVICE-001 ... 00N)    |
                                +-----------------------------+
```

---

## Key Features

1. **Software-Simulated IoT Devices**:
   - Distinct identities (`CF-DEVICE-001`, `CF-DEVICE-002`, etc.).
   - Realistic Gaussian temperature drift, ambient humidity fluctuations, and battery decay.
   - Command reception (`START`, `STOP`, `RESTART`, `SET_MODE`), internal reboot latency simulation, and execution acknowledgements.
   - Fault injection modes: Overheat spikes (>35°C), low battery (<20%), and network crash simulation.

2. **Serverless Cloud Persistence (Amazon S3)**:
   - S3 is the **exclusive storage engine** for the MVP.
   - Transparent object hierarchy maintaining device state, historical telemetry time-series, command records, and alert states.
   - Built-in zero-config local emulation provider for 100% offline development.

3. **Fleet Monitoring & Control Dashboard**:
   - Executive KPI cards (Total, Online, Warning, Offline, and Active Alerts).
   - Filterable & searchable fleet inventory table with real-time heartbeat freshness.
   - Device detail inspection with SVG time-series telemetry charts.
   - Interactive Administrative Command Console with real-time feedback.
   - Security and threshold alerts feed with manual resolution controls.

4. **Infrastructure as Code (Terraform)**:
   - Declarative definitions for API Gateway (HTTP API), Lambda, private encrypted S3 buckets, and least-privilege IAM roles.

---

## Project Structure

```text
CloudFeet/
├── backend/                  # Serverless AWS Lambda Handlers & S3 Service Layer
│   ├── src/
│   │   ├── handlers/         # Lambda API Gateway entry points
│   │   ├── services/         # S3 storage, device, telemetry, command, and alert logic
│   │   ├── types/            # Shared TypeScript data contracts
│   │   └── utils/            # Structured CloudWatch JSON logger
│   └── src/localServer.ts    # Local Express development runner (port 4000)
├── frontend/                 # React + TypeScript + Vite Dashboard
│   ├── src/
│   │   ├── components/       # Header, FleetOverview, DeviceTable, DeviceDetail, AlertsList
│   │   └── services/         # Backend API client
│   └── index.html
├── simulator/                # Autonomous Multi-Device Software IoT Runner
│   ├── src/
│   │   ├── device.ts         # Single simulated IoT device state machine
│   │   ├── runner.ts         # Multi-device CLI runner with fault injection flags
│   │   └── demo.ts           # Automated end-to-end 18-step verification test
├── terraform/                # Infrastructure as Code
│   ├── main.tf               # Providers & versions
│   ├── s3.tf                 # Encrypted S3 bucket & access controls
│   ├── lambda.tf             # Lambda functions & environment variables
│   ├── apigateway.tf         # HTTP API Gateway with CORS
│   └── iam.tf                # Least-privilege IAM roles
├── CLOUDFLEET_PROJECT_KNOWLEDGE.md # Authoritative Project Source of Truth
└── package.json              # Monorepo workspaces definition
```

---

## Quickstart: Local Development & Demonstration

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Backend API (Terminal 1)
```bash
npm run dev:backend
```
*Listens on `http://localhost:4000` with local S3 storage emulation stored in `.local-s3/`.*

### 3. Start the Frontend Dashboard (Terminal 2)
```bash
npm run dev:frontend
```
*Open `http://localhost:3000` in your browser to view the live dashboard.*

### 4. Run the Automated 18-Step End-to-End Demo (Terminal 3)
```bash
npm run simulate:demo
```
This automated script runs the complete demonstration scenario:
- Connects to backend API
- Registers `CF-DEVICE-001`
- Starts simulator and streams telemetry -> Device transitions to `ONLINE`
- Injects thermal hazard (38.5°C) -> Status transitions to `WARNING`, generates `HIGH_TEMPERATURE` alert
- Dispatches administrative `RESTART` command
- Simulator receives, reboots, and emits `ACKNOWLEDGED`
- Resumes normal operational parameters
- Gracefully stops simulator -> Confirms clean teardown

---

## Manual Simulator CLI Commands

Launch concurrent simulated IoT devices manually:

```bash
# Start 3 simulated devices (CF-DEVICE-001 to CF-DEVICE-003)
npm run dev:simulator

# Start specific device with thermal overheat fault (> 35°C)
npm run dev:simulator -- --device CF-DEVICE-001 --overheat CF-DEVICE-001

# Start specific device with low battery condition (< 20%)
npm run dev:simulator -- --device CF-DEVICE-001 --low-battery CF-DEVICE-001

# Simulate abrupt network disconnection / hardware crash
npm run dev:simulator -- --device CF-DEVICE-001 --disconnect CF-DEVICE-001
```

---

## Deploying to AWS with Terraform

To deploy the infrastructure and backend to AWS:

```bash
# 1. Build backend Lambda distribution
cd backend
npm run build
cd ..

# 2. Provision AWS Infrastructure
cd terraform
terraform init
terraform plan
terraform apply
```

Terraform outputs the deployed `api_endpoint` and `s3_bucket_name`.

---

## Authoritative Documentation
For full architectural details, S3 partitioning specifications, and scope boundaries, refer to [CLOUDFLEET_PROJECT_KNOWLEDGE.md](file:///d:/Sem-5/CloudFeet/CLOUDFLEET_PROJECT_KNOWLEDGE.md).

