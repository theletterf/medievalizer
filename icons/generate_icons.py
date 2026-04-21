"""
Generate the Medievalizer extension icons (PNG) using only Python stdlib.
Produces a gold fleur-de-lis / quill silhouette on a dark-brown background.

Run: python3 generate_icons.py
"""

import math
import struct
import zlib


# ── Colour helpers ────────────────────────────────────────────────────────────

BG   = (26,  15,   8)   # #1a0f08 — dark leather
GOLD = (200, 168, 75)   # #c8a84b
RED  = (139,   0,  0)   # #8b0000


def lerp(a, b, t):
    return int(a + (b - a) * t)


def mix(c1, c2, t):
    return (lerp(c1[0], c2[0], t),
            lerp(c1[1], c2[1], t),
            lerp(c1[2], c2[2], t))


# ── Icon drawing ──────────────────────────────────────────────────────────────

def draw_pixel(x, y, size):
    """Return (r, g, b) for pixel (x, y) in an icon of given size."""
    cx = size / 2.0
    cy = size / 2.0
    s  = size / 16.0          # scale factor relative to 16×16 design grid

    # Normalised coordinates centred at (0, 0)
    nx = (x - cx + 0.5) / (size / 2.0)
    ny = (y - cy + 0.5) / (size / 2.0)

    # Outer circle clip — gives a round badge
    r = math.hypot(nx, ny)
    if r > 0.97:
        return BG

    # ── Quill silhouette ──────────────────────────────────────────────────────
    # The quill is a diagonal stroke from top-right to bottom-left.
    # Main shaft: thin diagonal band
    shaft = abs(nx + ny)          # along the anti-diagonal
    tip_x, tip_y =  0.55, -0.65  # tip (top-right)
    end_x, end_y = -0.55,  0.65  # butt (bottom-left)

    # Project (nx,ny) onto the shaft line
    dx, dy  = end_x - tip_x, end_y - tip_y
    length  = math.hypot(dx, dy)
    ux, uy  = dx / length, dy / length
    proj    = (nx - tip_x) * ux + (ny - tip_y) * uy
    perp    = abs((nx - tip_x) * (-uy) + (ny - tip_y) * ux)

    in_shaft = (0.0 <= proj <= length) and (perp < 0.12)

    # Feather vane: wider teardrop shape around the top half of the shaft
    vane_width = 0.28 * max(0.0, 1.0 - proj / (length * 0.55))
    in_vane    = (0.0 <= proj < length * 0.6) and (perp < vane_width)

    # Nib: small triangular point at the tip
    in_nib = (proj < 0.0) and (perp < 0.06 * (1.0 + proj * 3))

    # Small ink drop below the nib
    ink_r = math.hypot(nx - tip_x * 0.8, ny - tip_y * 0.8)
    in_ink = ink_r < 0.07

    if in_vane or in_shaft or in_nib or in_ink:
        # Shade the feather a bit lighter at centre, darker at edge
        t = max(0.0, 1.0 - perp / max(vane_width, 0.01)) if in_vane else 0.6
        base = mix(GOLD, (240, 220, 130), t * 0.4)
        # Darken shaft slightly
        if in_shaft and not in_vane:
            base = mix(base, BG, 0.25)
        if in_ink:
            base = RED
        return base

    # ── Background glow ───────────────────────────────────────────────────────
    glow = max(0.0, 1.0 - r / 0.97)
    t    = glow * glow * 0.35
    return mix(BG, (50, 30, 12), t)


# ── PNG writer (stdlib only) ──────────────────────────────────────────────────

def make_png(size):
    rows = []
    for y in range(size):
        row = bytearray([0])  # filter byte: None
        for x in range(size):
            row.extend(draw_pixel(x, y, size))
        rows.append(bytes(row))

    raw        = b''.join(rows)
    compressed = zlib.compress(raw, 9)

    def chunk(tag, data):
        body = tag + data
        crc  = zlib.crc32(body) & 0xFFFFFFFF
        return struct.pack('>I', len(data)) + body + struct.pack('>I', crc)

    ihdr = struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)

    return (
        b'\x89PNG\r\n\x1a\n'
        + chunk(b'IHDR', ihdr)
        + chunk(b'IDAT', compressed)
        + chunk(b'IEND', b'')
    )


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == '__main__':
    import os, pathlib
    here = pathlib.Path(__file__).parent
    for size in (16, 32, 48, 128):
        path = here / f'icon{size}.png'
        path.write_bytes(make_png(size))
        print(f'  wrote {path}  ({size}×{size})')
    print('Done.')
