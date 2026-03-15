# Website Download Assets

This folder contains website-facing files for the chunked installer flow.

## Files

- `download-bootstrap.html`
  - Download page that launches the bootstrap script from website-hosted release assets.
- `release-assets/`
  - Bootstrap script, manifest, and installer chunk files served directly from the website.

## Recommended Website Flow

1. Place release assets under `release-assets/`:
   - `DoubleTakeSetup-bootstrap.ps1`
   - `DoubleTake-release-manifest.json`
   - `DoubleTake-Image-and-Video-Setup.exe.part001...partNNN`
2. Link the website download button to `download-bootstrap.html`.
3. The bootstrap script downloads and verifies chunks from the website URL, rebuilds the installer, and runs it.

## Bootstrap URL Pattern (Website)

```text
https://doubletake.sbs/doubletake-image-video/downloads/release-assets/DoubleTakeSetup-bootstrap.ps1
```

## Client Command

```powershell
powershell -ExecutionPolicy Bypass -Command "iwr https://doubletake.sbs/doubletake-image-video/downloads/release-assets/DoubleTakeSetup-bootstrap.ps1 -OutFile DoubleTakeSetup-bootstrap.ps1; .\DoubleTakeSetup-bootstrap.ps1 -BaseUrl https://doubletake.sbs/doubletake-image-video/downloads/release-assets"
```
