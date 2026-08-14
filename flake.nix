{
  description = "paisa";
  # Pin hldeger to 1.32.x; 1.40 has a bug related to chained price calculation
  # https://github.com/simonmichael/hledger/issues/2254
  inputs.hledger-pkgs.url =
    "github:NixOS/nixpkgs/ebe4301cbd8f81c4f8d3244b3632338bbeb6d49c";
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs, flake-utils, hledger-pkgs }:
    flake-utils.lib.eachSystem [ "x86_64-linux" "aarch64-linux" "aarch64-darwin" ] (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        hledger = hledger-pkgs.legacyPackages.${system};
      in {
        devShells.default = import ./shell.nix {
          inherit pkgs;
          inherit hledger;
        };
      });
}
