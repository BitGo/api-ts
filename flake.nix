# Get started by following https://github.com/BitGo/bitgo-microservices/blob/develop/docs/NIX.md
{
  description = "api-ts";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs";
    flake-utils.url = "github:numtide/flake-utils";
    pre-commit-hooks.url = "github:cachix/pre-commit-hooks.nix";
    flake-compat = {
      url = "github:edolstra/flake-compat";
      flake = false;
    };
  };

  outputs = {
    self,
    nixpkgs,
    pre-commit-hooks,
    flake-utils,
    flake-compat,
  }: (
    flake-utils.lib.eachDefaultSystem
    (
      system: (
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in {
          checks = {
            pre-commit-check = pre-commit-hooks.lib.${system}.run {
              src = ./.;
              hooks = {
                alejandra.enable = true;
                prettier.enable = true;
              };
            };
          };
          devShell = pkgs.mkShell {
            name = "api-ts-shell";

            packages = with pkgs; [
              nodejs-16_x
            ];

            shellHook = ''
              ${self.checks.${system}.pre-commit-check.shellHook}
              export PATH="$(pwd)/node_modules/.bin:$PATH"
            '';
          };
        }
      )
    )
  );
}
