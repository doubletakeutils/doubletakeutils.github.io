param(
    [Parameter(Mandatory = $false)]
    [string]$BaseUrl = "",

    [Parameter(Mandatory = $false)]
    [string]$Repo = "",

    [Parameter(Mandatory = $false)]
    [string]$Tag = "",

    [Parameter(Mandatory = $false)]
    [string]$ManifestAsset = "DoubleTake-release-manifest.json",

    [Parameter(Mandatory = $false)]
    [string]$OutputDir = "$env:TEMP\DoubleTakeInstaller",

    [Parameter(Mandatory = $false)]
    [switch]$NoLaunch
)

$ErrorActionPreference = "Stop"
$DefaultBaseUrl = "https://doubletake.sbs/doubletake-image-video/downloads/release-assets"

function Get-Sha256 {
    param([Parameter(Mandatory = $true)][string]$Path)
    return (Get-FileHash -Path $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Resolve-LatestTag {
    param([Parameter(Mandatory = $true)][string]$RepoName)
    $api = "https://api.github.com/repos/$RepoName/releases/latest"
    Write-Host "Resolving latest release tag from $api"
    $response = Invoke-RestMethod -Uri $api -Headers @{ "Accept" = "application/vnd.github+json" }
    if (-not $response.tag_name) {
        throw "Could not resolve latest release tag."
    }
    return [string]$response.tag_name
}

if (-not $BaseUrl -and -not $Repo) {
    # Default to website-hosted assets so users can run the script directly.
    $BaseUrl = $DefaultBaseUrl
}

if ($Repo -and -not $Tag) {
    $Tag = Resolve-LatestTag -RepoName $Repo
}

New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

if ($BaseUrl) {
    $sourceBase = $BaseUrl.TrimEnd("/")
}
else {
    $sourceBase = "https://github.com/$Repo/releases/download/$Tag"
}

$manifestUrl = "$sourceBase/$ManifestAsset"
$manifestPath = Join-Path $OutputDir $ManifestAsset

Write-Host "Downloading manifest: $manifestUrl"
Invoke-WebRequest -Uri $manifestUrl -OutFile $manifestPath

$manifest = Get-Content -Raw $manifestPath | ConvertFrom-Json
if (-not $manifest.chunks -or $manifest.chunks.Count -eq 0) {
    throw "Manifest has no chunks."
}

$installerName = [string]$manifest.installer_filename
$installerPath = Join-Path $OutputDir $installerName

Write-Host "Downloading $($manifest.chunks.Count) chunk(s)..."
foreach ($chunk in $manifest.chunks) {
    $chunkName = [string]$chunk.name
    $chunkUrl = if ($BaseUrl) { "$sourceBase/$chunkName" } else { [string]$chunk.url }
    if (-not $chunkUrl) { $chunkUrl = "$sourceBase/$chunkName" }
    $chunkPath = Join-Path $OutputDir $chunkName
    Write-Host "  -> $chunkName"
    Invoke-WebRequest -Uri $chunkUrl -OutFile $chunkPath

    $actualChunkHash = Get-Sha256 -Path $chunkPath
    $expectedChunkHash = ([string]$chunk.sha256).ToLowerInvariant()
    if ($expectedChunkHash -and $actualChunkHash -ne $expectedChunkHash) {
        throw "Chunk hash mismatch for $chunkName"
    }
}

Write-Host "Reassembling installer: $installerName"
$outStream = [System.IO.File]::Open($installerPath, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write)
try {
    foreach ($chunk in $manifest.chunks) {
        $chunkPath = Join-Path $OutputDir ([string]$chunk.name)
        $bytes = [System.IO.File]::ReadAllBytes($chunkPath)
        $outStream.Write($bytes, 0, $bytes.Length)
    }
}
finally {
    $outStream.Dispose()
}

$actualInstallerHash = Get-Sha256 -Path $installerPath
$expectedInstallerHash = ([string]$manifest.installer_sha256).ToLowerInvariant()
if ($expectedInstallerHash -and $actualInstallerHash -ne $expectedInstallerHash) {
    throw "Installer hash mismatch after reassembly."
}

Write-Host "Installer ready: $installerPath"

if (-not $NoLaunch) {
    Write-Host "Launching installer..."
    Start-Process -FilePath $installerPath
}
