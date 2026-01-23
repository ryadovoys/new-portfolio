---
name: PDF to GIF Converter
description: Converts a PDF file into an animated GIF with customizable dimensions, margins, and styling.
---

# PDF to GIF Converter

This skill converts a multi-page PDF document into an animated GIF.
It is useful for creating slideshows or previews of documents.

## Usage

When the user asks to convert a PDF to a GIF, follow these steps:

1.  **Clarify Requirements**: Ensure you have the following information (or use defaults):
    *   **Input File**: Path to the PDF file.
    *   **Dimensions**: Width and Height (e.g., 880x1000).
    *   **Margins**: Padding around the image inside the frame (default: 0).
    *   **Duration**: Time per slide in seconds (default: 0.5).
    *   **Rounded Corners**: Radius for image corners (default: 0).

2.  **Execute Script**: Run the python script with the appropriate arguments.

```bash
python3 .agent/skills/pdf_to_gif/scripts/generate.py \
  --input "/path/to/input.pdf" \
  --output "/path/to/output.gif" \
  --dim WIDTHxHEIGHT \
  --margin MARGIN_PX \
  --duration SECONDS \
  --radius RADIUS_PX
```

## Arguments

*   `--input`: (Required) Absolute path to the source PDF.
*   `--output`: (Optional) Absolute path for the result (default: `output.gif` in current dir).
*   `--dim`: (Optional) Output dimensions in `WIDTHxHEIGHT` format (default: `880x1000`).
*   `--margin`: (Optional) Margin in pixels around the PDF page (default: `0`).
*   `--duration`: (Optional) Duration of each frame in seconds (default: `0.5`).
*   `--radius`: (Optional) Border radius for the PDF page images (default: `0`).
*   `--bg`: (Optional) Background color hex code (default: `#000000`).

## Examples

**Standard Small Card (880x1000, 0.5s)**
```bash
python3 .agent/skills/pdf_to_gif/scripts/generate.py --input "presentation.pdf" --dim 880x1000
```

**Square with Margins and Rounded Corners**
```bash
python3 .agent/skills/pdf_to_gif/scripts/generate.py \
  --input "slides.pdf" \
  --output "preview.gif" \
  --dim 500x500 \
  --margin 20 \
  --radius 10 \
  --duration 1.0
```
