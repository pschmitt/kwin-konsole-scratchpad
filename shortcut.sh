#!/usr/bin/env bash

SCRIPT=contents/code/main.js
SCRIPT_MOD=.shortcut.js

patch_script() {
  # NOTE Do not use -r here to avoid escaping the parenthesis
  local content
  content="$(sed 's/^main();$/mainInteractive();/' "$SCRIPT")"

  if [[ -z "$NOCOMPRESS" ]] && command -v uglifyjs >/dev/null
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

  # Check if we are being run with -x (as in bash -x ./shortcut.sh)
  # and pass the -x along to run.sh if it the case
  if [[ "$-" =~ x ]]
  then
    # Add -x to the bash opts for run.sh
    bash_opts="-x"
    # Do not run uglifyjs over our main script
    NOCOMPRESS=1
  else
    # Don't remove the generated script if run with -x
    trap 'rm -f "$SCRIPT_MOD"' EXIT INT
  fi

  patch_script > "$SCRIPT_MOD"
  if ! bash $bash_opts ./run.sh "$SCRIPT_MOD"
  then
    notify-send \
      -u critical \
      -t 5000 \
      -a konsole-scratchpad \
      "❌ Something went wrong while executing konsole-scratchpad's run.sh"
  fi
fi
