---
title: Doctrine Spatial
description: Doctrine ORM and DBAL integration for spatial values and queries.
---

Doctrine Spatial integrates spatial values and queries with Doctrine ORM and DBAL.

## Responsibilities

- Map spatial values in Doctrine entities.
- Use spatial functions in DQL.
- Consult platform-specific integration records for database behavior.

## Requirements and compatibility

Requirements below come from the [Composer manifest][manifest] for **6.0.0**.

| Requirement | Composer constraint |
| --- | --- |
| `php` | `^8.4` |
| `ext-mbstring` | `*` |
| `longitude-one/geo-parser` | `^4.0.0` |
| `longitude-one/wkt-parser` | `^3.0.1` |
| `longitude-one/wkb-parser` | `^3.0.1` |
| `doctrine/orm` | `^3.6` |

These constraints describe that inspected release or snapshot. Consult the manifest for your chosen version before upgrading.

## API and usage

The [upstream documentation](https://doctrine-spatial.readthedocs.io) covers installation, entity mapping, spatial queries and reference material.

## Related references

- [DBMS integration records](../dbms/index.md)
- [Spatial concepts](../concepts/index.md)

Reference standards describe specifications, while library documentation and upstream usage material define implementation scope.

[GitHub repository][repository]

[repository]: https://github.com/longitude-one/doctrine-spatial
[manifest]: https://github.com/longitude-one/doctrine-spatial/blob/42387d65d860b10e3a531b6b347c0e4f3025184e/composer.json
