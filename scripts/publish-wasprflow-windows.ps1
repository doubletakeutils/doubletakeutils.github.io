param(
  [string]$SourceRoot = "F:\DEV\WASPrFlow",
  [string]$WebsiteRoot = "F:\DEV\wasprflow-site\public",
  [string]$MetricsEndpoint = "https://api.doubletake.sbs/metrics/event"
)

$ErrorActionPreference = "Stop"

function Get-LatestInstaller([string]$Path, [string]$Filter) {
  $file = Get-ChildItem -Path $Path -File -Filter $Filter |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
  if (-not $file) {
    throw "No files found at '$Path' for filter '$Filter'."
  }
  return $file
}

$nsisDir = Join-Path $SourceRoot "src-tauri\target\release\bundle\nsis"
$msiDir = Join-Path $SourceRoot "src-tauri\target\release\bundle\msi"
$downloadsDir = Join-Path $WebsiteRoot "downloads"
$indexPath = Join-Path $WebsiteRoot "index.html"

$latestExe = Get-LatestInstaller -Path $nsisDir -Filter "WASPrFlow_*_x64-setup.exe"
$latestMsi = Get-LatestInstaller -Path $msiDir -Filter "WASPrFlow_*_x64_en-US.msi"

$exeMatch = [regex]::Match($latestExe.Name, "^WASPrFlow_(?<ver>.+)_x64-setup\.exe$")
$msiMatch = [regex]::Match($latestMsi.Name, "^WASPrFlow_(?<ver>.+)_x64_en-US\.msi$")
if (-not $exeMatch.Success -or -not $msiMatch.Success) {
  throw "Could not parse version from installer filenames."
}

$exeVersion = $exeMatch.Groups["ver"].Value
$msiVersion = $msiMatch.Groups["ver"].Value
if ($exeVersion -ne $msiVersion) {
  throw "Version mismatch: EXE=$exeVersion MSI=$msiVersion"
}

$version = $exeVersion

$destExe = Join-Path $downloadsDir $latestExe.Name
$destMsi = Join-Path $downloadsDir $latestMsi.Name
$aliasExe = Join-Path $downloadsDir "WASPrFlow_latest_x64-setup.exe"
$aliasMsi = Join-Path $downloadsDir "WASPrFlow_latest_x64_en-US.msi"

Copy-Item -Path $latestExe.FullName -Destination $destExe -Force
Copy-Item -Path $latestMsi.FullName -Destination $destMsi -Force
Copy-Item -Path $latestExe.FullName -Destination $aliasExe -Force
Copy-Item -Path $latestMsi.FullName -Destination $aliasMsi -Force

$index = Get-Content -Path $indexPath -Raw
$updated = [regex]::Replace($index, 'const version = "[^"]+";', "const version = `"$version`";")
if ($updated -ne $index) {
  Set-Content -Path $indexPath -Value $updated
}

$exeHash = (Get-FileHash -Path $destExe -Algorithm SHA256).Hash
$msiHash = (Get-FileHash -Path $destMsi -Algorithm SHA256).Hash
$aliasExeHash = (Get-FileHash -Path $aliasExe -Algorithm SHA256).Hash
$aliasMsiHash = (Get-FileHash -Path $aliasMsi -Algorithm SHA256).Hash

function Send-ReleaseMetric {
  param(
    [string]$Endpoint,
    [string]$ReleaseVersion,
    [string]$ExeName,
    [string]$MsiName
  )

  if ([string]::IsNullOrWhiteSpace($Endpoint)) {
    return
  }

  $payload = @{
    event_name = "update_install_success"
    site_id    = "wasprflow"
    event_id   = [guid]::NewGuid().ToString()
    event_time = (Get-Date).ToUniversalTime().ToString("o")
    page_name  = "wasprflow-release-publish"
    page_path  = "/release"
    page_url   = "file:///F:/DEV/wasprflow-site/scripts/publish-wasprflow-windows.ps1"
    target_name = "release_publish"
    version    = $ReleaseVersion
    target_url = "https://wasprflow.xyz/"
    release_exe = $ExeName
    release_msi = $MsiName
  }

  try {
    $json = $payload | ConvertTo-Json -Compress
    Invoke-RestMethod -Method Post -Uri $Endpoint -ContentType "text/plain; charset=UTF-8" -Body $json | Out-Null
    Write-Output "Release metric recorded for WASPrFlow $ReleaseVersion."
  }
  catch {
    Write-Warning "Release metric could not be recorded: $($_.Exception.Message)"
  }
}

Send-ReleaseMetric -Endpoint $MetricsEndpoint -ReleaseVersion $version -ExeName $latestExe.Name -MsiName $latestMsi.Name

Write-Output "Published WASPrFlow version: $version"
Write-Output "EXE: $destExe"
Write-Output "MSI: $destMsi"
Write-Output "EXE SHA256: $exeHash"
Write-Output "MSI SHA256: $msiHash"
Write-Output "Latest EXE SHA256: $aliasExeHash"
Write-Output "Latest MSI SHA256: $aliasMsiHash"
