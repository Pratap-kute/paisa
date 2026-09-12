{
  description = "paisa";
  # Pin the CLI and library together; chained-price rounding was fixed in 1.41.
  inputs.hledger-lib-src = {
    url = "github:hledgerorg/hledger/1.52.4";
    flake = false;
  };
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs, flake-utils, hledger-lib-src }:
    flake-utils.lib.eachSystem [ "x86_64-linux" "aarch64-linux" "aarch64-darwin" ] (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        # Hackage includes the generated help files absent from the GitHub archive.
        hledger-src = pkgs.fetchzip {
          url = "https://hackage.haskell.org/package/hledger-1.52.4/hledger-1.52.4.tar.gz";
          hash = "sha256-n8p8pY+JvF83HDQAYT+hFHcLnXL7c3D2LXMzKhRL30o=";
        };
        hledgerPackages = pkgs.haskellPackages.override {
          overrides = _: previous: {
            hledger-lib = pkgs.haskell.lib.overrideCabal previous.hledger-lib (_: {
              version = "1.52.4";
              src = "${hledger-lib-src}/hledger-lib";
              editedCabalFile = null;
            });
            hledger = pkgs.haskell.lib.overrideCabal previous.hledger (_: {
              version = "1.52.4";
              src = hledger-src;
              editedCabalFile = null;
            });
          };
        };
        hledger = { inherit (hledgerPackages) hledger; };
      in {
        devShells.default = import ./shell.nix {
          inherit pkgs;
          inherit hledger;
          unstable = pkgs;
        };
      });
}
