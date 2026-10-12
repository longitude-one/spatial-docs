---
title: Spatial Core
description: Shared technical primitives for LongitudeOne spatial libraries.
---

Spatial Core supplies shared technical primitives used by other LongitudeOne spatial libraries.

## Responsibilities

- Common enums for spatial models, geometry types and dimensions.
- Geographic axis conventions and diagnostic utilities.
- Shared exceptions for invalid primitive values.

## Requirements and compatibility

Requirements below come from the [Composer manifest][manifest] for **1.3.0**.

| Requirement | Composer constraint |
| --- | --- |
| `php` | `^8.3` |
| `ext-mbstring` | `*` |

These constraints describe that inspected release or snapshot. Consult the manifest for your chosen version before upgrading.

## API and usage

Use the [repository README][readme] for usage examples and entry points into the source API. A standalone API reference is not published on this site.

## Related references

- [Geometry primitives 1.x](./v1/geometry/index.md)
- [Spatial concepts](../concepts/index.md)

Reference standards describe specifications, while library documentation and upstream usage material define implementation scope.

[GitHub repository][repository]

[repository]: https://github.com/longitude-one/spatial-core
[manifest]: https://github.com/longitude-one/spatial-core/blob/1289582288e8954243de5ccb1f28ab7e78f4e9a4/composer.json
[readme]: https://github.com/longitude-one/spatial-core/blob/1289582288e8954243de5ccb1f28ab7e78f4e9a4/README.md
