---
title: Spatial Encoder
description: Encode spatial interfaces into external representations through format strategies.
---

Spatial Encoder converts SpatialInterface values into external representations through format-specific strategies.

## Responsibilities

- Encode spatial values using configurable strategies.
- Keep representation-specific encoding separate from spatial types.
- Consult upstream strategy documentation for available formats and limitations.

## Requirements and compatibility

Requirements below come from the [Composer manifest][manifest] for **1.0.0-RC.0** (a prerelease snapshot, not a stable installation target).

| Requirement | Composer constraint |
| --- | --- |
| `php` | `^8.4` |
| `longitude-one/spatial-types` | `0.0.1-alpha.2` |

These constraints describe that inspected release or snapshot. Consult the manifest for your chosen version before upgrading.

## API and usage

Use the [repository README][readme] for usage examples and entry points into the source API. A standalone API reference is not published on this site.

## Related references

- [Spatial formats](../concepts/formats.md)
- [DBMS references](../dbms/index.md)

Reference standards describe specifications, while library documentation and upstream usage material define implementation scope.

[GitHub repository][repository]

[repository]: https://github.com/longitude-one/spatial-encoder
[manifest]: https://github.com/longitude-one/spatial-encoder/blob/73c55f338c64b3037006a1b6d86c00943c4a7426/composer.json
[readme]: https://github.com/longitude-one/spatial-encoder/blob/73c55f338c64b3037006a1b6d86c00943c4a7426/README.md
