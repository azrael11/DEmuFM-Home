🇬🇧 **English** | [🇬🇷 Ελληνικά](DEPLOY_NEXT_0.0.6.el.md)

# DEmuFM Next — public website deployment (0.0.6)

This repository publishes the designed **DEmuFM Next v0.4.1** static website, updated for emulator version 0.0.6. The real `index.html`, CSS and JavaScript under `assets/`, and JSON files under `data/` live at the repository root.

## Website contents

- **400 individually tested arcade games:** every game is playable at its correct game-specific frame rate, with an internal `#game/<rom>` profile.
- Greek and English user interfaces, the official logo, and a Windows Downloads section.
- The unfinished experimental **1942 GL OpenGL** title is not included in the 400 games.
- The emulator source repository is private. GitHub release `v0.0.6` is source-only, with no public Win64 binary.
- The retired legacy HTML pages are not part of the new site. The logo and genuine gameplay images from the older collection remain available.
- Primary images are available for **169 / 400** ROMs; the **231** missing primary pictures are listed in [issue #47](https://github.com/azrael11/DEmuFM/issues/47).

## Automated publishing

The workflow `.github/workflows/jekyll-gh-pages.yml` publishes the static site through GitHub Pages whenever the public repository is updated.

1. Confirms that canonical root files `index.html`, `assets/app.js` and `data/arcade.json` exist.
2. Assembles the website from its HTML, CSS/JavaScript, data, logo and existing gallery assets.
3. Validates that the catalogue contains exactly **400 unique ROM keys**, excluding experimental 1942 GL.
4. Uploads and deploys the assembled static site to GitHub Pages.

The original compressed publication package remains at `deployment/DEmuFM-Next-Public-0.0.6.tar.xz` as a retained distribution snapshot. The canonical website is maintained from actual root files.

## Adding game images

Game media can be added under `assets/game-media/<rom>/` and referenced from `data/game-media.json`. Authentic screenshots captured with DEmuFM's F11 are preferred. Verify that each image matches its ROM identity.

## Maintenance

Edit the repository's `index.html`, `assets/` and `data/` files when changing the site. Publishing does not expose private emulator source code in the browser. Older site content remains available in Git history for rollback.
