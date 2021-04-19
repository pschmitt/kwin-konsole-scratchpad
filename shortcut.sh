#!/usr/bin/env bash

SCRIPT=contents/code/main.js
SCRIPT_MOD=.shortcut.js

usage() {
  echo "Usage: $(basename "$0") [OPTION…]"
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

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]
then
  cd "$(cd "$(dirname "$0")" >/dev/null 2>&1; pwd -P)" || exit 9

  [[ "$-" =~ x ]] && DEBUG=1

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
        WIDTH="$2"
        shift 2
        ;;
      -h|--height)
        HEIGHT="$2"
        shift 2
        ;;
      *)
        break
        ;;
    esac
  done

  # Check if we are being run with -x (as in bash -x ./shortcut.sh)
  # and pass the -x along to run.sh if it the case
  if [[ -n "$DEBUG" ]]
  then
    echo "🐛 DEBUG MODE" >&2
    set -x
    # Add -x to the bash opts for run.sh
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
