---
title: WKT Parser
description: Lexer and parser for WKT and EWKT spatial strings.
---

WKT Parser reads Well-Known Text and Extended Well-Known Text spatial strings.

## Responsibilities

- Lexer and parser for textual spatial representations.
- Return parsed type, value, SRID and dimension information.
- Reuse a parser when processing multiple inputs.

## Requirements and compatibility

Requirements below come from the [Composer manifest][manifest] for **3.0.1**.

| Requirement | Composer constraint |
| --- | --- |
| `php` | `^8.1` |
| `doctrine/lexer` | `^2.1\|^3.0` |

These constraints describe that inspected release or snapshot. Consult the manifest for your chosen version before upgrading.

## API and usage

Use the [repository README][readme] for usage examples and entry points into the source API. A standalone API reference is not published on this site.

## Related references

- [Spatial formats](../concepts/formats.md)
- [OGC Simple Feature Access](../standards/ogc/ogc-06-103r4.md)
- [SQL/MM Spatial](../standards/iso/iso-iec-13249-3.md)

Reference standards describe specifications, while library documentation and upstream usage material define implementation scope.

[GitHub repository][repository]

[repository]: https://github.com/longitude-one/wkt-parser
[manifest]: https://github.com/longitude-one/wkt-parser/blob/5041030874404f9b0ac708001310ba98e3571854/composer.json
[readme]: https://github.com/longitude-one/wkt-parser/blob/5041030874404f9b0ac708001310ba98e3571854/README.md
