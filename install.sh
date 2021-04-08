#!/usr/bin/env bash

cd "$(cd "$(dirname "$0")" >/dev/null 2>&1; pwd -P)" || exit 9

./uninstall.sh
plasmapkg2 --type kwinscript -i .

mkdir -p ~/.local/share/kservices5
ln -sfv "${PWD}/metadata.desktop" \
  ~/.local/share/kservices5/konsole-scratchpad.desktop
