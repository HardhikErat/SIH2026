#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Push the full SIH2026 monorepo to GitHub.

.DESCRIPTION
  Initializes git (if needed), commits all tracked files, and pushes to:
  https://github.com/HardhikErat/SIH2026

  Requires git credentials (GitHub PAT, SSH key, or Git Credential Manager).

.PARAMETER Remote
  Git remote URL (default: https://github.com/HardhikErat/SIH2026.git)

.PARAMETER Branch
  Branch to push (default: main)

.PARAMETER Message
  Commit message when there are changes to commit.
#>
param(
  [string]$Remote = "https://github.com/HardhikErat/SIH2026.git",
  [string]$Branch = "main",
  [string]$Message = "feat: multilingual clinical intake app (Expo + FastAPI + Supabase)"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host "==> SIH2026 push-to-github" -ForegroundColor Cyan
Write-Host "    Root: $Root"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw "git is not installed."
}

if (-not (Test-Path ".git")) {
  Write-Host "==> Initializing git repository..."
  git init
  git branch -M $Branch
}

$remotes = git remote 2>$null
if ($remotes -notcontains "origin") {
  Write-Host "==> Adding remote origin: $Remote"
  git remote add origin $Remote
} else {
  $current = git remote get-url origin
  if ($current -ne $Remote) {
    Write-Host "==> Updating origin: $current -> $Remote"
    git remote set-url origin $Remote
  }
}

Write-Host "==> Staging files..."
git add -A

$status = git status --porcelain
if ($status) {
  Write-Host "==> Committing..."
  git commit -m $Message
} else {
  Write-Host "==> No changes to commit."
}

Write-Host "==> Pushing to origin/$Branch ..."
git push -u origin $Branch

Write-Host "==> Done. Repository: $Remote" -ForegroundColor Green
