#!/usr/bin/env bash

cd "$(cd "$(dirname "$0")" >/dev/null 2>&1; pwd -P)" || exit 9

set_clipboard() {
  if command -v xcp >/dev/null
  then
    xcp
  elif command -v xsel >/dev/null
  then
    xsel -b -i
  fi
}

case "$1" in
  -v|--verbose|v|verb|verbose|-vv)
    VERBOSE=1
    shift
    ;;
esac

SCRIPT=./contents/code/main.js
CONTENT="$(sed 's/^main();$/mainInteractive();/' "$SCRIPT" | \
  sed 's/debug = false/debug = true/')"

if [[ -n "$VERBOSE" ]]
then
  # shellcheck disable=2001
  CONTENT="$(sed 's/verbose = false/verbose = true/' <<< "$CONTENT")"
fi

set_clipboard <<< "$CONTENT"

./kwin-console.sh
