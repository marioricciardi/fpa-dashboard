<#
.SYNOPSIS
  Build and deploy fpa-dashboard to OCI fpa-nginx instance.

.DESCRIPTION
  1. Runs `npm run build` to produce the dist/ folder.
  2. SCPs the dist/ contents to the nginx document root on the remote instance.
  3. Restarts nginx on the remote host.

.PARAMETER KeyPath
  Path to the SSH private key. Default: scratch/ssh-key-2026-04-03.key

.PARAMETER Host
  Public IP or hostname of the fpa-nginx instance. Default: 64.181.219.199

.PARAMETER User
  SSH username. Default: opc

.PARAMETER NginxRoot
  Remote nginx document root. Default: /usr/share/nginx/html

.PARAMETER SkipBuild
  If set, skips the npm build step and deploys the existing dist/ folder.
#>

param(
    [string]$KeyPath  = "$PSScriptRoot\scratch\ssh-key-2026-04-03.key",
    [string]$Host     = "64.181.219.199",
    [string]$User     = "opc",
    [string]$NginxRoot = "/usr/share/nginx/html",
    [switch]$SkipBuild
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ── Preflight checks ────────────────────────────────────────────────────────
if (-not (Test-Path $KeyPath)) {
    Write-Error "SSH key not found at $KeyPath"
    exit 1
}

$sshTarget = "$User@$Host"
$sshOpts   = @("-i", $KeyPath, "-o", "StrictHostKeyChecking=accept-new")

# ── Step 1: Build ────────────────────────────────────────────────────────────
if (-not $SkipBuild) {
    Write-Host "`n==> Building production bundle..." -ForegroundColor Cyan
    Push-Location $PSScriptRoot
    npm run build
    if ($LASTEXITCODE -ne 0) { Write-Error "Build failed"; exit 1 }
    Pop-Location
} else {
    Write-Host "`n==> Skipping build (using existing dist/)" -ForegroundColor Yellow
}

$distPath = Join-Path $PSScriptRoot "dist"
if (-not (Test-Path $distPath)) {
    Write-Error "dist/ folder not found. Run without -SkipBuild first."
    exit 1
}

# ── Step 2: Upload ───────────────────────────────────────────────────────────
Write-Host "`n==> Clearing remote nginx root..." -ForegroundColor Cyan
ssh @sshOpts $sshTarget "sudo rm -rf $NginxRoot/*"
if ($LASTEXITCODE -ne 0) { Write-Error "Failed to clear remote directory"; exit 1 }

Write-Host "==> Uploading dist/ to ${sshTarget}:${NginxRoot} ..." -ForegroundColor Cyan
scp @sshOpts -r "$distPath\*" "${sshTarget}:/tmp/fpa-dist/"
if ($LASTEXITCODE -ne 0) { Write-Error "SCP upload failed"; exit 1 }

# Move files into place with sudo (scp can't write directly to nginx root as opc)
ssh @sshOpts $sshTarget "sudo cp -r /tmp/fpa-dist/* $NginxRoot/ && rm -rf /tmp/fpa-dist"
if ($LASTEXITCODE -ne 0) { Write-Error "Failed to move files into nginx root"; exit 1 }

# ── Step 3: Restart nginx ────────────────────────────────────────────────────
Write-Host "==> Restarting nginx..." -ForegroundColor Cyan
ssh @sshOpts $sshTarget "sudo systemctl restart nginx"
if ($LASTEXITCODE -ne 0) { Write-Error "nginx restart failed"; exit 1 }

# ── Done ─────────────────────────────────────────────────────────────────────
Write-Host "`n==> Deployed successfully to http://${Host}" -ForegroundColor Green
Write-Host "    Instance: fpa-nginx (us-chicago-1 / fpa-platform-dev)"
Write-Host "    OCID:     ocid1.instance.oc1.us-chicago-1.anxxeljsw2ffkvqc4x2mbv6licluk6pvbjoakuhjzzbrfh4ogysikwax57ba`n"
