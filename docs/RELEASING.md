# Releasing a new version

Releases are automatic. When the version in `app/appinfo.json` changes on the `main` branch, GitHub builds the package, writes the Homebrew Channel manifest and publishes the release. You never need a terminal.

Users add this repository to the Homebrew Channel once:

```
https://raw.githubusercontent.com/z3d6380/slopium/main/repo/apps.json
```

`repo/apps.json` never changes. It points at `releases/latest/download/io.github.batmanrises.slopium.manifest.json`, so every new release is picked up by the Homebrew Channel, which then shows an **Update** button.

## Publish a new version (from the GitHub website)

1. Open `app/appinfo.json`, click the pencil icon, and raise `"version"` (for example `1.0.0` to `1.0.1`). A new version must be **higher** than the one on the TV, or it will not be offered as an update.
2. Optional but recommended: write the release text. Open `docs/release-notes/`, choose **Add file, Create new file**, name it `v1.0.1.md` (the letter `v` plus the version) and write what changed. If this file exists it becomes the release description. Add a line to `CHANGELOG.md` too.
3. Commit to `main`.
4. Open the **Actions** tab. A run called **Release** starts by itself and takes about a minute. When it is green, the **Releases** page shows "Slopium 1.0.1" with the `.ipk` and the manifest attached.
5. On the TV, open the Homebrew Channel: Slopium shows an **Update** button.

Ordinary commits that do not raise the version do nothing, so you can edit the README or fix a typo without publishing.

## First release, or a re-run

Open the **Actions** tab, choose **Release** in the left list, click **Run workflow** and confirm. It publishes the version that is currently in `app/appinfo.json`, unless that release already exists.

## Re-publishing the same version

The workflow refuses to overwrite an existing release. To replace one, delete the release on the Releases page, then delete its tag (Releases page, **Tags**), then run the workflow again. Note that the Homebrew Channel only offers an update when the version number goes up, so raising the version is almost always better.

## If a run fails

- **The Actions tab asks you to enable workflows:** click the green button to enable them.
- **"Resource not accessible by integration":** in the repository open Settings, Actions, General, and under **Workflow permissions** choose **Read and write permissions**.
- **"Could not read the version":** check that `app/appinfo.json` still has a line like `"version": "1.0.1",`.
- Open the failed run and read the red step; the message says what went wrong.

## Working on Windows (VS Code and Git Bash)

You do not need to build anything on your PC, because GitHub builds the package for you. If you want to build one locally anyway, `bash tools/build-ipk.sh` works in Git Bash (it does not need the `ar` tool).

**Making a change**

1. Open the `slopium` folder in VS Code (**File, Open Folder**).
2. Make your change in the `app/` folder. If someone gives you updated files or a new zip, copy them over the folder (keep the hidden `.git` folder). VS Code's **Source Control** panel then lists exactly what changed.
3. Raise `"version"` in `app/appinfo.json` (for example `1.0.0` to `1.0.1`), and add a line to `CHANGELOG.md`.
4. Commit and push, either in VS Code (Source Control, type a message, **Commit**, **Sync Changes**) or in Git Bash:

   ```sh
   git add -A
   git commit -m "Slopium 1.0.1: what you changed"
   git push
   ```
5. GitHub publishes release `v1.0.1` by itself (see above). The Homebrew Channel on every TV then offers the update. **Never edit the `.ipk` file itself**: always change the files in `app/` and let GitHub rebuild the package.

**Trying a change on your TV before publishing**

Open the **Actions** tab, choose **Release**, click **Run workflow**, tick **test_only** and run it. When the run finishes, open it and download the `slopium-test-build` file under **Artifacts** (it is a zip that contains the `.ipk`). Install that `.ipk` on the TV with Dev Manager. Nothing is published and no version number is used up.

**Line endings**

The repository has a `.gitattributes` file so Windows editors cannot turn the line endings of the build scripts into CRLF (which would make the GitHub build fail with a message about `\r`). Keep that file.

## Uploading an `.ipk` by hand (not recommended)

Only use this if you cannot use the workflow. The Homebrew Channel needs the manifest as well as the `.ipk`, and the manifest must match that exact `.ipk`.

1. Create a folder called `build` in the repository folder and put the `.ipk` in it, named exactly `io.github.batmanrises.slopium_<version>_all.ipk`.
2. In Git Bash, in the repository folder, run `bash tools/make-manifest.sh`. It writes `build/io.github.batmanrises.slopium.manifest.json`.
3. On GitHub open **Releases, Draft a new release**, choose **Select tag**, type `v<version>` and pick **Create new tag**, give it a title, and drag **both** files from `build/` into the box.
4. Leave **Set as a pre-release** and **draft** unticked, and click **Publish release**.

## Check a release

- Open `https://github.com/z3d6380/slopium/releases/latest/download/io.github.batmanrises.slopium.manifest.json`. A small text file should download, with `ipkUrl`, `ipkSize` and a `sha256`.
- Open `https://raw.githubusercontent.com/z3d6380/slopium/main/repo/apps.json`. It should show the package list.
- Do not mark a release as a pre-release or a draft, or the "latest" link above will not find it.

## Building by hand (Linux or macOS, or Windows with WSL)

On any computer with `bash`, `tar` (GNU) and `gzip` (this includes Git Bash on Windows):

```sh
bash tools/build-ipk.sh
bash tools/make-manifest.sh
```

The files appear in `build/`. The manifest and the `.ipk` must come from the same build, because the manifest records the exact size and hash.

## Optional: the official webosbrew repository

Slopium can also be listed at <https://repo.webosbrew.org> by opening a pull request to [webosbrew/apps-repo](https://github.com/webosbrew/apps-repo) with one `.yml` file that points at the same manifest. Read their rules first. This is not needed for the repository above to work.
