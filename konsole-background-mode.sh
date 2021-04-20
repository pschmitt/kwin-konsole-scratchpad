#!/usr/bin/env bash

usage() {
  echo "Usage: $(basename "$0") show|hide|toggle"
}

get_caption() {
  cd "$(cd "$(dirname "$0")" >/dev/null 2>&1; pwd -P)" || exit 9
  awk "/const caption/ { print \$4; exit }" contents/code/main.js | \
    sed -nr 's/"(.+)";/\1/p'
}

konsole_is_displayed() {
  local caption
  caption="$(get_caption)"

  if [[ -z "$caption" ]]
  then
    echo "Failed to extract caption from main.js" >&2
    return 1
  fi

  # TODO Wayland support
  wmctrl -l | grep -qE "${caption}.*Konsole"
}

konsole_hide() {
  if konsole_is_displayed
  then
    konsole_toggle
  fi
}

konsole_show() {
  if ! konsole_is_displayed
  then
    konsole_toggle
  fi
}

konsole_toggle() {
  cd "$(cd "$(dirname "$0")" >/dev/null 2>&1; pwd -P)" || exit 9
  ./shortcut.sh
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]
then
  while [[ -n "$*" ]]
  do
    case "$1" in
      help|h|-h|--help)
        usage
        exit 0
        ;;
      show|display|on)
        ACTION=show
        shift
        ;;
      hide|off)
        ACTION=hide
        shift
        ;;
      toggle)
        ACTION=toggle
        shift
        ;;
      *)
        break
        ;;
    esac
  done

  case "$ACTION" in
    show|hide|toggle)
      "konsole_${ACTION}"
      ;;
    *)
      echo "Unknown action: $ACTION" >&2
      exit 1
      ;;
  esac
fi
