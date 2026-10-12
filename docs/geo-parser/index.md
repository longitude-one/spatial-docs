---
title: Geo Parser
description: Parse geographic coordinate strings independently of geometry representations.
---

Geo Parser is a lexer and parser for geographic coordinate strings. Use it to read textual coordinates rather than WKT or WKB geometry representations.

## Responsibilities

- Parse decimal, degree/minute and degree/minute/second coordinate expressions.
- Read cardinal directions and coordinate pairs.
- Return parsed values or typed coordinates using the repository's documented usage.

## Requirements and compatibility

Requirements below come from the [Composer manifest][manifest] for **4.1.0**.

| Requirement | Composer constraint |
| --- | --- |
| `php` | `^8.3` |
| `doctrine/lexer` | `^3.0` |
| `longitude-one/spatial-core` | `^1.1` |

These constraints describe that inspected release or snapshot. Consult the manifest for your chosen version before upgrading.

## API and usage

Use the [repository README][readme] for usage examples and entry points into the source API. A standalone API reference is not published on this site.

## Related references

- [Coordinate reference systems](../concepts/crs.md)

Reference standards describe specifications, while library documentation and upstream usage material define implementation scope.

[GitHub repository][repository]

[repository]: https://github.com/longitude-one/geo-parser
[manifest]: https://github.com/longitude-one/geo-parser/blob/a44cb245445b2c39fce097b0b3f0f55ffdfcf1c4/composer.json
[readme]: https://github.com/longitude-one/geo-parser/blob/a44cb245445b2c39fce097b0b3f0f55ffdfcf1c4/README.md
