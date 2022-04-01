{ pkgs ? import <nixpkgs> {} }:

let
  PROJECT_ROOT=builtins.toString ./.;

in pkgs.mkShell {
  packages = with pkgs; [
    nodejs-16_x
  ];

  shellHook = with pkgs; ''
    export PATH="${PROJECT_ROOT}/node_modules/.bin:$PATH"
  '';
}
