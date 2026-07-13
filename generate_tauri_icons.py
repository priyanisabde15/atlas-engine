from pathlib import Path
from PIL import Image, ImageDraw

out = Path(r"c:\Writing\Mihiran's secret\The Cartographer\apps\desktop\src-tauri\icons")
out.mkdir(parents=True, exist_ok=True)

img = Image.new("RGBA", (256, 256), (18, 31, 56, 255))
draw = ImageDraw.Draw(img)
draw.ellipse((24, 24, 232, 232), outline=(255, 255, 255, 255), width=10)
draw.line((128, 24, 128, 232), fill=(255, 255, 255, 255), width=10)
draw.line((24, 128, 232, 128), fill=(255, 255, 255, 255), width=10)
draw.rectangle((64, 64, 192, 192), outline=(255, 215, 0, 255), width=10)
draw.polygon([(128, 52), (170, 112), (128, 172), (86, 112)], fill=(255, 215, 0, 255))

img.save(out / "icon.png")
for size in [16, 24, 32, 48, 64, 128, 256]:
    img.resize((size, size), Image.Resampling.LANCZOS).save(out / f"icon-{size}x{size}.png")

img.save(out / "icon.ico", format="ICO", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
img.resize((1024, 1024), Image.Resampling.LANCZOS).save(out / "icon-1024x1024.png")

print("generated", sorted(p.name for p in out.iterdir()))
