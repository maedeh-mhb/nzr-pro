from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

output_dir = Path(__file__).resolve().parent.parent / "public"
output_dir.mkdir(parents=True, exist_ok=True)

# Create wide screenshot
wide_path = output_dir / "screenshot-wide.png"
img = Image.new("RGB", (1440, 720), "#ffffff")
draw = ImageDraw.Draw(img)
font = ImageFont.load_default()
text = "Nazira PWA"
text2 = "Organic Soaps and Natural Skincare"
text3 = "Installable web experience"
bbox = draw.textbbox((0, 0), text, font=font)
text_w = bbox[2] - bbox[0]
draw.text(((1440 - text_w) / 2, 200), text, fill="#1f2937", font=font)
bbox2 = draw.textbbox((0, 0), text2, font=font)
text_w2 = bbox2[2] - bbox2[0]
draw.text(((1440 - text_w2) / 2, 260), text2, fill="#4b5563", font=font)
bbox3 = draw.textbbox((0, 0), text3, font=font)
text_w3 = bbox3[2] - bbox3[0]
draw.text(((1440 - text_w3) / 2, 320), text3, fill="#6b7280", font=font)
img.save(wide_path)

# Create portrait screenshot
portrait_path = output_dir / "screenshot-portrait.png"
img = Image.new("RGB", (720, 1440), "#ffffff")
draw = ImageDraw.Draw(img)
text = "Nazira PWA"
text2 = "Organic Soaps"
text3 = "Install from browser"
bbox = draw.textbbox((0, 0), text, font=font)
text_w = bbox[2] - bbox[0]
draw.text(((720 - text_w) / 2, 420), text, fill="#1f2937", font=font)
bbox2 = draw.textbbox((0, 0), text2, font=font)
text_w2 = bbox2[2] - bbox2[0]
draw.text(((720 - text_w2) / 2, 480), text2, fill="#4b5563", font=font)
bbox3 = draw.textbbox((0, 0), text3, font=font)
text_w3 = bbox3[2] - bbox3[0]
draw.text(((720 - text_w3) / 2, 540), text3, fill="#6b7280", font=font)
img.save(portrait_path)

print(f"Created {wide_path}")
print(f"Created {portrait_path}")
