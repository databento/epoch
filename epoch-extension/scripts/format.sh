#! /usr/bin/env bash
set -e

node --version
npm run format:check # fails if anything is misformatted
