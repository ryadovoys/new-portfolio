from PIL import Image
import os

def create_fade_gif(image_paths, output_path, fade_duration=1.0, fps=10):
    """
    Creates a GIF that crossfades between a list of images.
    Loops back to the first image.
    """
    
    frames = []
    
    # Load all images
    images = []
    for p in image_paths:
        try:
            img = Image.open(p).convert("RGB")
            images.append(img)
        except Exception as e:
            print(f"Error loading {p}: {e}")
            return

    if not images:
        print("No images loaded.")
        return

    # Ensure all images are the same size as the first one
    base_size = images[0].size
    resized_images = [img.resize(base_size, Image.Resampling.LANCZOS) for img in images]
    
    # Add first image to end to create loop
    resized_images.append(resized_images[0])
    
    # Calculate frames per transition
    frames_per_transition = int(fade_duration * fps)
    
    print(f"Generating GIF: {len(resized_images)-1} transitions, {frames_per_transition} frames each.")

    for i in range(len(resized_images) - 1):
        start_img = resized_images[i]
        end_img = resized_images[i+1]
        
        for f in range(frames_per_transition):
            alpha = f / frames_per_transition
            # Blend
            blended = Image.blend(start_img, end_img, alpha)
            frames.append(blended)
            
    # Save GIF
    if frames:
        # Delay is in milliseconds (1000ms / fps)
        duration_ms = int(1000 / fps)
        
        print(f"Saving to {output_path} with {len(frames)} frames...")
        frames[0].save(
            output_path,
            save_all=True,
            append_images=frames[1:],
            duration=duration_ms,
            loop=0,
            optimize=True
        )
        print("Done!")
    else:
        print("No frames generated.")

if __name__ == "__main__":
    image_files = [
        "assets/racetrac_1.jpg",
        "assets/racetrac_2.jpg",
        "assets/racetrac_3.jpg",
        "assets/racetrac_4.jpg"
    ]
    
    # Verify files exist
    valid_files = [f for f in image_files if os.path.exists(f)]
    
    if len(valid_files) < 2:
        print("Need at least 2 images to fade.")
    else:
        create_fade_gif(valid_files, "assets/racetrac.gif", fade_duration=1.0, fps=20)
