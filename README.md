# Everyday Tools

A browser-only collection of everyday image, PDF and text tools. Files are processed on your device; there is no server upload. Run locally with `npm install && npm run dev`, build with `npm run build`, and open `dist/index.html` through a static web server. The Vite project uses a relative base path for GitHub Pages project sites.

## Tool list

| Area | Tools |
| --- | --- |
| Images | Compress photo, convert JPG/PNG/WebP, resize, top-left crop, rotate/flip, images to PDF, grayscale images, watermark images |
| PDF | PDF pages to PNG/JPG, merge, split, extract, reorder, rotate, password protect (AES-256), unlock with current password, change password with current password, reorder pages, delete pages, reverse pages, duplicate a page, watermark, add page numbers, extract PDF text, change metadata |
| Text | Word/character/line counter, case changer, JSON pretty print/minify, random password generator, remove duplicate lines, URL encode/decode |

30 working tools. Password operations use qpdf compiled to WebAssembly; other PDF work uses pdf-lib and PDF.js. Multiple output files download as ZIP. A mobile-friendly responsive interface is included.

**Limits:** This is not a full PDF text editor. Editing or deleting arbitrary text while matching original fonts precisely cannot be guaranteed for PDFs, especially scanned pages, flattened files, and subset fonts. No tool on this site claims to do that. Password removal and changes require knowledge of the current password; this is not a password cracker. Existing encrypted PDFs must be unlocked first before other PDF processing. Very large files can exhaust browser memory. Conversion to JPEG discards transparency (white background). Image crop is top-left aligned, not a drag-to-select crop. Text conversions may change typography and should be reviewed. No analytics or backend is included; Google Fonts requests may occur for UI fonts.

## Test

`npm test` starts a local Vite server and uses headless Chrome to verify download outputs for core image, PDF, and password flows. It saves screenshots under `/tmp/multi-tool-tests` for visual inspection. Automated tests use a synthetic PDF and image, not user files. Additional edge cases and large-file performance need manual review before a production-grade claim.

## License

Project source is copyright Akash Vishwakarma. Third-party dependencies retain their own licenses. No license is granted for this project source unless Akash adds one.
