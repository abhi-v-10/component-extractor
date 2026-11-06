#!/usr/bin/env python3
"""
Generates crisp, branded PNG icons for the Component Extractor extension.
Draws a stylized component selection frame with bounding box and brackets.
"""

import zlib, struct, os, math

def generate_icon(size, out_path):
    raw = bytearray()
    
    # Palette
    # Primary: Modern Indigo/Violet gradient #6366F1 to #8B5CF6
    # Accent: Cyan #06B6D4
    # Frame/Corners: White / High contrast
    
    scale = size / 128.0
    corner_pad = int(12 * scale)
    box_l = int(18 * scale)
    box_r = size - 1 - box_l
    box_t = int(18 * scale)
    box_b = size - 1 - box_t
    corner_len = int(16 * scale)
    border_w = max(1, int(4 * scale))
    handle_size = max(2, int(6 * scale))

    for y in range(size):
        raw.append(0) # Filter byte: None
        for x in range(size):
            # Normalized coordinates (-1 to 1)
            nx = (x - size / 2) / (size / 2)
            ny = (y - size / 2) / (size / 2)
            dist = math.sqrt(nx * nx + ny * ny)

            # Background: Rounded rectangle squircle with gradient
            # Check if within squircle: |nx|^4 + |ny|^4 <= 1.05
            in_bg = (abs(nx)**3.5 + abs(ny)**3.5) <= 0.88
            
            if in_bg:
                # Gradient from top-left (#4F46E5) to bottom-right (#7C3AED)
                t = (x + y) / (2.0 * size)
                r_base = int(79 * (1 - t) + 124 * t)
                g_base = int(70 * (1 - t) + 58 * t)
                b_base = int(229 * (1 - t) + 237 * t)
                
                # Check bounding box borders (dashed/framed look)
                is_box_border = False
                # Top / Bottom edges
                if (abs(y - box_t) < border_w or abs(y - box_b) < border_w) and (box_l <= x <= box_r):
                    is_box_border = True
                # Left / Right edges
                if (abs(x - box_l) < border_w or abs(x - box_r) < border_w) and (box_t <= y <= box_b):
                    is_box_border = True

                # Corner selection handles (4 white squares at corners)
                is_handle = False
                for cx in (box_l, box_r):
                    for cy in (box_t, box_b):
                        if abs(x - cx) <= handle_size and abs(y - cy) <= handle_size:
                            is_handle = True

                # Center symbol: `< / >` code symbol in cyan (#38BDF8)
                is_code = False
                cy_mid = size / 2
                cx_mid = size / 2
                
                # Left bracket `<`
                bracket_w = 14 * scale
                bracket_h = 24 * scale
                # check if near <
                dx_l = x - (cx_mid - 14 * scale)
                dy_l = abs(y - cy_mid)
                if abs(dx_l + dy_l * 0.7 - bracket_w * 0.4) < (2.5 * scale) and dy_l <= bracket_h:
                    is_code = True
                
                # Right bracket `>`
                dx_r = (cx_mid + 14 * scale) - x
                dy_r = abs(y - cy_mid)
                if abs(dx_r + dy_r * 0.7 - bracket_w * 0.4) < (2.5 * scale) and dy_r <= bracket_h:
                    is_code = True

                # Slash `/`
                dx_s = (x - cx_mid) + (y - cy_mid) * 0.45
                if abs(dx_s) < (2.2 * scale) and abs(y - cy_mid) <= (bracket_h * 1.1):
                    is_code = True

                if is_handle:
                    r, g, b, a = 255, 255, 255, 255
                elif is_code and size >= 32:
                    r, g, b, a = 56, 189, 248, 255
                elif is_box_border:
                    r, g, b, a = 199, 210, 254, 230
                else:
                    r, g, b, a = r_base, g_base, b_base, 255
            else:
                r, g, b, a = 0, 0, 0, 0

            raw.extend([r, g, b, a])

    # PNG format assembly
    png = bytearray(b'\x89PNG\r\n\x1a\n')
    ihdr_data = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    ihdr_crc = struct.pack('>I', zlib.crc32(b'IHDR' + ihdr_data) & 0xffffffff)
    png.extend(struct.pack('>I', len(ihdr_data)) + b'IHDR' + ihdr_data + ihdr_crc)

    compressed = zlib.compress(bytes(raw), 9)
    idat_crc = struct.pack('>I', zlib.crc32(b'IDAT' + compressed) & 0xffffffff)
    png.extend(struct.pack('>I', len(compressed)) + b'IDAT' + compressed + idat_crc)

    iend_crc = struct.pack('>I', zlib.crc32(b'IEND') & 0xffffffff)
    png.extend(struct.pack('>I', 0) + b'IEND' + iend_crc)

    with open(out_path, 'wb') as f:
        f.write(png)
    print(f"Generated icon {size}x{size} -> {out_path}")

sizes = [16, 32, 48, 128]
out_dir = os.path.join(os.path.dirname(__file__), '..', 'component-extractor', 'icons')
os.makedirs(out_dir, exist_ok=True)
for s in sizes:
    generate_icon(s, os.path.join(out_dir, f'icon{s}.png'))
