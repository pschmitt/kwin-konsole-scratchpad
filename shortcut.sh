#!/usr/bin/env bash

SCRIPT=contents/code/main.js
SCRIPT_MOD=.shortcut.js

patch_script() {
  # NOTE Do not use -r here to avoid escaping the parenthesis
  local content
  content="$(sed 's/^main();$/mainInteractive();/' "$SCRIPT")"

  if command -v uglifyjs >/dev/null
  then
    uglifyjs \
      --compress \
      --toplevel \
      --mangle \
      --rename \
      --no-annotations \
      <<< "$content"
  else
    echo "$content"
  fi
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]
then
  cd "$(cd "$(dirname "$0")" >/dev/null 2>&1; pwd -P)" || exit 9

  patch_script > "$SCRIPT_MOD"
  trap 'rm -f "$SCRIPT_MOD"' EXIT INT

  # Check if we are being run with -x (as in bash -x ./shortcut.sh)
  # and pass the -x along to run.sh if it the case
  [[ "$-" =~ x ]] && bash_opts="-x"
  bash $bash_opts ./run.sh "$SCRIPT_MOD"
fi
