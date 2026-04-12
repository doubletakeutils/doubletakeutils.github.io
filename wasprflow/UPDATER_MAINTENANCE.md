# WASPrFlow Updater Maintenance

Use `main` as the single release source for updater assets.

## Publish Routine (every release)

1. Copy new installers into `wasprflow/downloads/`:
   - `WASPrFlow_<version>_x64-setup.exe`
   - `WASPrFlow_<version>_x64_en-US.msi`
2. Overwrite latest aliases:
   - `WASPrFlow_latest_x64-setup.exe`
   - `WASPrFlow_latest_x64_en-US.msi`
3. Update `wasprflow/latest.json`:
   - `version` = release version
   - `windows-x86_64` and `windows-x86_64-nsis` point to latest setup URL
   - `windows-x86_64-msi` points to latest msi URL
   - signatures come directly from the generated `.sig` files (string content, no extra encoding)
4. Update `wasprflow/index.html` `VERSION` constant.
5. Commit all updater files together in one commit on `main`.

## Required Checks Before Push

- `latest.json` parses and contains: `version`, `pub_date`, `platforms`.
- `platforms` has: `windows-x86_64`, `windows-x86_64-nsis`, `windows-x86_64-msi`.
- All `url` values in `latest.json` point to `WASPrFlow_latest_*` aliases.
- Signature values in `latest.json` match the source `.sig` file content for this release.

## Live Verification After Push

- `https://raw.githubusercontent.com/doubletakeutils/doubletakeutils.github.io/main/wasprflow/latest.json` returns `200`.
- `https://doubletake.sbs/wasprflow/downloads/WASPrFlow_latest_x64-setup.exe` returns `200`.
- `https://doubletake.sbs/wasprflow/downloads/WASPrFlow_latest_x64_en-US.msi` returns `200`.
