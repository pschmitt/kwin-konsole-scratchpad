#!/usr/bin/env bash

usage() {
  echo "Usage: $(basename "$0") show|hide"
}

konsole_is_displayed() {
  # TODO Wayland support
  wmctrl -l | grep -qE "scratchpad.*Konsole"
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
      *)
        break
        ;;
    esac
  done

  case "$ACTION" in
    show|hide)
      "konsole_${ACTION}"
      ;;
    *)
      echo "Unknown action: $ACTION" >&2
      return 1
      ;;
  esac
fi
