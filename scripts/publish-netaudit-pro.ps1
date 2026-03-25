param(
  [string]$SourceRoot = "F:\DEV\NetAudit-Pro",
  [string]$WebsiteRoot = "F:\DEV\WEBSITE"
)

$ErrorActionPreference = "Stop"

function Get-LatestArtifact([string]$Path, [string]$Pattern) {
  $file = Get-ChildItem -Path $Path -File |
    Where-Object { $_.Name -match $Pattern } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
  if (-not $file) {
    throw "No matching artifact found in '$Path' for pattern '$Pattern'."
  }
  return $file
}

$distDir = Join-Path $SourceRoot "dist"
$downloadsDir = Join-Path $WebsiteRoot "netaudit-pro\downloads"
$indexPath = Join-Path $WebsiteRoot "netaudit-pro\index.html"

$setupPattern = '^NetAudit Pro Setup ([0-9]+\.[0-9]+\.[0-9]+)\.exe$'
$portablePattern = '^NetAudit Pro ([0-9]+\.[0-9]+\.[0-9]+)\.exe$'

$latestSetup = Get-LatestArtifact -Path $distDir -Pattern $setupPattern
$latestPortable = Get-LatestArtifact -Path $distDir -Pattern $portablePattern

$setupVersion = [regex]::Match($latestSetup.Name, $setupPattern).Groups[1].Value
$portableVersion = [regex]::Match($latestPortable.Name, $portablePattern).Groups[1].Value
if ($setupVersion -ne $portableVersion) {
  throw "Version mismatch: setup=$setupVersion portable=$portableVersion"
}

$version = $setupVersion

$destSetup = Join-Path $downloadsDir "NetAuditPro_${version}_x64-setup.exe"
$destPortable = Join-Path $downloadsDir "NetAuditPro_${version}_x64-portable.exe"
$aliasSetup = Join-Path $downloadsDir "NetAuditPro_latest_x64-setup.exe"
$aliasPortable = Join-Path $downloadsDir "NetAuditPro_latest_x64-portable.exe"

Copy-Item -Path $latestSetup.FullName -Destination $destSetup -Force
Copy-Item -Path $latestPortable.FullName -Destination $destPortable -Force
Copy-Item -Path $latestSetup.FullName -Destination $aliasSetup -Force
Copy-Item -Path $latestPortable.FullName -Destination $aliasPortable -Force

$index = Get-Content -Path $indexPath -Raw
$updated = [regex]::Replace($index, 'const VERSION = "[^"]+";', "const VERSION = `"$version`";")
if ($updated -ne $index) {
  Set-Content -Path $indexPath -Value $updated
}

$setupHash = (Get-FileHash -Path $destSetup -Algorithm SHA256).Hash
$portableHash = (Get-FileHash -Path $destPortable -Algorithm SHA256).Hash
$aliasSetupHash = (Get-FileHash -Path $aliasSetup -Algorithm SHA256).Hash
$aliasPortableHash = (Get-FileHash -Path $aliasPortable -Algorithm SHA256).Hash

Write-Output "Published NetAudit Pro version: $version"
Write-Output "Setup: $destSetup"
Write-Output "Portable: $destPortable"
Write-Output "Setup SHA256: $setupHash"
Write-Output "Portable SHA256: $portableHash"
Write-Output "Latest Setup SHA256: $aliasSetupHash"
Write-Output "Latest Portable SHA256: $aliasPortableHash"
