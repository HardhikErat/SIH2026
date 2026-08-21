#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Configure GitHub Actions secrets for Vercel deploy workflow.

.DESCRIPTION
  Sets VERCEL_TOKEN, VERCEL_ORG_ID, and VERCEL_PROJECT_ID on HardhikErat/SIH2026.
  Requires: GitHub CLI (`gh auth login`) and a Vercel token.

  Get a Vercel token: https://vercel.com/account/tokens
  Org/project IDs are read from .vercel/project.json after `vercel link`.
#>
param(
  [string]$Repo = "HardhikErat/SIH2026",
  [string]$VercelToken = $env:VERCEL_TOKEN
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  throw "Install GitHub CLI and run: gh auth login"
}

gh auth status 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "Run: gh auth login"
}

$projectFile = Join-Path $Root ".vercel/project.json"
if (-not (Test-Path $projectFile)) {
  if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
    throw "Run: vercel link --project sih2026-intake"
  }
  vercel link --yes --project sih2026-intake
}

$meta = Get-Content $projectFile | ConvertFrom-Json
$orgId = $meta.orgId
$projectId = $meta.projectId

if (-not $VercelToken) {
  Write-Host "Reading Vercel token from local CLI keyring..." -ForegroundColor Cyan
  $nodeScript = @"
const { readCliAuthConfig } = require(process.env.VERCEL_CLI_AUTH_MODULE);
const { getGlobalPathConfig } = require(process.env.VERCEL_CLI_CONFIG_MODULE);
const auth = readCliAuthConfig(getGlobalPathConfig());
if (!auth?.token) process.exit(2);
process.stdout.write(auth.token);
"@
  $vercelRoot = (npm root -g 2>$null) + "\vercel\node_modules"
  if (-not (Test-Path $vercelRoot)) {
    $vercelRoot = "$env:APPDATA\npm\node_modules\vercel\node_modules"
  }
  $env:VERCEL_CLI_AUTH_MODULE = Join-Path $vercelRoot "@vercel\cli-auth\credentials-store.js"
  $env:VERCEL_CLI_CONFIG_MODULE = Join-Path $vercelRoot "@vercel\cli-config\dist\index.js"
  try {
    $VercelToken = node -e $nodeScript 2>$null
  } catch {
    $VercelToken = $null
  }
  Remove-Item Env:VERCEL_CLI_AUTH_MODULE -ErrorAction SilentlyContinue
  Remove-Item Env:VERCEL_CLI_CONFIG_MODULE -ErrorAction SilentlyContinue
}

if (-not $VercelToken) {
  Write-Host "Paste your Vercel token (https://vercel.com/account/tokens):" -ForegroundColor Yellow
  $secure = Read-Host -AsSecureString
  $VercelToken = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  )
}

if (-not $VercelToken) {
  throw "VERCEL_TOKEN is required."
}

Write-Host "==> Setting GitHub secrets on $Repo" -ForegroundColor Cyan
echo $VercelToken | gh secret set VERCEL_TOKEN --repo $Repo
echo $orgId | gh secret set VERCEL_ORG_ID --repo $Repo
echo $projectId | gh secret set VERCEL_PROJECT_ID --repo $Repo

Write-Host "==> Done. Re-run failed workflows in GitHub Actions." -ForegroundColor Green
Write-Host "    VERCEL_ORG_ID=$orgId"
Write-Host "    VERCEL_PROJECT_ID=$projectId"
