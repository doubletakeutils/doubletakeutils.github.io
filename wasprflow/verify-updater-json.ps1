param(
  [Parameter(Mandatory = $true)]
  [string]$Version,
  [Parameter(Mandatory = $true)]
  [string]$SetupSigPath,
  [Parameter(Mandatory = $true)]
  [string]$MsiSigPath
)

$ErrorActionPreference = "Stop"
$jsonPath = Join-Path $PSScriptRoot "latest.json"

if (-not (Test-Path $jsonPath)) { throw "Missing $jsonPath" }
if (-not (Test-Path $SetupSigPath)) { throw "Missing setup sig file: $SetupSigPath" }
if (-not (Test-Path $MsiSigPath)) { throw "Missing msi sig file: $MsiSigPath" }

$json = Get-Content -Raw $jsonPath | ConvertFrom-Json
$setupSig = (Get-Content -Raw $SetupSigPath).Trim()
$msiSig = (Get-Content -Raw $MsiSigPath).Trim()

if ($json.version -ne $Version) { throw "latest.json version '$($json.version)' != expected '$Version'" }
if (-not $json.pub_date) { throw "latest.json missing pub_date" }
if (-not $json.platforms) { throw "latest.json missing platforms" }

$setupUrl = "https://doubletake.sbs/wasprflow/downloads/WASPrFlow_latest_x64-setup.exe"
$msiUrl = "https://doubletake.sbs/wasprflow/downloads/WASPrFlow_latest_x64_en-US.msi"

if ($json.platforms.'windows-x86_64'.url -ne $setupUrl) { throw "windows-x86_64 url mismatch" }
if ($json.platforms.'windows-x86_64-nsis'.url -ne $setupUrl) { throw "windows-x86_64-nsis url mismatch" }
if ($json.platforms.'windows-x86_64-msi'.url -ne $msiUrl) { throw "windows-x86_64-msi url mismatch" }

if ($json.platforms.'windows-x86_64'.signature -ne $setupSig) { throw "windows-x86_64 signature mismatch" }
if ($json.platforms.'windows-x86_64-nsis'.signature -ne $setupSig) { throw "windows-x86_64-nsis signature mismatch" }
if ($json.platforms.'windows-x86_64-msi'.signature -ne $msiSig) { throw "windows-x86_64-msi signature mismatch" }

Write-Host "latest.json validation passed for version $Version"
