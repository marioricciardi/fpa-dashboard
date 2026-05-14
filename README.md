# FPA Dashboard

Financial Planning & Analysis dashboard built with React + Vite, backed by an OCI-hosted FastAPI broker and Oracle Autonomous Data Warehouse.

## Prerequisites

- Node.js ≥ 18
- SSH private key at `scratch/ssh-key-2026-04-03.key`

## Development

```bash
npm install
npm run dev
```

The Vite dev server proxies `/api` requests to the fpa-broker at `http://localhost:8000`.  
Set `VITE_USE_MOCK=true` in `.env` to use seed data without a live broker.

## Production Build

```bash
npm run build
```

Output goes to `dist/`.

## Deploy to OCI (fpa-nginx)

### Instance Details

| Field            | Value                                                                                          |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| **Name**         | fpa-nginx                                                                                      |
| **Public IP**    | 64.181.219.199                                                                                 |
| **Username**     | opc                                                                                            |
| **Region**       | us-chicago-1                                                                                   |
| **AD / FD**      | AD-1 / FD-2                                                                                    |
| **Compartment**  | fpa-platform-dev                                                                               |
| **OCID**         | `ocid1.instance.oc1.us-chicago-1.anxxeljsw2ffkvqc4x2mbv6licluk6pvbjoakuhjzzbrfh4ogysikwax57ba` |
| **Shape**        | VM.Standard.E5.Flex (1 OCPU)                                                                  |
| **Image**        | Oracle-Linux-9.7-2026.02.28-0                                                                 |
| **VCN**          | fpa-vcn                                                                                       |
| **Launched**     | Apr 03, 2026                                                                                   |

### One-Command Deploy

Build and upload :



### Manual Deploy

```bash
# 1. Build
npm run build

# 2. Clear remote nginx root:
ssh -i .\scratch\ssh-key-2026-04-03.key opc@64.181.219.199 "sudo rm -rf /var/www/fpa-dashboard/*"

#3. Upload dist/ to a temp dir:
scp -i .\scratch\ssh-key-2026-04-03.key -r dist/* opc@64.181.219.199:/tmp/fpa-dist/

#copy to the correct directory
ssh -i .\scratch\ssh-key-2026-04-03.key opc@64.181.219.199 "sudo cp -r /tmp/fpa-dist/* /var/www/fpa-dashboard/ && rm -rf /tmp/fpa-dist"

# 3. Restart nginx
ssh -i scratch/ssh-key-2026-04-03.key opc@64.181.219.199 "sudo systemctl restart nginx"
```

Dashboard will be available at **http://64.181.219.199**.

## Architecture

```
React Dashboard (Vite)
      │  POST /api/tool/{toolName}
      ▼
fpa-broker (FastAPI, us-chicago-1)
      │
      ├── OCI Generative AI  (openai.gpt-4.1)
      │
      └── OCI Functions (fn-ap-forecast, fn-pnl-analysis, …)
                │
                └── Oracle ADW  ADWPRD3  (LAB / data_mining schema)
```

## Environment Variables

Copy `.env.example` to `.env` and adjust as needed:

| Variable              | Purpose                                      | Default                            |
| --------------------- | -------------------------------------------- | ---------------------------------- |
| `VITE_USE_MOCK`       | Use seed data instead of live broker         | `true`                             |
| `VITE_BROKER_URL`     | Broker endpoint (use `/api` for dev proxy)   | `/api`                             |
| `VITE_BROKER_API_KEY` | API key matching the broker's `BROKER_API_KEY` | `local-dev-key-change-in-production` |
