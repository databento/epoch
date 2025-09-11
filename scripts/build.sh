#! /usr/bin/env bash
set -e

cargo --version
echo build all
cargo build --all-features
