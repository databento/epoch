#! /usr/bin/env bash
set -e

cargo --version
cargo clippy --all-features -- --deny warnings
