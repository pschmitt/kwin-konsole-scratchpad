#!/usr/bin/env bash

SCRIPT=contents/code/main.js
SCRIPT_MOD=.shortcut.js

usage() {
  echo "Usage: $(basename "$0") [ACTION] [OPTION…]"
  echo
  echo "Actions:"
  echo "  show          Display Konsole Scratchpad"
  echo "  hide          Hide Konsole Scratchpad"
  echo "  toggle        Toggle Konsole Scratchpad (default)"
  echo
  echo "Options:"
  echo "  --help        Display this message"
  echo "  -d, --debug   Debug mode"
  echo "  -c CAPTION    Caption (window/tab title) of the Konsole window"
  echo "  -p POSITION   Set scratchpad position (top, bottom or center)"
  echo "  -o OFFSET     Offset in pixels "
  echo "  -w WIDTH      Relative width (eg: 1.0 for 100% of the screen)"
  echo "  -h HEIGHT     Relative height (eg: 0.6 for 60% of the screen)"
}

patch_global_var() {
  local var="$1"
  local value="$2"

  sed -r \
    "s/^const ${var} = (\"?)[^\";]+(\"?);/const ${var} = \1${value}\2;/" \
      <<< "$3"
}

patch_global_vars() {
  local content="$1"
  local var var_upper value js_var

  for var in resource_name caption position offset width height
  do
    var_upper="${var^^}"  # CAPTION POSITION...
    value="${!var_upper}"

    if [[ -n "$value" ]]
    then
      js_var="$var"

      # map width/height to scratchpadRelative{Width,Height}
      case "$var" in
        resource_name)
          js_var=resourceName
          ;;
      esac

      content="$(patch_global_var "$js_var" "$value" "$content")"
    fi
  done

  echo "$content"
}

patch_script() {
  # NOTE Do not use -r here to avoid escaping the parenthesis
  local content

  # Call mainInteractive instead of main
  content="$(sed 's/^main();$/mainInteractive();/' "$SCRIPT")"

  # Patch JS with user-provided values
  content="$(patch_global_vars "$content")"

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

get_caption() {
  cd "$(cd "$(dirname "$0")" >/dev/null 2>&1; pwd -P)" || exit 9

  awk "/const caption/ { print \$4; exit }" "$SCRIPT" | \
    sed -nr 's/"(.+)";/\1/p'
}

konsole_is_displayed() {
  local caption
  caption="${CAPTION:-$(get_caption)}"

  if [[ -z "$caption" ]]
  then
    echo "Failed to extract caption from main.js" >&2
    return 1
  fi

  # TODO Wayland support
  wmctrl -l | grep -qE "${caption}.*Konsole"
}

force_focus_scratchpad() {
  if [[ "$XDG_SESSION_TYPE" != "x11" ]]
  then
    echo "Force focussing on scratchpad in not yet supported on Wayland" >&2
    return
  fi

  echo -n "Waiting for Konsole window to appear..."
  local counter=0

  while ! konsole_is_displayed
  do
    if [[ "$counter" -gt 25 ]]
    then
      echo "Timed out." >&2
      return 3
    fi

    sleep 0.1
    (( counter += 1 ))
  done
  echo " Done."

  # Focus scatchpad window
  wmctrl -R "$CAPTION"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]
then
  cd "$(cd "$(dirname "$0")" >/dev/null 2>&1; pwd -P)" || exit 9

  [[ "$-" =~ x ]] && DEBUG=1

  # Default action
  ACTION=toggle

  while [[ -n "$*" ]]
  do
    # shellcheck disable=2034
    case "$1" in
      --help)
        usage
        exit
        ;;
      -d|--debug|-x)
        DEBUG=1
        shift
        ;;
      -r|--resource-name)
        RESOURCE_NAME="$2"
        shift 2
        ;;
      -c|--caption)
        CAPTION="$2"
        shift 2
        ;;
      -p|--position)
        POSITION="$2"
        shift 2
        ;;
      -o|--offset)
        OFFSET="$2"
        shift 2
        ;;
      -w|--width)
        # Convert 80% to 0.80 etc.
        if [[ "$2" =~ %$ ]]
        then
          WIDTH="$(awk -v num="${2//%}" 'BEGIN { print(int(num) / 100.0) }')"
        else
          WIDTH="$2"
        fi
        shift 2
        ;;
      -h|--height)
        if [[ "$2" =~ %$ ]]
        then
          HEIGHT="$(awk -v num="${2//%}" 'BEGIN { print(int(num) / 100.0) }')"
        else
          HEIGHT="$2"
        fi
        shift 2
        ;;
      show|s|on)
        ACTION=show
        shift
        ;;
      hide|h|off)
        ACTION=hide
        shift
        ;;
      toggle|t)
        ACTION=toggle
        shift
        ;;
      *)
        break
        ;;
    esac
  done

  # Check if we are being run with -x (as in bash -x ./shortcut.sh)
  # and pass the -x along to kwinscript-run.sh if it the case
  if [[ -n "$DEBUG" ]]
  then
    echo "🐛 DEBUG MODE" >&2
    set -x
    # Add -x to the bash opts for kwinscript-run.sh
    bash_opts="-x"
    # Only compress the script if COMPRESS is explicitly set
    # shellcheck disable=2153
    if [[ -n "$COMPRESS" ]]
    then
      # Do not run uglifyjs over our main script
      NOCOMPRESS=1
    fi
  else
    # Only remove the patched script if not in debug mode
    trap 'rm -f "$SCRIPT_MOD"' EXIT INT
  fi

  # Make sure caption is defined. This will avoid parsing the JS file multiple
  # times (when waiting for window to appear for eg)
  if [[ -z "$CAPTION" ]]
  then
    CAPTION="$(get_caption)"
  fi

  konsole_is_displayed && konsole_displayed=1

  case "$ACTION" in
    show)
      if [[ -n "$konsole_displayed" ]]
      then
        force_focus_scratchpad
        exit
      fi
      ;;
    hide)
      [[ -z "$konsole_displayed" ]] && exit
      ;;
  esac

  patch_script > "$SCRIPT_MOD"
  if bash $bash_opts ./kwinscript-run.sh "$SCRIPT_MOD"
  then
    # For some reason the scratchpad Konsole does not always get the focus,
    # despite explicitely setting the active client in main.js
    # -> try focussing the scratchpad window with wmctrl
    # TODO Wayland support
    [[ -z "$konsole_displayed" ]] && force_focus_scratchpad
  else
    notify-send \
      -u critical \
      -t 5000 \
      -a konsole-scratchpad \
      "❌ Something went wrong while executing konsole-scratchpad's $0"
  fi
fi
