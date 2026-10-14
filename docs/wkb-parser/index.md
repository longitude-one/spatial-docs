---
title: WKB Parser
description: Parse WKB and PostGIS EWKB spatial representations.
---

WKB Parser reads Well-Known Binary and PostGIS Extended Well-Known Binary spatial data.

## Responsibilities

- Parse spatial binary data and hexadecimal input.
- Return parsed spatial representation data.
- Keep binary parsing separate from Doctrine persistence.

## Requirements and compatibility

Requirements below come from the [Composer manifest][manifest] for **3.0.1**.

| Requirement | Composer constraint |
| --- | --- |
| `php` | `^8.1` |

These constraints describe that inspected release or snapshot. Consult the manifest for your chosen version before upgrading.

## API and usage

Use the [repository README][readme] for usage examples and entry points into the source API. A standalone API reference is not published on this site.

## Related references

- [Spatial formats](../concepts/formats.md)
- [OGC Simple Feature Access](../standards/ogc/ogc-06-103r4.md)
- [SQL/MM Spatial](../standards/iso/iso-iec-13249-3.md)

Reference standards describe specifications, while library documentation and upstream usage material define implementation scope.

[GitHub repository][repository]

[repository]: https://github.com/longitude-one/wkb-parser
[manifest]: https://github.com/longitude-one/wkb-parser/blob/86bfca8ec4e94190f5107c0dbb1b98f7ea27a2ae/composer.json
[readme]: https://github.com/longitude-one/wkb-parser/blob/86bfca8ec4e94190f5107c0dbb1b98f7ea27a2ae/README.md
