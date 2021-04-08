#!/usr/bin/env bash

usage() {
  echo "Usage: $(basename "$0") [SCRIPT]"
}

case "$1" in
  help|h|-h|--help)
    usage
    exit 0
    ;;
esac

cd "$(cd "$(dirname "$0")" >/dev/null 2>&1; pwd -P)" || exit 9

script="$(realpath "${1:-${PWD}/contents/code/main.js}")"

if [[ -z "$script" ]]
then
  usage >&2
  exit 2
fi

if [[ ! -r "$script" ]]
then
  {
    echo "$script does not seem to exist."
    echo "Please verify the provided path"
  } >&2
  exit 1
fi

# https://unix.stackexchange.com/a/517690/101415
num=$(dbus-send --print-reply \
        --dest=org.kde.KWin \
        /Scripting org.kde.kwin.Scripting.loadScript \
        string:"$script" | \
        awk 'END {print $2}')

if [[ -z "$num" ]]
then
  echo "Failed to determine Plasma session ID"
  exit 3
fi

dbus-send --print-reply --dest=org.kde.KWin "/${num}" \
    org.kde.kwin.Scripting.run

# vim: set ft=sh et ts=2 sw=2 :
