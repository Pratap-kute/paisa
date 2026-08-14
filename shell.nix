{ pkgs ? import <nixpkgs> { }, hledger ? import <nixpkgs> { } }:

pkgs.mkShell {
  nativeBuildInputs = [
    pkgs.go
    pkgs.golangci-lint
    pkgs.gotools
    pkgs.gopls
    pkgs.sqlite
    pkgs.libuuid
    pkgs.deno
    pkgs.playwright-driver
    # pkgs.pkgsCross.mingwW64.buildPackages.gcc

    pkgs.python312Packages.mkdocs-material
    pkgs.python312Packages.beancount_2

    # test
    pkgs.ledger
    hledger.hledger
  ] ++ (pkgs.lib.optional pkgs.stdenv.hostPlatform.isLinux pkgs.wails);

  shellHook = ''
    export CGO_ENABLED=1
    export PLAYWRIGHT_BROWSERS_PATH=${pkgs.playwright-driver.browsers}
  '';

  env = { LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath [ pkgs.libuuid ]; };
}
