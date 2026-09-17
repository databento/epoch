#! /usr/bin/env bash
set -e

# CI runs this inside a Docker RUN layer, where nvm's node isn't on PATH yet.
# Outside CI, fall through to whatever node is already installed.
NVM_SH="${NVM_DIR:-$HOME/.nvm}/nvm.sh"
if [ -s "$NVM_SH" ]; then
  # shellcheck disable=SC1090
  source "$NVM_SH"
  nvm install
fi

node --version
npm ci
npm run build
