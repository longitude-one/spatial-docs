# Immutability

Spatial values are often reused in several places. Treating their coordinates
as immutable makes that reuse safe and makes a value's location explicit.

## Current contract

Every spatial type is immutable through the public API. Its coordinates, spatial reference,
and aggregate membership are set by its constructor, and it has no public
setter or membership mutator. `getCoordinates()` returns an immutable
`Value\Coordinates` value. `withCoordinates()` creates a distinct point with
replacement coordinates, while `withSpatialReference()` creates a distinct point with the
same coordinates and a different declared spatial reference.

```php
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\Point;
use LongitudeOne\SpatialTypes\Value\Coordinates;
use LongitudeOne\SpatialTypes\Reference\SpatialReference;

$paris = new Point(2.3522, 48.8566, 4326);
$movedParis = $paris->withCoordinates(Coordinates::xy(2.3600, 48.8566));
$parisInLambert93 = $paris->withSpatialReference(SpatialReference::epsg(2154));
$parisInLambert93 = $parisInLambert93->withCoordinates(
    Coordinates::xy(652469.0227, 6862035.2594) // Calculated by an external coordinate transformer.
);
```

The original `$paris` remains unchanged. This is particularly useful when a
point is part of an aggregate. `withSpatialReference()` only changes the
declared reference; it never converts ordinates. The Lambert 93 values in the
example must be calculated by an external coordinate transformer.

`LineString`, `CircularString`, `MultiPoint`, and `Polygon` provide an equally immutable
point-replacement operation. `withPoint()` returns a deep copy: the source
aggregate, its rings, and its points remain unchanged.

```php
use LongitudeOne\SpatialTypes\Types\Dimension3m\Geometry\LineString;
use LongitudeOne\SpatialTypes\Types\Dimension3m\Geometry\MultiPoint;

$line = new LineString([[1, 2, 10], [3, 4, 20]], 2154);
$multiPoint = new MultiPoint([[1, 2, 10], [3, 4, 20]], 2154);
$movedLine = $line->withPoint(1, Coordinates::xym(5, 6, 30));
$movedMultiPoint = $multiPoint->withPoint(0, Coordinates::xym(5, 6, 30));
```

For a polygon, the ring index comes before the point index. A replacement of
the first or final point of a ring is mirrored to the other endpoint, which
preserves its closure.

```php
$movedExterior = $polygon->withPoint(0, 0, Coordinates::xym(5, 6, 30));
$movedHole = $polygon->withPoint(1, -1, Coordinates::xym(7, 8, 40));
```

`Polygon::withRing()` and `MultiLineString::withLineString()` replace a
complete ring or line string from coordinate tuples. They also return deep
copies and preserve the source aggregate's family, dimension, and SRID.

```php
$expandedPolygon = $polygon->withRing(0, [
    [-1, -1], [11, -1], [-1, 11], [-1, -1],
]);
$updatedMultiLine = $multiLine->withLineString(1, [[5, 6], [7, 8]]);
$movedMultiLinePoint = $multiLine->withPoint(1, 0, Coordinates::xy(5, 6));
```

`MultiPolygon` follows the same rule at every nesting level:
`withPoint()` selects a polygon, ring, and point; `withRing()` selects a
polygon and ring; and `withPolygon()` selects a polygon. Every method returns a
deep copy and preserves the family, dimension, and SRID.

```php
$movedMultiPolygon = $multiPolygon->withPoint(0, 0, 0, Coordinates::xy(-1, -1));
$expandedMultiPolygon = $multiPolygon->withRing(1, 0, [[19, -1], [31, -1], [19, 11], [19, -1]]);
$replacedMultiPolygon = $multiPolygon->withPolygon(0, [
    [[40, 0], [50, 0], [40, 10], [40, 0]],
]);
```

`GeometryCollection` and `GeographyCollection` use `withElement()` to replace
one indexed element. The replacement follows the usual family, dimension, and
SRID compatibility rules, while unchanged elements are deeply copied.

## Why coordinates are immutable

Consider a point used by a line string, where that line string is then used by
a multi-line string:

```php
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\LineString;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\MultiLineString;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\Point;

$point = new Point(2.3522, 48.8566, 4326);
$line = new LineString([
    $point,
    new Point(2.3600, 48.8600, 4326),
], 4326);
$multiLine = new MultiLineString([$line], 4326);
```

`$point` is referenced by `$line`, and `$line` is referenced by `$multiLine`.
If a public operation such as `setX()` could change `$point`, the line and the
multi-line string would both change as an indirect side effect. A caller that
only holds `$multiLine` could therefore observe a geometry change without any
operation being made on it.

Because points are immutable, that operation does not exist. Code that needs
another location creates another point and explicitly builds the spatial value
that should contain it. This preserves validation of geography coordinate
ranges, coordinate dimensions, family, and SRID compatibility.

Changing a spatial reference follows the same value-object rule:
`withSpatialReference()` produces another spatial value. It does not transform coordinates; a coordinate
transformation must first calculate new ordinates, then construct a value with
those ordinates and the target SRID.

## Coordinates value object

`Value\Coordinates` is a public, immutable value object for a normalized point
tuple. It accepts numbers only: parsing coordinate strings remains a constructor
and factory concern because it depends on the point family. The value carries
its dimension, so it cannot represent an `XY` point with a Z or M ordinate.

```php
use LongitudeOne\SpatialTypes\Types\Dimension4zm\Geometry\Point;
use LongitudeOne\SpatialTypes\Value\Coordinates;

$paris = new Point(2.3522, 48.8566, 28, 12, 4326);
$higherParis = $paris->withCoordinates(
    Coordinates::xyzm(2.3522, 48.8566, 42, 12)
);
```

`withCoordinates()` requires the same dimension as the receiving point. It
preserves its concrete class, family, and SRID, and still applies geography
longitude/latitude validation when creating the replacement point.

## Aggregate types

The coordinate-replacement API applies to `Point`, `LineString`, `MultiPoint`,
and `Polygon` (including `Triangle`). `LineString::withPoint()` and
`MultiPoint::withPoint()` select a point; `Polygon::withPoint()` selects a ring then a point. All use the
immutable `Value\Coordinates` value, so a replacement must match the receiver's
coordinate dimension.

`Polygon::withRing()` selects a ring and requires coordinates forming a
closed ring. `MultiLineString::withPoint()` selects a line string then a point,
while `MultiLineString::withLineString()` selects one of its line strings.
Both derive the expected coordinate layout from the receiver.

`MultiPolygon::withPoint()` selects a polygon, ring, then point.
`MultiPolygon::withRing()` selects a polygon then ring, while
`MultiPolygon::withPolygon()` replaces an entire polygon. Each operation
creates a deep copy of every polygon in the collection. `PolyhedralSurface`
uses patch indexes with `withPoint()`, `withRing()` and `withPatch()`, and
revalidates the complete surface after each replacement. Its
`withArrayOfCoordinates()` replaces all patches atomically, or returns an empty
surface for `[]`. Indexed replacements on an empty surface are invalid.
Neighbouring faces are never changed implicitly when editing a shared vertex.

`GeometryCollection::withElement()` and `GeographyCollection::withElement()`
replace one element and deeply copy every unchanged element.

Aggregate membership is fixed at construction. Their plural getters return PHP
arrays, so changing a returned array cannot change the aggregate; the objects
inside it are also immutable. Calling `withSpatialReference()` on an aggregate
creates a deep copy whose descendants all receive the requested reference.

See [Instantiable spatial types](instantiable-spatial-types.md#immutability-contract)
for the complete current mutability contract.

Circular strings also provide `withArrayOfCoordinates()`; every replacement
revalidates the odd point count (at least three when non-empty), non-empty
members and distinct intermediate points. Complete-circle endpoints may
coincide, and collinear arcs remain valid. Reference replacements preserve the
defining coordinates and copy the contained points. Editing an endpoint does
not automatically edit the other end of a closed circular string.

Compound curves retain immutable ordered curve components. Their
`withSpatialReference()` and legacy `withSrid()` operations deeply copy all
components and defining points, preserving interpolation and validating
continuity. Construct a new compound from replacement curves to change its
path; modifying a returned `getCurves()` array does not affect the original.
