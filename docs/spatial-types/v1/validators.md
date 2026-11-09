---
title: Structural and geometric validation
description: Understand the structural guarantees of Spatial Types and the geometric checks performed explicitly by Spatial Validator.
---

`longitude-one/spatial-types` checks that a spatial object's structure can be
represented safely in PHP. `longitude-one/spatial-validator` checks whether that
representation describes a valid geometry. Creating an object successfully does
not mean that its geometry is valid.

## What Spatial Types checks

Spatial Types enforces the expected component types, supported coordinate layouts,
and mutable or immutable ownership rules. These checks protect the object model;
they do not determine whether points form a valid line, triangle, or surface.

For example, an immutable LineString cannot contain mutable Points:

```php
use LongitudeOne\SpatialTypes\Types\Dimension2\Point;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\LineStringImmutable;

$pointA = new Point(0, 0);
$pointB = new Point(1, 1);

// Rejected during construction: the supplied points are mutable.
$line = new LineStringImmutable([$pointA, $pointB]);
```

This is a structural error: changing either point later would silently change a
supposedly immutable line. Supply `PointImmutable` objects or coordinate arrays
instead. Whether the resulting line is geometrically valid is a separate question.

## What Spatial Validator checks

Spatial Validator inspects an existing object through Symfony constraints. Its
`Spatial` constraint selects the validator for the declared spatial type. Checks
include point coordinates, ring closure, triangle geometry, component reference
compatibility, and topology where supported. Optional properties such as line
simplicity require additional constraints.

Validation reports violations without repairing the geometry or transforming its
coordinates. Supported checks depend on the type, dimension, and Geometry or
Geography family; unavailable checks produce warnings.

All three examples below are **structurally valid representations accepted by
Spatial Types, but geometrically invalid**. Red outlines and explicit ERROR labels
identify the geometric problem; red does not mean construction is rejected.

### A triangle with an open boundary

```php
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\TriangleImmutable;

$triangle = new TriangleImmutable([
    [[0, 0], [4, 0], [0, 3]],
]);
```

Spatial Types accepts this representation: it contains coordinate pairs from
which immutable points and a boundary can be built. It does not close the boundary
or check that it describes a valid triangle.

Spatial Validator's triangle rules require a non-empty triangle to have three
distinct vertices and a closed exterior boundary with four positions:
A → B → C → A. Here, the final `[0, 0]` is missing. Geometric validation must
report the open boundary and incorrect position count. Adding that final position
would give this example a valid triangular boundary.

![Open A–B–C boundary: structurally accepted, geometrically invalid because the return to A is missing.](../../assets/images/spatial-types/validation/open-triangle.svg)

### A triangle with four distinct vertices

```php
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\TriangleImmutable;

$triangle = new TriangleImmutable([
    [[0, 0], [4, 0], [4, 3], [0, 3], [0, 0]],
]);
```

This example has **four distinct vertices**, A, B, C, and D, plus a repeated A
to close the boundary: five stored positions in total. A valid triangular boundary
has three distinct vertices and four stored positions, including closure.

Spatial Types accepts this structure without checking the vertex count. The shape
is a rectangle declared as a Triangle: it is **structurally valid but geometrically
invalid for its declared type**. Spatial Validator's triangle rules must report
the incorrect exterior position count, even though the boundary is closed.

![Closed A–B–C–D–A rectangle stored as a Triangle: structurally accepted, geometrically invalid with four distinct vertices.](../../assets/images/spatial-types/validation/four-vertex-triangle.svg)

### A collection with different SRIDs

```php
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\GeometryCollectionImmutable;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\PointImmutable;

$collection = new GeometryCollectionImmutable(4326, [
    new PointImmutable(2, 48, 4326),
    new PointImmutable(700000, 6600000, 2154),
]);
```

Spatial Types retains the declared references: the collection and first point
use SRID `4326`, while the second point uses `2154`. All components are immutable
spatial objects, so the representation can be constructed.

Spatial Validator checks that each component has the same spatial reference as
its parent. It must report the second point's incompatible reference. This check
compares the complete reference, including its authority when present, rather
than only the integer SRID. Validation does not reproject the point; correcting
the mismatch requires coordinates expressed in the intended reference.

This collection is **structurally valid but geometrically invalid because its
component references are incompatible**. The illustration uses separate cards:
the two coordinate pairs must not be plotted as though they shared one reference.

![Collection with SRID 4326 containing points in SRIDs 4326 and 2154: structurally accepted, geometrically invalid reference mismatch.](../../assets/images/spatial-types/validation/mixed-srid-collection.svg)

## Apply validation explicitly

Install `longitude-one/spatial-validator` with a version compatible with your
Spatial Types API, then use its Symfony constraints under
`LongitudeOne\SpatialValidator\Validator\Constraints`.
See the [Spatial Validator guide](../../spatial-validator/v1/index.md) for setup
and validation calls, and [geometry type validators](../../spatial-validator/v1/geometric-types.md)
for the detailed checks.

Validator versions that still call `isEmpty()`, `isClosed()`, or `isSimple()` on
spatial objects require adaptation: these methods are no longer exposed by
Spatial Types. The construction examples above describe Spatial Types behaviour;
the geometric checks described alongside them require a compatible validator.

Validate mutable objects again after editing when your application requires a
valid result. Immutability protects against indirect edits; it does not establish
geometric validity.
