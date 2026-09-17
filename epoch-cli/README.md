# epoch CLI

[![build](https://github.com/databento/epoch/actions/workflows/build.yaml/badge.svg)](https://github.com/databento/epoch/actions/workflows/build.yaml)
[![license](https://img.shields.io/badge/license-Apache--2.0-blue)](../LICENSE)
[![Current Crates.io Version](https://img.shields.io/crates/v/epoch-to.svg)](https://crates.io/crates/epoch-to)

Command-line tool for converting Unix timestamps to human-readable date strings.

The Chrome extension timestamp converter lives in [`epoch-extension/`](../epoch-extension/README.md).

## Install

```sh
cargo install epoch-to
```

Pre-built binaries are attached to [GitHub releases](https://github.com/databento/epoch/releases).

## Usage

`epoch` scans text for numeric timestamps and replaces them with RFC 3339 dates.
It auto-detects **seconds**, **milliseconds**, **microseconds**, and **nanoseconds** based on magnitude.
Only values within ±8 years of the current date are converted (override with `--threshold`).

```sh
# Convert a timestamp
epoch 1678716580
# 2023-03-13T14:09:40Z

# Pipe in from anything
tail -n 1 app.log | epoch
# 2025-10-21T12:23:34Z GET /index.html 200

# Local time instead of UTC
epoch -l 1781279205910363820
# 2026-06-12T11:46:45.910363820-04:00

# Read a file, write to another
epoch -i access.log -o access.log.converted
```

**Flags**

```sh
epoch --local "1709152989"          # local timezone instead of UTC
epoch --quote "val=1709152989"      # val="2024-02-28T20:43:09Z"
epoch --threshold 20 -i archive.log # widen the detection window (years)
```

Run `epoch --help` for all options.

## Development

Requires Rust stable.

```sh
git clone https://github.com/databento/epoch.git
cd epoch/epoch-cli
cargo build
cargo test
```

Helper scripts live in `scripts/` (`format.sh`, `lint.sh`, `test.sh`, `build.sh`).

## License

Distributed under the [Apache-2.0 License](../LICENSE).
