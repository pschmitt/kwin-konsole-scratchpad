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

# Unload previous scripts
unload_counter=0
while [[ "$(qdbus \
  org.kde.KWin \
  /Scripting \
  org.kde.kwin.Scripting.unloadScript \
  "$script")" == "true" ]]
do
  (( unload_counter++ ))
done

echo "Unloaded $unload_counter previous version(s)" >&2

# https://unix.stackexchange.com/a/517690/101415
kwin_id=$(qdbus \
  org.kde.KWin \
  /Scripting org.kde.kwin.Scripting.loadScript \
  "$script")

if [[ -z "$kwin_id" ]]
then
  echo "Failed to determine KWin script ID"
  exit 3
fi

qdbus org.kde.KWin "/${kwin_id}" org.kde.kwin.Scripting.run

# vim: set ft=sh et ts=2 sw=2 :
