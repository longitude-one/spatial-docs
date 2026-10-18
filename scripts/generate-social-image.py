"""Generate the default geometric sharing card without external dependencies."""
import math
import pathlib
import struct
import zlib

width, height = 1200, 630
points = [(260, 410), (570, 190), (940, 380)]
pixels = bytearray()
for y in range(height):
    pixels.append(0)
    for x in range(width):
        color = (16 + y // 70, 32 + x // 100, 57 + y // 35)
        # A faint coordinate grid and a connected spatial geometry.
        if x % 60 == 0 or y % 60 == 0:
            color = (31, 57, 82)
        for (ax, ay), (bx, by) in zip(points, points[1:] + points[:1]):
            fraction = max(0, min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2)))
            if math.hypot(x - ax - fraction * (bx - ax), y - ay - fraction * (by - ay)) < 5:
                color = (91, 201, 216)
        for px, py in points:
            distance = math.hypot(x - px, y - py)
            if distance < 27:
                color = (235, 249, 252) if distance < 13 else (41, 165, 189)
        pixels.extend(color)

def chunk(name, data):
    return struct.pack('!I', len(data)) + name + data + struct.pack('!I', zlib.crc32(name + data))

output = pathlib.Path(__file__).resolve().parent.parent / 'static/assets/images/social-card.png'
output.write_bytes(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('!2I5B', width, height, 8, 2, 0, 0, 0))
                   + chunk(b'IDAT', zlib.compress(pixels, 9)) + chunk(b'IEND', b''))
