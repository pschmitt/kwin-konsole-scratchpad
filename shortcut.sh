#!/usr/bin/env bash

generate_file_content() {
  cat contents/code/main.js
  echo "toggleScratchpad();"
}

create_file() {
  local tmpfile
  tmpfile="$(mktemp --suffix .js)"
  generate_file_content >> "$tmpfile"
  echo "$tmpfile"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]
then
  cd "$(cd "$(dirname "$0")" >/dev/null 2>&1; pwd -P)" || exit 9

  f="$(create_file)"
  trap 'rm -f "$f"' EXIT INT
  ./run.sh "$f"
fi
