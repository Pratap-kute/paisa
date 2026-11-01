---
description: Install the Paisa desktop app, CLI, or Docker image.
---

# Installation

Choose the desktop app for the simplest setup. Use the CLI when you want to run
Paisa from a terminal or on a server. Both use the same journal and reports.

Download files from the [latest `Pratap-kute/paisa` release](https://github.com/Pratap-kute/paisa/releases/latest).

## Desktop app

=== "Linux"

    Download `paisa-app-linux-amd64.deb`, then install it:

    ```bash
    cd ~/Downloads
    sudo dpkg -i paisa-app-linux-amd64.deb
    ```

=== "macOS"

    Download `paisa-app-macos-amd64.dmg`, open it, and drag Paisa into
    **Applications**.

    The app is not code-signed. If macOS blocks the first launch, open
    **Applications**, Control-click Paisa, and choose **Open**. Apple's
    [security guide](https://support.apple.com/en-in/guide/mac-help/mh40616/mac)
    explains this exception.

    On first launch, allow access to the Documents folder. Paisa stores its
    journal, configuration, and database in `Documents/paisa` by default.

=== "Windows"

    Download `paisa-app-windows-amd64.exe` and run it. The app is not
    code-signed, so Windows may ask you to confirm that you want to keep and run
    the file.

    Paisa stores its journal, configuration, and database in
    `Documents\paisa` by default.

## Command-line app

=== "Linux"

    Download `paisa-cli-linux-amd64`, then install it as `paisa`:

    ```bash
    cd ~/Downloads
    chmod u+x paisa-cli-linux-amd64
    sudo mv paisa-cli-linux-amd64 /usr/local/bin/paisa
    paisa serve
    ```

=== "macOS"

    Download `paisa-cli-macos-amd64`, then install it as `paisa`:

    ```bash
    cd ~/Downloads
    chmod u+x paisa-cli-macos-amd64
    xattr -dr com.apple.quarantine paisa-cli-macos-amd64
    sudo mv paisa-cli-macos-amd64 /usr/local/bin/paisa
    paisa serve
    ```

=== "Windows"

    Download `paisa-cli-windows-amd64.exe`. In PowerShell, move it to a stable
    location and start it:

    ```powershell
    Move-Item "$HOME\Downloads\paisa-cli-windows-amd64.exe" "$HOME\paisa.exe"
    & "$HOME\paisa.exe" serve
    ```

Open [http://localhost:7500](http://localhost:7500), then continue with
[First setup](tutorial.md).

!!! note "Ledger dependency"

    Release binaries include Ledger and use it when no compatible `ledger`
    executable is available on your system. You can also install
    [Ledger](https://www.ledger-cli.org/download.html) yourself.

## Docker

Docker images are published as
[`pratapkute/paisa`](https://hub.docker.com/r/pratapkute/paisa). The default
image uses Ledger. Release tags can also include `-hledger`, `-beancount`, and
`-all` variants.

```bash
mkdir -p "$HOME/Documents/paisa"
docker run --rm -p 127.0.0.1:7500:7500 \
  -v "$HOME/Documents/paisa:/documents" \
  -w /documents \
  pratapkute/paisa:latest paisa serve --host 0.0.0.0
```

!!! warning "Back up before upgrading"

    Paisa upgrades its SQLite database when needed. Back up the mounted data
    directory before changing versions and make sure the directory is writable.
    An older Paisa build may not open a database that has already been upgraded.

## Ledger engines

Paisa bundles the `ledger` binary. If you set `ledger_cli` to `hledger` or
`beancount`, install that tool yourself and make sure it is on your `PATH`.

| Engine | Requirement |
| --- | --- |
| ledger | Bundled with Paisa; nothing to install |
| hledger | A recent hledger release (the project's CI runs 1.52.x) |
| beancount | beancount **2.x** with `bean-query` and `bean-report`: `pip install "beancount<3"` |

beancount 3 no longer ships `bean-query` and `bean-report`, which Paisa needs.
The `-hledger`, `-beancount`, and `-all` Docker tags already include compatible
versions. See [Ledger CLI](../reference/ledger-cli.md) for feature differences.

## Source builds and Dev Containers

To build from source or contribute, follow the
[contributor setup guide](../development/setup.md). For normal use, choose a
release binary or Docker image above.
