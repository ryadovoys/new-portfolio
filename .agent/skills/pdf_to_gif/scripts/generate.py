import os
import argparse
from pdf2image import convert_from_path
from PIL import Image, ImageOps, ImageDraw

def parse_args():
    parser = argparse.ArgumentParser(description="Convert PDF to animated GIF with styling options.")
    parser.add_argument("--input", required=True, help="Path to input PDF file")
    parser.add_argument("--output", default="output.gif", help="Path to output GIF file")
    parser.add_argument("--dim", default="880x1000", help="Dimensions (WxH), e.g., 880x1000")
    parser.add_argument("--margin", type=int, default=0, help="Margin around the image in pixels")
    parser.add_argument("--duration", type=float, default=0.5, help="Duration per frame in seconds")
    parser.add_argument("--radius", type=int, default=0, help="Border radius for rounded corners in pixels")
    parser.add_argument("--bg", default="#000000", help="Background color hex code")
    return parser.parse_args()

def add_corners(im, rad):
    if rad <= 0:
        return im
    
    circle = Image.new('L', (rad * 2, rad * 2), 0)
    draw = ImageDraw.Draw(circle)
    draw.ellipse((0, 0, rad * 2, rad * 2), fill=255)
    
    alpha = Image.new('L', im.size, 255)
    w, h = im.size
    
    alpha.paste(circle.crop((0, 0, rad, rad)), (0, 0))
    alpha.paste(circle.crop((0, rad, rad, rad * 2)), (0, h - rad))
    alpha.paste(circle.crop((rad, 0, rad * 2, rad)), (w - rad, 0))
    alpha.paste(circle.crop((rad, rad, rad * 2, rad * 2)), (w - rad, h - rad))
    
    im.putalpha(alpha)
    return im

def main():
    args = parse_args()
    
    # Parse dimensions
    try:
        width, height = map(int, args.dim.lower().split('x'))
    except ValueError:
        print("Error: Dimensions must be in WxH format, e.g., 880x1000")
        return

    print(f"Processing {args.input}...")
    
    if not os.path.exists(args.input):
        print(f"Error: Input file not found: {args.input}")
        return

    try:
        # Convert PDF
        images = convert_from_path(args.input, dpi=200)
        print(f"Extracted {len(images)} pages.")

        frames = []
        duration_ms = int(args.duration * 1000)

        for i, img in enumerate(images):
            # 1. Create canvas
            canvas = Image.new("RGB", (width, height), args.bg)
            
            # 2. Calculate available space for image (subtracting margins)
            avail_w = width - (2 * args.margin)
            avail_h = height - (2 * args.margin)
            
            if avail_w <= 0 or avail_h <= 0:
                print("Error: Margins are too large for the specified dimensions.")
                return

            # 3. Resize image to fit available space while maintaining aspect ratio
            img_ratio = img.width / img.height
            target_ratio = avail_w / avail_h

            if img_ratio > target_ratio:
                # limited by width
                new_w = avail_w
                new_h = int(avail_w / img_ratio)
            else:
                # limited by height
                new_h = avail_h
                new_w = int(avail_h * img_ratio)

            resized_img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
            
            # 4. Apply rounded corners if requested
            if args.radius > 0:
                resized_img = resized_img.convert("RGBA")
                resized_img = add_corners(resized_img, args.radius)

            # 5. Center image on canvas
            x_offset = args.margin + (avail_w - new_w) // 2
            y_offset = args.margin + (avail_h - new_h) // 2
            
            # Paste (using mask if rounded corners were applied)
            if args.radius > 0:
                canvas.paste(resized_img, (x_offset, y_offset), resized_img)
            else:
                canvas.paste(resized_img, (x_offset, y_offset))

            frames.append(canvas)
            print(f"Processed page {i+1}/{len(images)}")

        # Save GIF
        if frames:
            print(f"Saving GIF to {args.output}...")
            frames[0].save(
                args.output,
                save_all=True,
                append_images=frames[1:],
                duration=duration_ms,
                loop=0,
                optimize=True
            )
            print("Done!")
        else:
            print("No frames generated.")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    main()
