---
title: Spatial Decoder
description: Decode external spatial representations into SpatialInterface values.
---

Spatial Decoder converts external spatial representations into SpatialInterface values through format-specific strategies.

## Responsibilities

- Decode representations using configurable strategies.
- Keep representation parsing separate from spatial types.
- Consult upstream strategy documentation for available formats and limitations.

## Requirements and compatibility

Requirements below come from a [development Composer manifest][manifest], not a stable installation target.

| Requirement | Composer constraint |
| --- | --- |
| `php` | `^8.4` |
| `doctrine/lexer` | `^3.0.2` |
| `longitude-one/spatial-types` | `1.0.0-beta` |

These constraints describe that inspected release or snapshot. Consult the manifest for your chosen version before upgrading.

## API and usage

Use the [repository README][readme] for usage examples and entry points into the source API. A standalone API reference is not published on this site.

## Related references

- [Spatial formats](../concepts/formats.md)
- [DBMS references](../dbms/index.md)

Reference standards describe specifications, while library documentation and upstream usage material define implementation scope.

[GitHub repository][repository]

[repository]: https://github.com/longitude-one/spatial-decoder
[manifest]: https://github.com/longitude-one/spatial-decoder/blob/6c2a03bd39c7adecdabec6d7fbee2fef94495927/composer.json
[readme]: https://github.com/longitude-one/spatial-decoder/blob/6c2a03bd39c7adecdabec6d7fbee2fef94495927/README.md
