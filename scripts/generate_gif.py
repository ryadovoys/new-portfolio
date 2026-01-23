import os
from pdf2image import convert_from_path
from PIL import Image

# Constants
PDF_PATH = os.path.join("assets", "The Magic of Code.pdf")
OUTPUT_PATH = os.path.join("assets", "the_magic_of_code.gif")
CARD_WIDTH = 880
CARD_HEIGHT = 1000
DURATION_MS = 500  # 0.5 seconds per frame

def create_gif_from_pdf():
    print(f"Processing {PDF_PATH}...")
    
    if not os.path.exists(PDF_PATH):
        print(f"Error: File not found at {PDF_PATH}")
        return

    try:
        # Convert PDF to images
        # 200 dpi is usually sufficient for screen; adjust if needed for quality vs size
        images = convert_from_path(PDF_PATH, dpi=200)
        print(f"Extracted {len(images)} pages from PDF.")

        frames = []

        for i, img in enumerate(images):
            # Create black background
            frame = Image.new("RGB", (CARD_WIDTH, CARD_HEIGHT), (0, 0, 0))
            
            # Calculate resize dimensions to fit within CARD_SIZE while maintaining aspect ratio
            img_ratio = img.width / img.height
            target_ratio = CARD_WIDTH / CARD_HEIGHT

            if img_ratio > target_ratio:
                # Image is wider than target
                new_width = CARD_WIDTH
                new_height = int(CARD_WIDTH / img_ratio)
            else:
                # Image is taller than target
                new_height = CARD_HEIGHT
                new_width = int(CARD_HEIGHT * img_ratio)

            resized_img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
            # Center the image
            x_offset = (CARD_WIDTH - new_width) // 2
            y_offset = (CARD_HEIGHT - new_height) // 2
            
            frame.paste(resized_img, (x_offset, y_offset))
            frames.append(frame)
            print(f"Processed page {i+1}/{len(images)}")

        # Save as GIF
        if frames:
            print(f"Saving GIF to {OUTPUT_PATH}...")
            frames[0].save(
                OUTPUT_PATH,
                save_all=True,
                append_images=frames[1:],
                duration=DURATION_MS,
                loop=0,
                optimize=True
            )
            print("Done!")
        else:
            print("No frames were generated.")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    create_gif_from_pdf()
