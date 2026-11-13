---
title: Validate geometric types
description: See which checks Spatial selects for Points, curves, surfaces and collections, with illustrated examples.
sidebar_position: 3
---

Use `Spatial` for ordinary validation: it chooses rules from the object's declared type.
You do not need to select a different constraint when the input changes from a Point to a Polygon or a collection.

The examples below use immutable Geometry objects with XY coordinates unless stated otherwise.
Each example continues from this setup and prints the path and code of any diagnostic:

```php
<?php

require 'vendor/autoload.php';

use LongitudeOne\SpatialTypes\Interfaces\SpatialInterface;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry as Geometry;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geography\PointImmutable as GeographyPoint;
use LongitudeOne\SpatialTypes\Types\Dimension3z\Geometry\PolygonImmutable as PolygonZ;
use LongitudeOne\SpatialTypes\Types\Dimension3z\Geometry\PolyhedralSurfaceImmutable;
use LongitudeOne\SpatialValidator\Validator\Constraints\Spatial;
use Symfony\Component\Validator\Validation;

$validator = Validation::createValidator();
$show = static function (SpatialInterface $object) use ($validator): void {
    $violations = $validator->validate($object, new Spatial());
    if (count($violations) === 0) {
        echo 'No diagnostics.' . PHP_EOL;
    }
    foreach ($violations as $violation) {
        printf(
            "%s | %s\n",
            $violation->getPropertyPath() ?: '[root]',
            $violation->getCode(),
        );
    }
};
```

The helper displays diagnostics without classifying their severity.
Use the [overview's result handling](./index.md) when deciding whether to accept an object.

## Points: check the coordinates

A Point represents one position. Validation checks that its declared coordinates are consistently present or consistently absent for EMPTY,
and that every supplied ordinate is finite, including Z and M when declared.
For Geography, X is longitude in [-180, 180] degrees and Y is latitude in [-90, 90] degrees.
These angular bounds do not apply to Geometry Points.

![Point P at (10, 20) has finite coordinates and lies within Geography longitude and latitude bounds.](../../assets/images/spatial-validator/point-valid.svg)

```php
$show(new Geometry\PointImmutable(10, 20)); // No diagnostics.
$show(new GeographyPoint(10, 20)); // No diagnostics.
$show(new Geometry\PointImmutable(INF, 20));
// [root] | finitecoordinates-invalid
$show(new GeographyPoint(200, 100));
// [root] | geographybounds-invalid (longitude)
// [root] | geographybounds-invalid (latitude)
```

A successfully constructed Point can still fail these geometric checks.
The library does not look up a coordinate reference system or infer the intended axis order.

## Lines: check an ordered sequence of positions

A non-empty LineString needs at least two valid non-EMPTY Points, matching component metadata and no consecutive duplicate positions.
It may be open or cross itself. [Simplicity and closure](./additional-checks.md) are additional requirements for a standalone line.

![Three distinct Points (0, 0), (2, 1) and (4, 0) form a valid open line.](../../assets/images/spatial-validator/line-valid.svg)

```php
$show(new Geometry\LineStringImmutable([[0, 0], [2, 1], [4, 0]]));
// No diagnostics.
```

One Point is not enough to form a non-empty line:

![A Point is valid on its own, but a one-Point line fails the minimum point count.](../../assets/images/spatial-validator/line-minimum-points.svg)

```php
$show(new Geometry\LineStringImmutable([[0, 0]]));
// [root] | minimumpointcount-invalid
```

## Circular arcs: check the defining positions

A CircularString joins circular arcs. A non-empty curve needs an odd number of at least three valid non-EMPTY Points.
Each arc's intermediate position must differ from both endpoints; adjoining arcs share their endpoint.

![An upper semicircle passes through (-1, 0), (0, 1) and (1, 0).](../../assets/images/spatial-validator/circular-valid.svg)

```php
$show(new Geometry\CircularStringImmutable([[-1, 0], [0, 1], [1, 0]]));
// No diagnostics.
$show(new Geometry\CircularStringImmutable([[-1, 0], [1, 0]]));
// [root] | circularpointcount-invalid
```

Ordinary validity does not require simplicity or closure. A retraced arc can therefore pass `Spatial` and fail
[explicit simplicity](./additional-checks.md#circular-and-compound-curves).

## Compound curves: check the joins

A CompoundCurve connects LineString and CircularString components in order.
Validation checks every component, rejects EMPTY contributing curves and checks that consecutive endpoints meet.

![A semicircle ends at (1, 0), where a straight segment continues to (2, 0).](../../assets/images/spatial-validator/compound-connected.svg)

```php
$arc = new Geometry\CircularStringImmutable([[-1, 0], [0, 1], [1, 0]]);
$show(new Geometry\CompoundCurveImmutable([
    $arc,
    new Geometry\LineStringImmutable([[1, 0], [2, 0]]),
]));
// No diagnostics.
```

A gap between the arc and the straight section fails continuity:

![The arc stops at (1, 0), while the segment starts at (2, 0), leaving a gap.](../../assets/images/spatial-validator/compound-disconnected.svg)

```php
$show(new Geometry\CompoundCurveImmutable([
    $arc,
    new Geometry\LineStringImmutable([[2, 0], [3, 0]]),
]));
// curves[1] | compoundcurve-disconnected
```

## Polygons: check the boundary and the holes

A Polygon describes an area with an exterior ring and optional holes.
`Spatial` checks the rings, their common supporting plane and their relationships.
A boundary ring must be non-empty, closed and simple; these checks are already required for Polygon validity.
A standalone LineString does not acquire those requirements automatically.

![A square hole lies strictly inside the square exterior, leaving a connected parcel interior.](../../assets/images/spatial-validator/polygon-hole-inside.svg)

```php
$exterior = [[0, 0], [12, 0], [12, 12], [0, 12], [0, 0]];
$hole = array_reverse([[2, 2], [4, 2], [4, 4], [2, 4], [2, 2]]);
$show(new Geometry\PolygonImmutable([$exterior, $hole]));
// No diagnostics.
```

The hole runs in the opposite direction from the exterior, avoiding an orientation warning.
A hole outside the exterior fails even when its own boundary is valid:

![A triangular hole lies outside the parcel to its right.](../../assets/images/spatial-validator/polygon-hole-outside.svg)

```php
$outsideHole = [[20, 2], [20, 4], [22, 2], [20, 2]];
$show(new Geometry\PolygonImmutable([$exterior, $outsideHole]));
// rings[1] | polygon-outside
```

Other rejected relationships include boundary crossings or shared intervals, overlapping or nested holes, and contacts that disconnect the interior.
An isolated tangent contact can be valid if the interior remains connected.
Same-direction holes produce an [orientation warning](./handling-results.md#distinguish-warnings-from-errors), without automatic reorientation.
In XYZ, the supporting plane may be vertical; the calculation is not restricted to the XY projection.

## Triangles: check the declared shape

A Triangle reuses the boundary and supporting-plane checks, then requires exactly three distinct non-collinear vertices,
represented by four exterior positions A → B → C → A, and no holes.
The declared type matters: a triangular Polygon is still validated as a Polygon.

![Three distinct non-collinear vertices form a closed triangular exterior with four positions.](../../assets/images/spatial-validator/triangle-valid.svg)

```php
$show(new Geometry\TriangleImmutable([[[0, 0], [4, 0], [0, 4], [0, 0]]]));
// No diagnostics.
```

## Collections: validate each member

A GeometryCollection may contain different spatial types. Validation visits every member and retains paths to nested failures.
It does not require different members to be disjoint.

![A Point, a line and a triangular Polygon form a valid GeometryCollection.](../../assets/images/spatial-validator/collection-mixed.svg)

```php
$show(new Geometry\GeometryCollectionImmutable(elements: [
    new Geometry\PointImmutable(0, 0),
    new Geometry\LineStringImmutable([[1, 0], [2, 1]]),
    new Geometry\PolygonImmutable([[[3, 0], [5, 0], [4, 2], [3, 0]]]),
]));
// No diagnostics.
```

A typed collection restricts its members: MultiPoint contains Points, MultiLineString contains LineStrings,
and MultiPolygon contains Polygons or Triangles.
Every component must match its parent's Geometry/Geography family, exact coordinate variant and full spatial-reference identity
(authority and identifier). Validation does not convert mismatched components.

![The second collection member is a one-Point line and fails recursive validation.](../../assets/images/spatial-validator/collection-invalid-member.svg)

```php
$show(new Geometry\GeometryCollectionImmutable(elements: [
    new Geometry\PointImmutable(0, 0),
    new Geometry\LineStringImmutable([[2, 0]]),
]));
// geometries[1] | minimumpointcount-invalid
```

Valid EMPTY members are retained and checked; see [Missing and EMPTY values](./input-and-empty.md).
Repeated positions in MultiPoint and crossings between MultiLineString members require [explicit simplicity checks](./additional-checks.md#typed-collections).

## MultiPolygons: check relationships between areas

Besides validating each member, `Spatial` checks interactions between the members' filled areas, accounting for holes.
Interior overlap and shared boundary segments fail; isolated boundary-point contacts can pass.

![Two square Polygon members overlap, so their MultiPolygon is invalid.](../../assets/images/spatial-validator/multipolygon-overlap.svg)

```php
$show(new Geometry\MultiPolygonImmutable([
    new Geometry\PolygonImmutable([[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]]),
    new Geometry\PolygonImmutable([[[1, 1], [3, 1], [3, 3], [1, 3], [1, 1]]]),
]));
// polygons[1] | multipolygon-intersection
```

XYZ members need not share a plane: separated parallel surfaces can be valid despite identical XY footprints.
The checks use their actual spatial positions rather than only their map projection.

## Polyhedral surfaces: check connected patches

A PolyhedralSurface joins Polygon or Triangle patches in XYZ or XYZM.
Validation checks every patch, shared-edge incidence and direction, connectivity, forbidden intersections and local surface topology.
Patches must be non-EMPTY. Unlike MultiPolygon members, neighbouring patches can share edges to connect the surface.

![Two triangular panels share AB in opposite directions, forming a valid open surface.](../../assets/images/spatial-validator/polyhedral-open-book.svg)

```php
$a = [0, 0, 0];
$b = [2, 0, 0];
$c = [0, 2, 0];
$d = [0, 0, 2];
$show(new PolyhedralSurfaceImmutable([
    new PolygonZ([[$a, $c, $b, $a]]),
    new PolygonZ([[$a, $b, $d, $a]]),
]));
// No diagnostics.
```

An open surface can be valid. Use [explicit surface closure](./additional-checks.md#closed-polyhedral-surfaces) when you need an envelope enclosing a volume.

## Coverage and limitations

The release implements the checks described above for Point, LineString, CircularString, CompoundCurve, Polygon, Triangle,
GeometryCollection, MultiPoint, MultiLineString, MultiPolygon and PolyhedralSurface, within their model-specific limits.

Dispatch also recognizes BRepSolid, Circle, Clothoid, CompoundSurface, Curve, CurvePolygon, EllipticalCurve, GeodesicString,
Geometry, MultiCurve, MultiSurface, NURBSCurve, Solid, SpiralCurve, Surface and TIN.
Their geometric validation is unavailable in this release, including for EMPTY objects: the result contains a warning.
Recognizing a declared type does not mean that its geometric validity has been established.

Non-empty Geography objects receive available coordinate and component checks, with warnings for unavailable geodetic calculations,
including line simplicity and closure, compound joins, Polygon topology and surface interactions.
Cartesian calculations are not substituted for these checks.

Geometry spatial comparisons use XYZ when Z exists and otherwise XY. M must be finite but does not distinguish spatial positions.
Continue with [additional requirements](./additional-checks.md) for explicit constraints
and [validation results](./handling-results.md) for diagnostic codes and paths.
