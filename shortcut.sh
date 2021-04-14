#!/usr/bin/env bash

SCRIPT=contents/code/main.js
SCRIPT_MOD=.shortcut.js

patch_script() {
  # NOTE Do not use -r here to avoid escaping the parenthesis
  sed \
    's/^main();$/mainInteractive();/' \
    "$SCRIPT"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]
then
  cd "$(cd "$(dirname "$0")" >/dev/null 2>&1; pwd -P)" || exit 9

  patch_script > "$SCRIPT_MOD"
  trap 'rm -f "$SCRIPT_MOD"' EXIT INT

  ./run.sh "$SCRIPT_MOD"
fi
