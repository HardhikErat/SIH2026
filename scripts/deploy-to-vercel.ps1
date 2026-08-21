#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Configure Vercel environment variables and deploy SIH2026.

.DESCRIPTION
  1. Loads secrets from .env (create from .env.local.template)
  2. Pushes env vars to Vercel (requires VERCEL_TOKEN or prior `vercel login`)
  3. Deploys preview (default) or production with --Prod

.PARAMETER Prod
  Deploy to production (--prod)

.PARAMETER ProjectName
  Vercel project name
#>
param(
  [switch]$Prod,
  [string]$ProjectName = "sih2026-intake"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Require-Command($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Required command not found: $name. Install with: npm i -g vercel"
  }
}

Write-Host "==> SIH2026 deploy-to-vercel" -ForegroundColor Cyan

Require-Command "npm"
if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
  Write-Host "Installing Vercel CLI globally..."
  npm install -g vercel@latest
}
Require-Command "vercel"

$envFile = Join-Path $Root ".env"
if (-not (Test-Path $envFile)) {
  $template = Join-Path $Root ".env.local.template"
  if (Test-Path $template) {
    Write-Host "No .env found. Copy .env.local.template to .env and fill SUPABASE_SERVICE_ROLE_KEY + SUPABASE_JWT_SECRET."
    Copy-Item $template $envFile
    throw "Created .env from template — add secrets from Supabase Dashboard → Settings → API, then re-run."
  }
  throw ".env not found."
}

$vars = @{}
Get-Content $envFile | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
  $parts = $_ -split '=', 2
  if ($parts.Count -eq 2) { $vars[$parts[0].Trim()] = $parts[1].Trim() }
}

$required = @(
  "SESSION_SECRET",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_ANON_KEY"
)
foreach ($key in $required) {
  if (-not $vars[$key] -or $vars[$key] -match '^REPLACE') {
    throw "Missing or placeholder value for $key in .env"
  }
}

Write-Host "==> Linking Vercel project (if needed)..."
vercel link --yes --project $ProjectName 2>$null

Write-Host "==> Setting Vercel environment variables..."
$targets = @("production", "preview", "development")
foreach ($key in $vars.Keys) {
  if ($key -match '^EXPO_PUBLIC_' ) { continue }
  foreach ($target in $targets) {
    $value = $vars[$key]
    Write-Host "  $key -> $target"
    echo $value | vercel env add $key $target --force 2>$null
  }
}

$deployArgs = @("deploy", "--yes", "--no-wait")
if ($Prod) { $deployArgs += "--prod" }

Write-Host "==> Deploying to Vercel..."
& vercel @deployArgs

Write-Host "==> Deployment submitted. Check: vercel ls" -ForegroundColor Green
if ($Prod) {
  Write-Host "    Production URL: https://$ProjectName.vercel.app"
} else {
  Write-Host "    Preview URL will appear in Vercel dashboard / CLI output."
}
