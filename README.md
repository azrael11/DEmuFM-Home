# DEmuFM — Official Arcade Website

Welcome to the public **DEmuFM Next** website, published at **https://azrael11.github.io/DEmuFM-Home/**.

## Website version 0.0.6
- Bilingual English / Greek static website based on the author's latest v0.4.1 private prototype.
- 400 owner-reported **playable** Arcade titles, all with first-party internal game pages; the unfinished experimental 1942 GR is not included.
- Tested titles achieve their expected 60 FPS according to the author; a benchmark for every title is not claimed.
- Windows-only downloads are shown **only after an approved real binary exists**. The v0.0.6 emulator GitHub Release is source-only on a private repository.
- All legacy HTML pages were retired in the 0.0.6 source cutover. The official logo and original image assets remain for continuity.

## Images to collect
- 400 game ROMs in the site.
- 169 primary images already match their game ROMs in the legacy gallery.
- **231 primary images remain to collect**, tracked in [DEmuFM issue #47](https://github.com/azrael11/DEmuFM/issues/47).
- Add new image files to `assets/game-media/<rom>/` and update `data/game-media.json`; the GitHub Pages workflow overlays these on deployment.

## Deployment
The GitHub Actions workflow `.github/workflows/jekyll-gh-pages.yml` deploys the production site from `deployment/DEmuFM-Next-Public-0.0.6.tar.xz`, plus the genuine logo and original gallery assets. The old HTML pages are not published.

See [DEPLOY_NEXT_0.0.6.md](DEPLOY_NEXT_0.0.6.md) for editing, source packaging and rollback information. The full old site has been preserved in branch `archive/legacy-site-2026-11-20` for rollback.

## Main source
DEmuFM emulator source, releases and issues live in the separate repository [azrael11/DEmuFM](https://github.com/azrael11/DEmuFM). The source repository is private, so this website does not expose its contents or offer links that require visitor access.

© 2026 DEmuFM.
