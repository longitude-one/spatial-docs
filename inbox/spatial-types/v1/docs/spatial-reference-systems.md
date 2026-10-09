# Spatial reference systems

Every spatial value has a `Reference\SpatialReference`. It identifies the
spatial reference system (SRS) through an integer identifier and, when known,
its authority. For example, `SpatialReference::epsg(4326)` represents
`EPSG:4326`.

`getSrid()` remains available as the legacy integer view of that reference.
Use `getSpatialReference()` when the authority must be retained or compared.

## Aggregate invariant

Every member of an aggregate must have exactly the same spatial reference as
its parent. This applies to points in a `LineString`, rings in a `Polygon`, and
components in a `CompoundCurve`, and all values contained by a `Multi*` type
or a geometry collection.

Consequently, this is invalid:

```php
use LongitudeOne\SpatialTypes\Reference\SpatialReference;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\LineString;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\Point;

new LineString([
    new Point(2.3522, 48.8566), // The unnamed reference with identifier 0.
], SpatialReference::epsg(4326));
```

It raises `InvalidSridException`. Identifier `0` is an unnamed reference, not a
wildcard. A line string with the unnamed reference may contain only points with
that same unnamed reference; a line string in `EPSG:4326` may contain only
points in `EPSG:4326`.

This rule also distinguishes references that have the same identifier but a
different authority. The full `SpatialReference` identity must match.

## Why the library is strict

ISO/IEC 13249-3, subclause 4.2.14 (`ST_GeomCollection`), states that all
elements of a geometry collection are in the same spatial reference system and
that it is also the collection's SRS. The standard then describes typed
subcollections such as `ST_MultiPoint`, whose members are restricted to points.

This library applies that same invariant consistently to every aggregate. It
prevents a coordinate tuple expressed in one system from being silently read as
coordinates in another system.

## Changing a reference is not a transformation

`withSpatialReference()` creates an immutable copy and changes only its declared
reference. It does not change coordinates and therefore does not perform a
coordinate transformation. `withSrid()` is the legacy integer equivalent.

To obtain a valid value in a different SRS, calculate new coordinates with an
external transformer, then create or update a value with those coordinates and
the target `SpatialReference`.

```php
use LongitudeOne\SpatialTypes\Reference\SpatialReference;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\Point;
use LongitudeOne\SpatialTypes\Value\Coordinates;

$paris = new Point(2.3522, 48.8566, SpatialReference::epsg(4326));
$lambert93 = $paris->withSpatialReference(SpatialReference::epsg(2154));
$lambert93 = $lambert93->withCoordinates(Coordinates::xy(652469.0227, 6862035.2594));
```

The Lambert 93 ordinates in this example must be calculated by that external
transformer; this library intentionally does not provide it.
