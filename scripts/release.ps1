#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Full release: env setup hints → GitHub push → Vercel deploy.

  Supabase schema is already applied via MCP to project qkprwuvpwdggruzdrpyl.
#>
param(
  [switch]$Prod,
  [switch]$SkipDeploy,
  [switch]$SkipPush
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host @"

╔══════════════════════════════════════════════════════════════╗
║  SIH2026 release script                                      ║
║  Supabase: qkprwuvpwdggruzdrpyl (sih-pre-consultation)       ║
║  GitHub:   https://github.com/HardhikErat/SIH2026            ║
╚══════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Cyan

if (-not (Test-Path ".env")) {
  Copy-Item ".env.local.template" ".env"
  $secret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | ForEach-Object { [char]$_ })
  (Get-Content ".env") -replace "REPLACE_WITH_RANDOM_64_CHAR_STRING", $secret | Set-Content ".env"
  Write-Host "Created .env with generated SESSION_SECRET." -ForegroundColor Yellow
  Write-Host "ACTION REQUIRED: Edit .env and set:" -ForegroundColor Yellow
  Write-Host "  - SUPABASE_SERVICE_ROLE_KEY (Dashboard → Settings → API → service_role)" -ForegroundColor Yellow
  Write-Host "  - SUPABASE_JWT_SECRET     (Dashboard → Settings → API → JWT Secret)" -ForegroundColor Yellow
  Write-Host ""
}

if (-not $SkipPush) {
  & "$PSScriptRoot\push-to-github.ps1"
}

if (-not $SkipDeploy) {
  try {
    if ($Prod) {
      & "$PSScriptRoot\deploy-to-vercel.ps1" -Prod
    } else {
      & "$PSScriptRoot\deploy-to-vercel.ps1"
    }
  } catch {
    Write-Host "Vercel deploy skipped or failed: $_" -ForegroundColor Yellow
    Write-Host "Run manually after: vercel login && .\scripts\deploy-to-vercel.ps1" -ForegroundColor Yellow
  }
}

Write-Host "`nRelease script finished." -ForegroundColor Green
