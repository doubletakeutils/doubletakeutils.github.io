# Website Download Assets (GitHub Releases)

This folder contains website-facing files for the GitHub chunked installer flow.

## Files

- `download-bootstrap.html`
  - Basic download page that launches the bootstrap script from GitHub Releases.
  - Update `REPO` and `TAG` placeholders before publishing.

## Recommended Website Flow

1. Publish a tagged release with:
   - `DoubleTakeSetup-bootstrap.ps1`
   - `DoubleTake-release-manifest.json`
   - `DoubleTake-Image-and-Video-Setup.exe.part001...partNNN`
2. Link your website's "Download" button to the bootstrap script asset URL for that tag.
3. The bootstrap script downloads and verifies all chunks, rebuilds the installer, and runs it.

## Bootstrap URL Pattern

```text
https://github.com/<owner>/<repo>/releases/download/<tag>/DoubleTakeSetup-bootstrap.ps1
```

## Client Command

```powershell
powershell -ExecutionPolicy Bypass -Command "iwr https://github.com/<owner>/<repo>/releases/download/<tag>/DoubleTakeSetup-bootstrap.ps1 -OutFile DoubleTakeSetup-bootstrap.ps1; .\DoubleTakeSetup-bootstrap.ps1 -Repo <owner>/<repo> -Tag <tag>"
```

