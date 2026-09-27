# Everyday Tools

A browser-only collection of everyday image, PDF, file and text tools. Files are processed on your device; there is no server upload. Run locally with `npm install && npm run dev`, build with `npm run build`, and open `dist/index.html` through a static web server. The Vite project uses a relative base path for GitHub Pages project sites.

## Tool list

| Area | Tools |
| --- | --- |
| Images | Compress photo, convert JPG/PNG/WebP, resize, top-left crop, rotate/flip, images to PDF, grayscale images, watermark images |
| PDF | PDF pages to PNG/JPG, merge, split, extract, reorder, rotate, password protect (AES-256), unlock with current password, change password with current password, delete pages, reverse pages, duplicate a page, watermark, add page numbers, extract PDF text, change metadata |
| Text | Word/character/line counter, case changer, JSON pretty print/minify, random password generator, remove duplicate lines, URL encode/decode, natural line sorting, reverse lines, find/replace, whitespace cleanup, safe HTML escape, UTF-8 Base64, heading-only Markdown to HTML, SHA-256/SHA-512 text hash |
| Files | SHA-256/SHA-512 file hash, size report, batch sequential rename to ZIP, create ZIP, safely repack ZIP, small file to data URL |
| Utilities | UUID v4, UTC/Unix timestamps, HEX to RGB/HSL, proportional dimensions |

48 working tools. The UI and processing libraries are split into separate bundles, so the catalog loads without the large PDF engine. Password operations use qpdf compiled to WebAssembly; other PDF work uses pdf-lib and PDF.js. Multiple output files download as ZIP. A mobile-friendly responsive interface, touch targets and visible keyboard focus are included.

**Limits:** This is not a full PDF text editor. Editing or deleting arbitrary text while matching original fonts precisely cannot be guaranteed for PDFs, especially scanned pages, flattened files, and subset fonts. No tool on this site claims to do that. Password removal and changes require knowledge of the current password; this is not a password cracker. Existing encrypted PDFs must be unlocked first before other PDF processing. Very large files can exhaust browser memory. Conversion to JPEG discards transparency (white background). Image crop is top-left aligned, not a drag-to-select crop. ZIP extraction repacks safe basenames in a new ZIP (not separate downloads), stripping paths from the input. The Markdown tool supports only headings and paragraphs, not full Markdown syntax. Data URLs are limited to 1 MB. The timestamp tool interprets a date-time without timezone as the device's local time. Text conversions may change typography and should be reviewed. No analytics or backend is included; Google Fonts requests may occur for UI fonts.

## Test

`npm test` starts a local Vite server and uses headless Chrome to verify download outputs for core image, PDF, and password flows. It saves screenshots under `/tmp/multi-tool-tests` for visual inspection. Automated tests use a synthetic PDF and image, not user files. Additional edge cases and large-file performance need manual review before a production-grade claim.

## License

Project source is copyright Akash Vishwakarma. Third-party dependencies retain their own licenses. No license is granted for this project source unless Akash adds one.
