---
title: Doctrine Spatial 6.x
description: Installation, configuration, queries and development guides for LongitudeOne Doctrine Spatial 6.x.
sidebar_label: Overview
pagination_label: Doctrine Spatial 6.x
sidebar_position: 1
---

Doctrine Spatial provides spatial types and functions for Doctrine ORM and DBAL.
The collected guides cover two-dimensional geometry and geography integration with
MySQL, MariaDB, PostgreSQL/PostGIS and SQL Server.

- [Project overview, compatibility and limitations](./project-overview.md)
- [Installation](./installation.md)
- [Configuration](./configuration.md)
- [Spatial repository queries](./repository.md)
- [Collected type and function catalogue](./glossary.md)
- [Contributing](./contributing.md)
- [Test environment](./test-environment.md)

The [historical entity mapping example](../v5/entity.md) uses Doctrine ORM annotations
and is retained with the 5.x documentation. It does not describe the ORM 3.6 mapping
syntax required by the 6.x dependency baseline.

The [Doctrine Spatial demo](https://github.com/longitude-one/doctrine-spatial-demo)
illustrates spatial queries in a complete Symfony application.

The project originated with Derek J. Lambert in 2015. Alexandre Tranchant forked it
in March 2020 after a period of inactivity.
