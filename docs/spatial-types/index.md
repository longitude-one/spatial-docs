---
title: Spatial Types
description: PHP interfaces and classes for geometric and geographic spatial values.
---

Spatial Types supplies PHP spatial interfaces and geometric and geographic classes. Persistence belongs to Doctrine Spatial, while representation conversion
belongs to encoder and decoder components.

## Responsibilities

- Spatial value interfaces and concrete types.
- Dimension-specific geometric and geographic classes.
- Validation integration through Symfony Validator.

## Requirements and compatibility

Requirements below come from the [Composer manifest][manifest] for **1.0.0-beta** (a prerelease snapshot, not a stable installation target).

| Requirement | Composer constraint |
| --- | --- |
| `php` | `^8.4` |
| `ext-mbstring` | `*` |
| `longitude-one/geo-parser` | `^4.1` |
| `longitude-one/spatial-core` | `^1.3` |
| `doctrine/deprecations` | `^1.1.3` |
| `symfony/validator` | `^5.4 \|\| ^6.0 \|\| ^7.0 \|\| ^8.0` |

These constraints describe that inspected release or snapshot. Consult the manifest for your chosen version before upgrading.

## API and usage

Use [Instantiable spatial types][api] for the catalogue of concrete types, constructors, accessors and mutability rules.
The [repository README][readme] provides usage examples.

## Related references

- [Geometry families](../concepts/geometries.md)
- [Coordinate dimensions](../concepts/dimensions.md)
- [SQL/MM Spatial](../standards/iso/iso-iec-13249-3.md)

Reference standards describe specifications, while library documentation and upstream usage material define implementation scope.

[GitHub repository][repository]

[repository]: https://github.com/longitude-one/spatial-types
[manifest]: https://github.com/longitude-one/spatial-types/blob/ceaee5d142c77fc3922ab50c762fa6648fea0e30/composer.json
[readme]: https://github.com/longitude-one/spatial-types/blob/ceaee5d142c77fc3922ab50c762fa6648fea0e30/README.md
[api]: https://github.com/longitude-one/spatial-types/blob/ceaee5d142c77fc3922ab50c762fa6648fea0e30/docs/instantiable-spatial-types.md
