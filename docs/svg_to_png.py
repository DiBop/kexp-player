#!/usr/bin/env python3
"""Convert SVG to PNG using PIL + xml parsing for basic SVG shapes."""
import math
from PIL import Image, ImageDraw

SIZE = 1024
ACCENT = (233, 30, 99)
BG = (15, 15, 15)

img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

# Rounded rectangle background
def rounded_rect(draw, x0, y0, x1, y1, r, fill):
    draw.rectangle([x0+r, y0, x1-r, y1], fill=fill)
    draw.rectangle([x0, y0+r, x1, y1-r], fill=fill)
    draw.ellipse([x0, y0, x0+2*r, y0+2*r], fill=fill)
    draw.ellipse([x1-2*r, y0, x1, y0+2*r], fill=fill)
    draw.ellipse([x0, y1-2*r, x0+2*r, y1], fill=fill)
    draw.ellipse([x1-2*r, y1-2*r, x1, y1], fill=fill)

rounded_rect(draw, 0, 0, SIZE, SIZE, 180, BG + (255,))

def draw_arc(draw, cx, cy, r, start_deg, end_deg, color, width):
    """Draw an arc by compositing thick strokes."""
    bbox = [cx - r, cy - r, cx + r, cy + r]
    draw.arc(bbox, start=start_deg, end=end_deg, fill=color, width=width)

# Arcs: center at (512, 700), angles for upper sweep
# PIL arc: 0=right, 90=down, 180=left, 270=up
# We want arcs opening downward (like WiFi icon)
# Start from ~210° to ~330° in standard math = PIL 210 to 330

cx, cy = 512, 700

# Outer arc (faint)
c_outer = ACCENT + (64,)
draw_arc(draw, cx, cy, 340, 210, 330, c_outer, 68)

# Middle arc
c_mid = ACCENT + (153,)
draw_arc(draw, cx, cy, 230, 210, 330, c_mid, 68)

# Inner arc (full opacity)
c_inner = ACCENT + (255,)
draw_arc(draw, cx, cy, 120, 210, 330, c_inner, 68)

# Center dot
r_dot = 52
draw.ellipse([cx-r_dot, cy-r_dot, cx+r_dot, cy+r_dot], fill=ACCENT+(255,))

out = "/home/steven/projects/kexp-player/docs/icon-1024.png"
img.save(out)
print(f"Saved {out}")
