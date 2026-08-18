{ pkgs ? import <nixpkgs> { }, hledger ? import <nixpkgs> { } }:

pkgs.mkShell {
  nativeBuildInputs = [
    pkgs.go
    unstable.golangci-lint
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
  ] ++ (pkgs.lib.optionals pkgs.stdenv.hostPlatform.isLinux [
    pkgs.pkg-config
  ]);

  shellHook = ''
    export CGO_ENABLED=1
    export PLAYWRIGHT_BROWSERS_PATH=${pkgs.playwright-driver.browsers}
  '';
}
