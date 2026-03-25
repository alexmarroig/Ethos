"""
Ethos Mobile - App Icon Generator
Pure Python stdlib (no PIL required)
Outputs: assets/icon.png (1024x1024) and assets/adaptive-icon.png (1024x1024 transparent)
"""
import zlib, struct, math, os

W, H = 1024, 1024

# ── Pixel buffer helpers ──────────────────────────────────────────────────────

def make_buf(w, h, channels=3):
    return bytearray(w * h * channels)

def set_px(buf, x, y, r, g, b, ch=3):
    if 0 <= x < W and 0 <= y < H:
        i = (y * W + x) * ch
        buf[i], buf[i+1], buf[i+2] = r, g, b

def set_px_rgba(buf, x, y, r, g, b, a):
    if 0 <= x < W and 0 <= y < H:
        i = (y * W + x) * 4
        buf[i], buf[i+1], buf[i+2], buf[i+3] = r, g, b, a

def blend(buf, x, y, r, g, b, alpha, ch=3):
    if 0 <= x < W and 0 <= y < H:
        i = (y * W + x) * ch
        a = alpha / 255.0
        buf[i]   = int(buf[i]   * (1-a) + r * a)
        buf[i+1] = int(buf[i+1] * (1-a) + g * a)
        buf[i+2] = int(buf[i+2] * (1-a) + b * a)

def blend_rgba(buf, x, y, r, g, b, alpha):
    if 0 <= x < W and 0 <= y < H:
        i = (y * W + x) * 4
        a = alpha / 255.0
        buf[i]   = int(buf[i]   * (1-a) + r * a)
        buf[i+1] = int(buf[i+1] * (1-a) + g * a)
        buf[i+2] = int(buf[i+2] * (1-a) + b * a)
        buf[i+3] = max(buf[i+3], alpha)

def fill_rect(buf, x, y, w, h, r, g, b, ch=3):
    for py in range(max(0,y), min(H, y+h)):
        for px in range(max(0,x), min(W, x+w)):
            set_px(buf, px, py, r, g, b, ch)

def fill_rect_rgba(buf, x, y, w, h, r, g, b, a):
    for py in range(max(0,y), min(H, y+h)):
        for px in range(max(0,x), min(W, x+w)):
            set_px_rgba(buf, px, py, r, g, b, a)

def fill_rounded_rect(buf, x, y, w, h, radius, r, g, b, ch=3):
    for py in range(max(0,y), min(H, y+h)):
        for px in range(max(0,x), min(W, x+w)):
            # distance from corners
            cx_l = x + radius
            cx_r = x + w - radius
            cy_t = y + radius
            cy_b = y + h - radius
            in_corner = False
            dist = 0.0
            if px < cx_l and py < cy_t:
                dist = math.sqrt((px-cx_l)**2 + (py-cy_t)**2)
                in_corner = True
            elif px > cx_r and py < cy_t:
                dist = math.sqrt((px-cx_r)**2 + (py-cy_t)**2)
                in_corner = True
            elif px < cx_l and py > cy_b:
                dist = math.sqrt((px-cx_l)**2 + (py-cy_b)**2)
                in_corner = True
            elif px > cx_r and py > cy_b:
                dist = math.sqrt((px-cx_r)**2 + (py-cy_b)**2)
                in_corner = True

            if in_corner:
                if dist < radius - 1:
                    set_px(buf, px, py, r, g, b, ch)
                elif dist < radius + 1:
                    alpha = int((radius + 1 - dist) * 127)
                    blend(buf, px, py, r, g, b, alpha, ch)
            else:
                set_px(buf, px, py, r, g, b, ch)

def draw_circle_region(buf, cx, cy, r_min, r_max, fr, fg, fb, soft=2, ch=3):
    for py in range(max(0, cy-r_max-soft), min(H, cy+r_max+soft)):
        for px in range(max(0, cx-r_max-soft), min(W, cx+r_max+soft)):
            d = math.sqrt((px-cx)**2 + (py-cy)**2)
            if r_min <= d <= r_max:
                alpha = 255
                if d < r_min + soft:
                    alpha = int((d - r_min) / soft * 255)
                elif d > r_max - soft:
                    alpha = int((r_max - d) / soft * 255)
                blend(buf, px, py, fr, fg, fb, alpha, ch)

def draw_filled_circle(buf, cx, cy, radius, fr, fg, fb, soft=2, ch=3):
    for py in range(max(0, cy-radius-soft), min(H, cy+radius+soft)):
        for px in range(max(0, cx-radius-soft), min(W, cx+radius+soft)):
            d = math.sqrt((px-cx)**2 + (py-cy)**2)
            if d <= radius:
                set_px(buf, px, py, fr, fg, fb, ch)
            elif d <= radius + soft:
                alpha = int((radius + soft - d) / soft * 255)
                blend(buf, px, py, fr, fg, fb, alpha, ch)

# ── PNG encoder ───────────────────────────────────────────────────────────────

def png_chunk(ctype, data):
    c = ctype + data
    return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)

def save_png_rgb(buf, path):
    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = png_chunk(b'IHDR', struct.pack('>IIBBBBB', W, H, 8, 2, 0, 0, 0))
    raw = bytearray()
    for row in range(H):
        raw.append(0)
        raw.extend(buf[row*W*3:(row+1)*W*3])
    idat = png_chunk(b'IDAT', zlib.compress(bytes(raw), 6))
    iend = png_chunk(b'IEND', b'')
    with open(path, 'wb') as f:
        f.write(sig + ihdr + idat + iend)

def save_png_rgba(buf, path):
    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = png_chunk(b'IHDR', struct.pack('>IIBBBBB', W, H, 8, 6, 0, 0, 0))  # color type 6 = RGBA
    raw = bytearray()
    for row in range(H):
        raw.append(0)
        raw.extend(buf[row*W*4:(row+1)*W*4])
    idat = png_chunk(b'IDAT', zlib.compress(bytes(raw), 6))
    iend = png_chunk(b'IEND', b'')
    with open(path, 'wb') as f:
        f.write(sig + ihdr + idat + iend)

# ── Draw icon.png ─────────────────────────────────────────────────────────────
print("Generating icon.png...")

buf = make_buf(W, H, 3)

# 1. Background #15171a
BG = (21, 23, 26)
fill_rect(buf, 0, 0, W, H, *BG)

# 2. Subtle radial glow behind circle
print("  radial glow...")
CX, CY = 512, 512
for py in range(H):
    for px in range(W):
        d = math.sqrt((px-CX)**2 + (py-CY)**2)
        if d < 500:
            intensity = max(0.0, (500 - d) / 500) ** 2.5
            g_r = int(0 + 35 * intensity)
            g_g = int(0 + 80 * intensity)
            g_b = int(0 + 100 * intensity)
            blend(buf, px, py, g_r, g_g, g_b, int(intensity * 180))

# 3. Outer decorative ring (dim teal)
print("  outer ring...")
draw_circle_region(buf, CX, CY, 450, 458, 35, 78, 95, soft=3)

# 4. Inner circle background #1c2f3a
print("  inner circle...")
draw_filled_circle(buf, CX, CY, 400, 28, 47, 58)

# 5. Bright cyan ring
print("  cyan ring...")
draw_circle_region(buf, CX, CY, 385, 400, 0, 220, 240, soft=3)

# 6. Second inner accent ring (subtle)
draw_circle_region(buf, CX, CY, 368, 372, 0, 160, 180, soft=2)

# 7. Draw the "E" letterform - bold, centered, clean
# ─ Design: tall E, vertical bar + 3 horizontal bars
# Proportions calibrated for 1024 canvas, fitting inside r=360 circle

print("  letter E...")
LX = 345   # left edge
LY = 290   # top edge
LW = 320   # total width
LH = 444   # total height
SW = 72    # stroke weight (vertical bar + bar thickness)
MID_OFFSET = 40  # middle bar shorter by this much on right

# Vertical stroke
fill_rounded_rect(buf, LX, LY, SW, LH, 22, 235, 248, 255)

# Top horizontal
fill_rounded_rect(buf, LX + SW - 4, LY, LW - SW + 4, SW, 22, 235, 248, 255)

# Middle horizontal - CYAN accent
fill_rounded_rect(buf, LX + SW - 4, LY + LH//2 - SW//2, LW - SW - MID_OFFSET + 4, SW, 0, 220, 242, 255)

# Bottom horizontal
fill_rounded_rect(buf, LX + SW - 4, LY + LH - SW, LW - SW + 4, SW, 22, 235, 248, 255)

# 8. Small dot accent below E (decorative)
draw_filled_circle(buf, CX + 20, LY + LH + 55, 10, 0, 220, 242)

# Save
os.makedirs('assets', exist_ok=True)
save_png_rgb(buf, 'assets/icon.png')
print("  OK assets/icon.png saved")

# ── Draw adaptive-icon.png (transparent bg, symbol only) ─────────────────────
print("Generating adaptive-icon.png...")

abuf = make_buf(W, H, 4)  # RGBA, starts fully transparent

# Draw the E letterform on transparent bg (for Android adaptive icon)
def fill_rounded_rect_rgba(buf, x, y, w, h, radius, r, g, b, a):
    for py in range(max(0,y), min(H, y+h)):
        for px in range(max(0,x), min(W, x+w)):
            cx_l = x + radius; cx_r = x + w - radius
            cy_t = y + radius; cy_b = y + h - radius
            in_corner = False; dist = 0.0
            if px < cx_l and py < cy_t:
                dist = math.sqrt((px-cx_l)**2 + (py-cy_t)**2); in_corner = True
            elif px > cx_r and py < cy_t:
                dist = math.sqrt((px-cx_r)**2 + (py-cy_t)**2); in_corner = True
            elif px < cx_l and py > cy_b:
                dist = math.sqrt((px-cx_l)**2 + (py-cy_b)**2); in_corner = True
            elif px > cx_r and py > cy_b:
                dist = math.sqrt((px-cx_r)**2 + (py-cy_b)**2); in_corner = True
            if in_corner:
                if dist < radius - 1:
                    set_px_rgba(buf, px, py, r, g, b, a)
                elif dist < radius + 1:
                    aa = int((radius + 1 - dist) / 2 * a)
                    set_px_rgba(buf, px, py, r, g, b, aa)
            else:
                set_px_rgba(buf, px, py, r, g, b, a)

# Vertical
fill_rounded_rect_rgba(abuf, LX, LY, SW, LH, 22, 235, 248, 255, 255)
# Top
fill_rounded_rect_rgba(abuf, LX + SW - 4, LY, LW - SW + 4, SW, 22, 235, 248, 255, 255)
# Middle (cyan)
fill_rounded_rect_rgba(abuf, LX + SW - 4, LY + LH//2 - SW//2, LW - SW - MID_OFFSET + 4, SW, 22, 0, 220, 242, 255)
# Bottom
fill_rounded_rect_rgba(abuf, LX + SW - 4, LY + LH - SW, LW - SW + 4, SW, 22, 235, 248, 255, 255)

def draw_filled_circle_rgba(buf, cx, cy, radius, r, g, b, a, soft=2):
    for py in range(max(0, cy-radius-soft), min(H, cy+radius+soft)):
        for px in range(max(0, cx-radius-soft), min(W, cx+radius+soft)):
            d = math.sqrt((px-cx)**2 + (py-cy)**2)
            if d <= radius:
                set_px_rgba(buf, px, py, r, g, b, a)
            elif d <= radius + soft:
                aa = int((radius + soft - d) / soft * a)
                set_px_rgba(buf, px, py, r, g, b, aa)

draw_filled_circle_rgba(abuf, CX + 20, LY + LH + 55, 10, 0, 220, 242, 255)

save_png_rgba(abuf, 'assets/adaptive-icon.png')
print("  OK assets/adaptive-icon.png saved")

print("\nDone! Both icons generated in assets/")
