# DEmuFM Next — public site replacement (0.0.6)

This staging branch is ready to replace the *published* legacy HTML website with the fully designed **DEmuFM Next v0.4.1** (400 internal playable game pages, English/Greek, official logo). **Do not merge until its site archive has been uploaded.**

## Required one-time upload

Upload the provided file **`DEmuFM-Next-Public-0.0.6.zip`** via GitHub website Upload Files to exactly:

`deployment/DEmuFM-Next-Public-0.0.6.zip`

on this staging branch. It is a static website archive only; it contains no emulator binaries, ROMs, private credentials or source-code repository data.

When this branch is merged into `main`, GitHub Actions will **deploy only the extracted new site**, plus the official logo, original archived gameplay images (169 ROM-matching images), and future `assets/game-media` entries. The **old HTML webpages are not copied into the deployed site**. The original assets are intentionally preserved so no existing image breaks.

The workflow **fails safely if the ZIP is missing**; it will never replace the public page with a blank site. Local validation of the supplied archive passed with exactly 400 games and `1942 GR` excluded.

To add screenshots later, commit files to `assets/game-media/<rom>/` and update `data/game-media.json` in `main`. [Issue #47](https://github.com/azrael11/DEmuFM/issues/47) lists the **231 ROMs missing a primary picture**.

**Downloads:** GitHub `azrael11/DEmuFM` is private. Release `v0.0.6` is source-only, with no public Windows executable; no download links are invented.
