# DEmuFM Next — public website 0.0.6

This repository deploys the **v0.4.1 DEmuFM Next** website (updated for source version 0.0.6) from an immutable, checksum-verified production archive in `deployment/DEmuFM-Next-Public-0.0.6.tar.xz`.

## Release and site
- **400 owner-reported playable Arcade games** with internal `#game/<rom>` pages, Greek/English translations, official logo and Windows-only Downloads section.
- Unfinished OpenGL experiment `1942 GR` excluded. Only *tested* games are claimed at expected 60 FPS.
- The repo `azrael11/DEmuFM` is private: source-only release `v0.0.6` has no public Win64 binary; don't offer fake executable downloads.
- The old HTML pages are excluded from the published artifact. The genuine original logo and old game screenshots are retained; **169/400** ROM-matching primary images, **231 still missing**.
- Detailed missing image checklist: [DEmuFM issue #47](https://github.com/azrael11/DEmuFM/issues/47).

## Automated deployment
Changes to `main` trigger `.github/workflows/jekyll-gh-pages.yml`, now a static deploy workflow:
1. Extracts the verified tar.xz contents into `_publish/`.
2. Validates the JSON has exactly 400 distinct ROMs and excludes 1942 GR.
3. Copies official `logo/`, legacy `img/`, and `compatibility/arcade/imgs/` assets into the deployment, **without** copying legacy HTML pages.
4. Overlays user-curated image assets from `assets/game-media/` and `data/game-media.json` if present.
5. Publishes `_publish/` to GitHub Pages.

## Adding screenshots while working on arcade-nosamples
Commit `assets/game-media/<rom>/cover.webp` (or PNG/JPG) and add `cover`/ `screenshots` to `data/game-media.json`. The deploy workflow overlays these files on the current site. Prefer authentic DEmuFM F11 screenshots, and preserve the image identity to the correct ROM.

## Source and maintenance
The production archive is a stable published copy of the owner's last private v0.4.1 preview with updated 0.0.6 messaging. For more extensive layout changes, edit the website source copy and regenerate the archive; the public deployment never pulls private emulator code into a browser.

The earlier website remains in Git history for rollback. The production Pages deployment contains only the new HTML application.
