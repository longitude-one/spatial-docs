---
title: Spatial reference systems
description: SpatialReference identity, aggregate compatibility and reference replacement without coordinate transformation in Spatial Types 1.x.
---

Every spatial value has a `Reference\SpatialReference`. It identifies the
spatial reference system (SRS) through an integer identifier and, when known,
its authority. For example, `SpatialReference::epsg(4326)` represents
`EPSG:4326`.

`getSrid()` remains available as the legacy integer view of that reference.
Use `getSpatialReference()` when the authority must be retained or compared.

## Aggregate compatibility

A geometrically valid aggregate uses the same complete spatial reference for
its members and parent. Identifier `0` is an unnamed reference, not a wildcard;
the authority also participates in reference identity.

Spatial Types retains declared references without enforcing this validity rule.
For example, the following construction succeeds but represents incompatible metadata:

```php
use LongitudeOne\SpatialTypes\Reference\SpatialReference;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\LineStringImmutable;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\PointImmutable;

$line = new LineStringImmutable([
    new PointImmutable(2.3522, 48.8566),
    new PointImmutable(2.3600, 48.8600),
], SpatialReference::epsg(4326));
```

The points retain reference `0`; the line declares `EPSG:4326`.
Use [Spatial Validator](../../spatial-validator/v1/index.md) to detect this mismatch.
Tuples supplied instead of point objects are hydrated in the aggregate's context.

## Changing a reference is not a transformation

On immutable classes, `withSpatialReference()` creates a copy and changes only its declared
reference. It does not change coordinates and therefore does not perform a
coordinate transformation. `withSrid()` is the legacy integer equivalent.

To obtain a valid value in a different SRS, calculate new coordinates with an
external transformer, then create or update a value with those coordinates and
the target `SpatialReference`.

```php
use LongitudeOne\SpatialTypes\Reference\SpatialReference;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\PointImmutable;
use LongitudeOne\SpatialTypes\Value\Coordinates;

$paris = new PointImmutable(2.3522, 48.8566, SpatialReference::epsg(4326));
$lambert93 = $paris->withSpatialReference(SpatialReference::epsg(2154));
$lambert93 = $lambert93->withCoordinates(Coordinates::xy(652469.0227, 6862035.2594));
```

The Lambert 93 ordinates in this example must be calculated by that external
transformer; this library intentionally does not provide it.

Mutable classes expose `setSpatialReference()` and `setSrid()` instead. Aggregate
setters propagate to descendants by default; passing `false` as the second
argument changes only the receiving object's declaration. Shared mutable children
are affected by propagation. Neither mode transforms coordinates.
