#!/usr/bin/env bash
#
# Decide the base path the bundle should be built with.
#
# GitHub Pages serves two different shapes of site and getting this wrong breaks
# every asset URL:
#
#   <owner>.github.io          -> served from the domain root, base "/"
#   <owner>.github.io/<repo>/  -> served from a subpath, base "/<repo>/"
#
# A repository literally named "<owner>.github.io" is the first kind. Everything
# else is the second. The BASE_PATH_OVERRIDE repository variable wins when set,
# which is what a custom domain (CNAME) needs since that also serves from root.
set -euo pipefail

repo="${GITHUB_REPOSITORY##*/}"

if [[ -n "${BASE_PATH_OVERRIDE:-}" ]]; then
  base="$BASE_PATH_OVERRIDE"
  reason="BASE_PATH_OVERRIDE repository variable"
elif [[ "$repo" == *.github.io ]]; then
  base="/"
  reason="user/organisation Pages site served from the domain root"
else
  base="$repo"
  reason="project Pages site served from a repository subpath"
fi

echo "path=$base" >>"$GITHUB_OUTPUT"
echo "Base path: $base ($reason)"
