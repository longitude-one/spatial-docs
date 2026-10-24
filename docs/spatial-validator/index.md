---
title: Spatial Validator
description: Validate LongitudeOne spatial objects explicitly with Symfony constraints and localized diagnostics.
---

Spatial Validator checks the geometry of LongitudeOne spatial objects through Symfony Validator.
Use it when accepting a route, parcel boundary or collection of positions in an application.
Constructing a spatial object and checking its geometric validity are separate operations.

The [1.x documentation](./v1/index.md) targets `1.0.0-RC.0`. It describes the delivered validation contracts and their coverage limits;
it does not announce a released RC or claim general SQL/MM conformity.

- [Start with Symfony validation](./v1/symfony-validation.md).
- [Choose validity, simplicity or closure](./v1/curves-and-surfaces.md).
- [Understand supported types and rules](./v1/coverage-and-rules.md).
- [Interpret errors and warnings](./v1/diagnostics-and-composition.md).

`spatial-types` owns the object model; `spatial-validator` performs explicit functional validation.
Validation does not parse serialized geometry, repair shapes, move coordinates, reorient rings or reproject a coordinate reference system.
