# Epoch Converter

[![build](https://github.com/databento/epoch/actions/workflows/build.yaml/badge.svg)](https://github.com/databento/epoch/actions/workflows/build.yaml)
[![license](https://img.shields.io/github/license/databento/epoch?color=blue)](../LICENSE)

Chrome extension for converting Unix timestamps to human-readable date strings.
Highlight or select a timestamp on any page to see the converted value in a popup.

## Install

Install from the [Chrome Web Store](https://chromewebstore.google.com/detail/epoch-converter/jgjkjgpihkadjopfmhgcnplecagbcejg), or load an unpacked build locally (see Development).

## Development

Requires Node.js 20.19+ or 22.12+.

```sh
git clone https://github.com/databento/epoch.git
cd epoch/epoch-extension
npm install
npm run dev
```

Build a loadable extension:

```sh
npm run build
```

Then open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select the `dist/` directory.

## License

Distributed under the [Apache-2.0 License](../LICENSE).
