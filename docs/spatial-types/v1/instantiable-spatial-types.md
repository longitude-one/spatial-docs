---
title: Instantiable spatial types
description: Concrete spatial classes, constructor inputs, read interfaces, immutable replacements and mutable editing contracts in Spatial Types 1.x.
---

This reference documents the public, concrete spatial value types provided by
`longitude-one/spatial-types`. It covers their namespaces, direct constructors,
observable API, and mutation semantics.

## Type guides

- [Point](./types/point.md)
- [LineString](./types/line-string.md)
- [CircularString](./types/circular-string.md)
- [CompoundCurve](./types/compound-curve.md)
- [Polygon](./types/polygon.md)
- [Triangle](./types/triangle.md)
- [PolyhedralSurface](./types/polyhedral-surface.md)
- [MultiPoint](./types/multi-point.md)
- [MultiLineString](./types/multi-line-string.md)
- [MultiPolygon](./types/multi-polygon.md)
- [SpatialCollection](./types/spatial-collection.md)

## Standards and model

The library follows the spatial-object model established by the
[OGC Simple Features Access standard](../../standards/ogc/ogc-06-103r4.md) and
the `ST_Geometry` hierarchy of SQL/MM Spatial (ISO/IEC 13249-3). In practice,
that model supplies the instantiable `Point`, `LineString`, `Polygon`,
`Triangle`, `PolyhedralSurface`, `MultiPoint`, `MultiLineString`, `MultiPolygon`, and collection types.

### GeometryTypeEnum implementation status

Use `Implementation\SpatialTypeImplementationStatus::isFullyImplemented()` to
query library support without depending on concrete class names or namespaces.
The API accepts a `LongitudeOne\Core\Enum\GeometryTypeEnum` and returns a
boolean for instantiable types. Instantiability is defined by
`GeometryTypeEnum::isInstantiable()` in `spatial-core`; implementation status
belongs to `spatial-types`.

```php
use LongitudeOne\Core\Enum\GeometryTypeEnum;
use LongitudeOne\SpatialTypes\Exception\InvalidValueException;
use LongitudeOne\SpatialTypes\Implementation\SpatialTypeImplementationStatus;

SpatialTypeImplementationStatus::isFullyImplemented(GeometryTypeEnum::POINT); // true
SpatialTypeImplementationStatus::isFullyImplemented(GeometryTypeEnum::TIN); // false
SpatialTypeImplementationStatus::isFullyImplemented(GeometryTypeEnum::POLYHEDRALSURFACE); // true

try {
    SpatialTypeImplementationStatus::isFullyImplemented(GeometryTypeEnum::GEOMETRY);
} catch (InvalidValueException $exception) {
    // Implementation status is not applicable to non-instantiable GeometryTypeEnum::GEOMETRY.
}
```

The following matrix covers every current enum case. **Not applicable** means
that the request throws `InvalidValueException`, identifying the enum case and
its non-instantiable status. It never returns `false` for an abstract type.
**No** means that an instantiable type is not yet fully implemented.

If a future instantiable enum case has no explicit classification, the API throws
`LongitudeOne\SpatialTypes\Exception\LogicException` with the case name.
This exception extends PHP's `LogicException` and implements
`SpatialTypeExceptionInterface`; it identifies an incomplete library
classification, rather than an unsupported spatial type. A test iterates all
enum cases to ensure this exception is not raised for the current model.

| `GeometryTypeEnum`   | Instantiable | Fully implemented by `spatial-types` |
|----------------------|--------------|--------------------------------------|
| `GEOMETRY`           | No           | Not applicable                       |
| `POINT`              | Yes          | Yes                                  |
| `CURVE`              | No           | Not applicable                       |
| `LINESTRING`         | Yes          | Yes                                  |
| `CIRCULARSTRING`     | Yes          | Yes                                  |
| `COMPOUNDCURVE`      | Yes          | Yes                                  |
| `SURFACE`            | No           | Not applicable                       |
| `CURVEPOLYGON`       | Yes          | No                                   |
| `POLYGON`            | Yes          | Yes                                  |
| `TRIANGLE`           | Yes          | Yes                                  |
| `POLYHEDRALSURFACE`  | Yes          | Yes                                  |
| `TIN`                | Yes          | No                                   |
| `GEOMETRYCOLLECTION` | Yes          | Yes                                  |
| `MULTIPOINT`         | Yes          | Yes                                  |
| `MULTICURVE`         | Yes          | No                                   |
| `MULTILINESTRING`    | Yes          | Yes                                  |
| `MULTISURFACE`       | Yes          | No                                   |
| `MULTIPOLYGON`       | Yes          | Yes                                  |
| `SOLID`              | No           | Not applicable                       |
| `BREPSOLID`          | Yes          | No                                   |
| `CIRCLE`             | Yes          | No                                   |
| `CLOTHOID`           | Yes          | No                                   |
| `COMPOUNDSURFACE`    | Yes          | No                                   |
| `ELLIPTICALCURVE`    | Yes          | No                                   |
| `GEODESICSTRING`     | Yes          | No                                   |
| `NURBSCURVE`         | Yes          | No                                   |
| `SPIRALCURVE`        | Yes          | No                                   |

Full implementation is evaluated over the layouts applicable to the geometry
type, not over every layout in the library. `POLYHEDRALSURFACE` is fully
implemented for this API: both families provide XYZ and XYZM variants. This
does not add XY or XYM variants. The other ten implemented types are
available in both families for XY, XYZ, XYM and XYZM.

This API requires `spatial-core` 1.3 or newer within the 1.x series. The
library's minimum dependency has accordingly increased from 1.2 to 1.3.
The eight instantiable types added in `spatial-core` 1.3 are explicitly
classified as not yet implemented.
No existing spatial type or supported coordinate layout changes.

`ST_SpatialRefSys` is an SQL/MM spatial-reference-system metadata type rather
than a subtype of `ST_Geometry`; it is outside this value-type hierarchy. This
library identifies a reference with `Reference\SpatialReference`, which can
carry an authority and its integer identifier, without modeling a full
reference-system definition. The supplied ISO/IEC CD 13249-3:201x(E), section
8.5, names the polyhedral surface type `ST_PolyhdrlSurface`.

The `Geography` family is a library-level counterpart to the `Geometry` family;
it is not a separate `ST_Geography` branch in the SQL/MM hierarchy.

The library distinguishes two coordinate families:

- **Geometry** uses Cartesian `X, Y` coordinates. Numeric values are not range
  limited by this library.
- **Geography** uses geodetic `longitude, latitude` coordinates, still ordered
  as `X, Y`. Numeric longitude/latitude ranges are not checked automatically.

The coordinate layouts are `XY`, `XYZ`, `XYM`, and `XYZM`; their tuple order is
always `X, Y[, Z][, M]`. `Z` is elevation and `M` is a measure. In particular,
an `XYM` tuple is `[x, y, m]`, whereas an `XYZ` tuple is `[x, y, z]`.

Every spatial object has a `SpatialReference`; `getSrid()` exposes its legacy
integer identifier. Constructors without a reference use identifier `0`, as
prescribed for SQL/MM constructors without an SRID. Supplied objects retain
their own references; aggregate compatibility is not checked automatically.

See [Spatial reference systems](spatial-reference-systems.md) for reference
handling and [Spatial validation](validators.md) for explicit functional checks.

## Class catalogue

All classes in the following matrix are final, concrete and immutable. The class
name is composed of the dimension, family, and type:

```text
LongitudeOne\SpatialTypes\Types\<dimension>\<family>\<type>Immutable
```

| Dimension         | Namespace segment | Coordinates  |
| ----------------- | ----------------- | ------------ |
| 2D                | `Dimension2`      | `X, Y`       |
| 3D with elevation | `Dimension3z`     | `X, Y, Z`    |
| 3D with measure   | `Dimension3m`     | `X, Y, M`    |
| 4D                | `Dimension4zm`    | `X, Y, Z, M` |

For each dimension, both `Geometry` and `Geography` provide:

| Type                     | Geometry class                           | Geography class                            |
|--------------------------|------------------------------------------|--------------------------------------------|
| Point                    | `…\Geometry\PointImmutable`              | `…\Geography\PointImmutable`               |
| Line string              | `…\Geometry\LineStringImmutable`         | `…\Geography\LineStringImmutable`          |
| Circular string          | `…\Geometry\CircularStringImmutable`     | `…\Geography\CircularStringImmutable`      |
| Compound curve           | `…\Geometry\CompoundCurveImmutable`      | `…\Geography\CompoundCurveImmutable`       |
| Polygon                  | `…\Geometry\PolygonImmutable`            | `…\Geography\PolygonImmutable`             |
| Triangle                 | `…\Geometry\TriangleImmutable`           | `…\Geography\TriangleImmutable`            |
| Multi-point              | `…\Geometry\MultiPointImmutable`         | `…\Geography\MultiPointImmutable`          |
| Multi-line string        | `…\Geometry\MultiLineStringImmutable`    | `…\Geography\MultiLineStringImmutable`     |
| Multi-polygon            | `…\Geometry\MultiPolygonImmutable`       | `…\Geography\MultiPolygonImmutable`        |
| Heterogeneous collection | `…\Geometry\GeometryCollectionImmutable` | `…\Geography\GeographyCollectionImmutable` |

`PolyhedralSurfaceImmutable` is additionally available in `Dimension3z` and
`Dimension4zm`, in both families. Its faces require Z; XY and XYM variants are
not provided. It is a surface, not a heterogeneous collection or a solid.

For example, a four-dimensional geographic polygon is
`LongitudeOne\SpatialTypes\Types\Dimension4zm\Geography\PolygonImmutable`.

`AbstractSpatialType` and the other `Abstract*` classes under `Internal\Types`
are internal base classes, not part of the instantiable API.

## Direct construction

For construction through a shared mutable/immutable selection, see
[public spatial factories](spatial-factories/index.md).

The selected namespace determines both the coordinate dimension and family.
The optional `$srid` argument accepts `int|SpatialReference` and defaults to
the unnamed reference identified by `0` in every constructor.

### Point

```text
new PointImmutable($x = null, $y = null, int|SpatialReference $srid = 0);                          // Dimension2
new PointImmutable($x = null, $y = null, $z = null, int|SpatialReference $srid = 0);               // Dimension3z
new PointImmutable($x = null, $y = null, $m = null, int|SpatialReference $srid = 0);               // Dimension3m
new PointImmutable($x = null, $y = null, $z = null, $m = null, int|SpatialReference $srid = 0);    // Dimension4zm
```

`$x` and `$y` accept `int`, `float`, `null`, or a coordinate string accepted by the
geo-parser. `$z` and `$m` accept `int|float|null`. For Geography, `$x` means
longitude and `$y` means latitude.

Each coordinate parameter is nullable. Omitting every ordinate (or passing
`null` for every ordinate) creates an empty point. Any combination of supplied
and null ordinates is preserved. A partially supplied point is not EMPTY, and
zero is a supplied value. Null ordinates do not change the declared dimension.
This preserves the selected coordinate layout and optional SRID:

```php
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\PointImmutable;

$emptyPoint = new PointImmutable(srid: 4326);
assert([] === $emptyPoint->toArray());
```

A full-length tuple containing only nulls also creates an EMPTY point. Indexed tuples must still
contain every index declared by the requested dimension; an explicit null is
different from an absent index.

```php
use LongitudeOne\SpatialTypes\Types\Dimension3z\Geography\PointImmutable;

$point = new PointImmutable(2.3522, 48.8566, 35, 4326); // longitude, latitude, elevation
```

```php
use LongitudeOne\SpatialTypes\Types\Dimension3z\Geography\PointImmutable;

$partialPoint = new PointImmutable(0, null, null, 4326); // XYZ Geography
assert([0, null, null] === $partialPoint->toArray());
assert($partialPoint->hasZ()); // The Z axis exists even when its value is null.
```

Representing these states does not establish geometric conformity with
ISO/IEC 13249-3 or OGC requirements. Request coordinate-completeness validation
explicitly through `spatial-validator`; this library does not invoke it or
depend on it. See [Validation](validators.md).

### Mutable points

Mutable points live directly in the dimension namespace:

| Layout | Class                      | Constructor ordinates |
|--------|----------------------------|-----------------------|
| XY     | `Types\Dimension2\Point`   | X, Y                  |
| XYZ    | `Types\Dimension3z\Point`  | X, Y, Z               |
| XYM    | `Types\Dimension3m\Point`  | X, Y, M               |
| XYZM   | `Types\Dimension4zm\Point` | X, Y, Z, M            |

All ordinates default to `null`. Each constructor ends with
`int|SpatialReference $srid = 0` and
`SpatialModelEnum $family = SpatialModelEnum::GEOMETRY`.
The family is instance state: the same class supports Geometry and Geography.

```php
use LongitudeOne\Core\Enum\SpatialModelEnum;
use LongitudeOne\SpatialTypes\Reference\SpatialReference;
use LongitudeOne\SpatialTypes\Types\Dimension3z\Point;

$point = new Point(0, null, null, 4326);
$samePoint = $point->setX("2°30'E")
    ->setY(48.5)
    ->setZ(35)
    ->setFamily(SpatialModelEnum::GEOGRAPHY)
    ->setSpatialReference(SpatialReference::epsg(2154));
assert($samePoint === $point);
assert([2.5, 48.5, 35] === $point->toArray());
```

`MutablePointInterface` exposes `setX()`, `setY()`, `setZ()` and `setM()`;
`MutableSpatialInterface` provides `setFamily()`, `setSpatialReference()` and
`setSrid()`. Every successful setter returns the same instance as `static`.
X/Y accept `float|int|string|null` and use the constructor's geo-parser path
for strings. Z/M accept `float|int|null`, without string parsing.
Rejected technical or parsing input leaves the receiver unchanged.

Calling a Z/M setter for an axis outside the declared layout throws
`LongitudeOne\SpatialTypes\Exception\BadMethodCallException`, even for `null`.
Type and dimension remain fixed; there is no dimension setter or `with…` method.
Supported axes accept null independently: `[0, null]` is not EMPTY. All-null
ordinates produce EMPTY, with `toArray() === []` and `getCoordinates() === null`.
A previously obtained `Coordinates` value remains an immutable snapshot.

Family and declared-reference setters preserve every ordinate without coordinate
transformation. Geometric validation remains explicit in the consumer. Mutable
points cannot be inserted into immutable aggregates and are not implicitly
converted. [Public factories](spatial-factories/index.md) create either representation
according to their shared global mode, initially immutable.

### Immutable point coordinates

`LongitudeOne\SpatialTypes\Value\Coordinates` is a public immutable value
object for numeric or null point coordinates. Its named constructors encode
the coordinate dimension: `Coordinates::xy()`, `Coordinates::xym()`,
`Coordinates::xyz()`, and `Coordinates::xyzm()`.

`PointInterface::getCoordinates()` returns this value object.
`ImmutablePointInterface::withCoordinates(Coordinates $coordinates)` returns a new point
of the same concrete class and SRID. The supplied coordinates must have the
same dimension as the point. Its accessors and `toArray()` retain null values
for axes in that dimension; reading or replacing an axis outside the dimension
still throws `InvalidDimensionException`. All-null replacement coordinates
produce an EMPTY point, whose `toArray()` is `[]` and `getCoordinates()` is null.

```php
use LongitudeOne\SpatialTypes\Types\Dimension3z\Geography\PointImmutable;
use LongitudeOne\SpatialTypes\Value\Coordinates;

$point = new PointImmutable(2.3522, 48.8566, 35, 4326);
$higherPoint = $point->withCoordinates(Coordinates::xyz(2.3522, 48.8566, 42));
```

### Point-based types

```text
new LineStringImmutable(array $points, int|SpatialReference $srid = 0);
new MultiPointImmutable(array $points, int|SpatialReference $srid = 0);
```

`$points` may contain instances of `ImmutablePointInterface` or coordinate tuples for
the selected dimension, for example `[[0, 0], [1, 1]]` for `XY` or
`[[0, 0, 12, 3], [1, 1, 15, 4]]` for `XYZM`.

```php
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\LineStringImmutable;

$lineString = new LineStringImmutable([[0, 0], [2, 1], [5, 1]], 3857);
```

### Ring-, line-, and polygon-based types

```text
new PolygonImmutable(array $rings, int|SpatialReference $srid = 0);
new TriangleImmutable(array $rings, int|SpatialReference $srid = 0);
new MultiLineStringImmutable(array $lineStrings, int|SpatialReference $srid = 0);
new MultiPolygonImmutable(array $polygons, int|SpatialReference $srid = 0);
new PolyhedralSurfaceImmutable(array $patches = [], int|SpatialReference $srid = 0);
```

- A polygon ring is an `ImmutableLineStringInterface` or an array of point tuples.
- A triangle uses the same ring representation as a polygon. Cardinality,
  closure and absence of holes are not enforced; `[]` is an empty triangle.
- A multi-line-string element is an `ImmutableLineStringInterface` or point-tuple array.
  `[]` as an element creates an empty line string in the aggregate's context.
- A multi-polygon element is an `ImmutablePolygonInterface` or an array of rings.
  Empty member polygons retain their positions.
- A polyhedral-surface patch is an `ImmutablePolygonInterface` (including a triangle)
  or an array of rings. Empty patches, disconnected faces and non-planar faces
  can be represented. `[]` creates a surface with zero patches.

Supplied member objects keep their family, layout and reference; compatibility
and geometric validity are explicit consumer concerns. Coordinate tuples are
hydrated in the receiving aggregate's family, dimension and reference.

```php
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\PolygonImmutable;

$polygon = new PolygonImmutable([
    [[0, 0], [4, 0], [4, 3], [0, 0]],
], 3857);
```

`new MultiLineStringImmutable([])` has zero members, whereas
`new MultiLineStringImmutable([[]])` has one empty member. `getElements()`,
`getLineStrings()`, `getLineString()` and `toArray()` preserve this distinction.
Use `count($value->getElements())` to inspect their cardinality.

`new MultiPolygonImmutable([])` has zero members.
`new MultiPolygonImmutable([[]])` and
`new MultiPolygonImmutable([new PolygonImmutable([])])` each contain one empty
polygon. `getElements()`, `getPolygons()` and `getPolygon()` expose that member.
`toArray()` preserves the distinction as `[]` versus `[[]]`; empty members in
mixed collections retain their positions.

EMPTY members remain representable in MultiPoint, MultiLineString,
MultiPolygon and GeometryCollection, in both families and all supported
layouts, for mutable and immutable variants. Member references, order and
cardinality are preserved. Mutable members must match their aggregate
layout; family, reference and geometric validity remain consumer concerns.
Applications that need to evaluate emptiness must use
`spatial-validator`.

`withLineString($index, [])` replaces a member with an empty line string without
removing it. Replacing an empty member with non-empty coordinates preserves its
position too. Unchanged members are deeply copied with their full spatial
reference, including its authority. `withSpatialReference()` and `withSrid()`
preserve empty members while applying the requested reference to the copy.
The original value remains unchanged.

`TriangleInterface` extends `PolygonInterface`. All eight dimension/family
combinations provide a concrete `TriangleImmutable`:

```php
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\TriangleImmutable;

$triangle = new TriangleImmutable([[[0, 0], [4, 0], [0, 4], [0, 0]]], 3857);
$empty = new TriangleImmutable([]);
```

Triangle cardinality and closure are functional validity rules and are no
longer enforced by constructors or immutable replacements.

Triangles provide the polygon accessors and immutable replacement methods.
Copies preserve the concrete triangle class. `getType()` returns `GeometryTypeEnum::TRIANGLE`; JSON uses
`Triangle` with the same nested coordinate representation as polygons.
`TriangleFactory::create()` is available in every dimension/family namespace;
see [public factories](spatial-factories/index.md). SQL/MM visibility attributes and
text/binary/GML conversion routines are not currently exposed.

### Heterogeneous collections

```text
new GeometryCollectionImmutable(int|SpatialReference $srid = 0, array $elements = []);
new GeographyCollectionImmutable(int|SpatialReference $srid = 0, array $elements = []);
```

Collections accept their initial elements in their constructor. They accept any
immutable spatial type implementing `ImmutableSpatialInterface`, including nested
immutable collections. Mutable components and mutable descendants are rejected
without conversion.

```php
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\GeometryCollectionImmutable;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\PointImmutable;

$collection = new GeometryCollectionImmutable(3857, [new PointImmutable(0, 0, 3857)]);
```

## Observing spatial values

All concrete types implement `SpatialInterface` and `JsonSerializable`.

| Method                                            | Result                                                          |
| ------------------------------------------------- | --------------------------------------------------------------- |
| `getFamily(): SpatialModelEnum`                   | `SpatialModelEnum::GEOMETRY` or `SpatialModelEnum::GEOGRAPHY`.  |
| `getType(): GeometryTypeEnum`                     | The OGC/SQL/MM type, such as `GeometryTypeEnum::POLYGON`.       |
| `getSrid(): int`                                  | The object's SRID.                                              |
| `getSpatialReference(): SpatialReference`         | The full reference identity, including its optional authority.  |
| `hasZ(): bool` / `hasM(): bool`                   | Whether the selected coordinate layout has Z or M.              |
| `hasSameDimension(SpatialInterface $other): bool` | Whether both values use the same Z/M layout.                    |
| `toArray(): array`                                | Nested coordinate arrays only; it omits type, family, and SRID. |
| `jsonSerialize(): array`                          | `['type' => string, 'coordinates' => array, 'srid' => int]`.    |

There is intentionally no public `getDimension()` method. Use `hasZ()` and
`hasM()` to inspect the coordinate layout.

### Point getters

Every point provides `getX()` and `getY()`. `getLongitude()` is an alias for
`getX()`, and `getLatitude()` is an alias for `getY()`; those aliases are useful
for Geography values. `getZ()` is available only for `XYZ`/`XYZM` points and
`getM()` only for `XYM`/`XYZM` points. Calling an unavailable getter throws
`BadMethodCallException`. For an empty point, its available coordinate getters
and `getCoordinates()` return `null`; `toArray()` returns `[]`.

`equalsTo(PointInterface $other): bool` compares the concrete point class,
family, SRID, coordinate layout, and all applicable ordinates. Equivalent
integer/float values compare equal; null remains distinct from zero, and no
approximate tolerance is used. Coordinates and their stored PHP types remain
unchanged. This is representation equality, not spatial or topological equality. `toArray()`
returns one tuple in the layout's order.

### Aggregate getters

| Type                                                           | Element access                                               | Additional observation |
|----------------------------------------------------------------|--------------------------------------------------------------|------------------------|
| `LineStringImmutable`                                          | `getPoints()`, `getPoint($index)`, `getElements()`           | —                      |
| `MultiPointImmutable`                                          | `getPoints()`, `getPoint($index)`, `getElements()`           | —                      |
| `PolygonImmutable` / `TriangleImmutable`                       | `getRings()`, `getRing($index)`, `getElements()`             | —                      |
| `MultiLineStringImmutable`                                     | `getLineStrings()`, `getLineString($index)`, `getElements()` | —                      |
| `MultiPolygonImmutable`                                        | `getPolygons()`, `getPolygon($index)`, `getElements()`       | —                      |
| `PolyhedralSurfaceImmutable`                                   | `getPatches()`, `getPatch($index)`, `getElements()`          | —                      |
| `GeometryCollectionImmutable` / `GeographyCollectionImmutable` | `getElements()`                                              | `hasElement($spatial)` |

For point, ring, line-string, polygon, and patch single-element accessors, negative
indexes count from the end (`-1` is the last element). An index is wrapped by
the element count; accessing an empty aggregate raises `OutOfBoundsException`.

Emptiness, closure and simplicity are geometric or functional evaluations and
are intentionally not part of the `spatial-types` public API. Their evaluation
belongs to `spatial-validator`; this library only preserves the structures on
which those evaluations operate.

## Immutability contract

Every spatial type with the `Immutable` suffix is immutable through the public API: construction sets its
ordinates, SRID, and aggregate membership, and no public mutator exists.
`ImmutableSpatialInterface::copy(): static` returns a deep copy preserving the
concrete type, coordinates, family, dimension, membership order and each
component's individual complete spatial reference. Spatial descendants are
distinct copies; immutable coordinate and reference values may be shared.
Custom implementations must provide the same deep-copy contract.

`withCoordinates(Coordinates $coordinates): static` returns a point with
replacement coordinates of the same dimension; `withSpatialReference(SpatialReference $reference): static`
returns one with the same coordinates and a new declared reference.

`LineStringImmutable`, `PolygonImmutable`, `TriangleImmutable`, and `PolyhedralSurfaceImmutable` provide
`withArrayOfCoordinates(array $coordinates): static`. These methods return a
new aggregate with replacement coordinates while preserving family, dimension,
and SRID. The line-string method accepts coordinate tuples; the polygon method
accepts arrays of rings. The receiving aggregate determines whether tuples are
XY, XYM, XYZ, or XYZM. For `PolyhedralSurfaceImmutable`, replacement coordinates are
arrays of patches and use XYZ or XYZM; `[]` returns an empty surface.

`LineStringImmutable::withPoint(int $pointIndex, Coordinates $coordinates): static`
returns a deep copy with one replacement point. For polygons,
`PolygonImmutable::withPoint(int $ringIndex, int $pointIndex, Coordinates $coordinates): static`
uses a ring index followed by a point index. Replacing either endpoint of a
ring updates both endpoints to preserve its closure. Both methods retain the
family, dimension, and SRID of the receiving aggregate.

`MultiPointImmutable::withPoint(int $pointIndex, Coordinates $coordinates): static`
returns a deep copy with one replacement point and preserves the receiving
multipoint's family, dimension, and SRID.

`PolygonImmutable::withRing(int $ringIndex, array $coordinates): static` replaces
one ring. `MultiLineStringImmutable::withLineString(int $lineStringIndex, array
$coordinates): static` replaces one line string. Both return deep copies and
derive the expected XY, XYM, XYZ, or XYZM layout from the receiving aggregate.

`MultiLineStringImmutable::withPoint(int $lineStringIndex, int $pointIndex, Coordinates
$coordinates): static` replaces one point in one line string and returns a deep
copy.

`MultiPolygonImmutable::withPoint(int $polygonIndex, int $ringIndex, int $pointIndex,
Coordinates $coordinates): static` replaces one point.
`MultiPolygonImmutable::withRing(int $polygonIndex, int $ringIndex, array
$coordinates): static` replaces one ring, and `MultiPolygonImmutable::withPolygon(int
$polygonIndex, array $coordinates): static` replaces one polygon. All three
methods return deep copies and preserve family, dimension, and SRID.
`PolyhedralSurfaceImmutable` provides `withPoint($patchIndex, $ringIndex, $pointIndex,
$coordinates)`, `withRing($patchIndex, $ringIndex, $coordinates)` and
`withPatch($patchIndex, $coordinates)` with the same deep-copy semantics.
Surface topology is not checked. Editing a shared vertex does not silently
move neighboring faces.
Empty surfaces reject indexed access and indexed replacements.

`GeometryCollectionImmutable::withElement(int $elementIndex, SpatialInterface
$element): static` and `GeographyCollectionImmutable::withElement(...)` replace one
element implementing `ImmutableSpatialInterface` and deeply copy the unchanged elements.

All concrete immutable types implement `withSpatialReference(SpatialReference $reference): static`.
For aggregates, it returns a deep copy whose contained values receive the
requested reference, so the result remains internally reference-consistent.
`withSrid(int $srid)` remains as a legacy integer adapter.

Constructors and replacements enforce technical input types, required component kinds and representation ownership.
Coordinate tuples and replacement values must use the receiver's layout; mutable composites also check supplied component and descendant layouts.
Family/reference compatibility and geometric validity remain explicit consumer concerns.

`getPoints()`, `getRings()`, and the other plural getters return PHP arrays, so
changing the returned array does not alter the aggregate's membership. Their
contained objects are immutable too, so the retrieved object graph is safe to
share.

## Diagnostic messages

### Incompatible spatial components

Composite constructors and component replacement or mutation operations reject
incompatible spatial objects with `InvalidValueException`, which implements
`SpatialTypeExceptionInterface`. Messages identify the expected component contract.
For example, an immutable multi-polygon rejects a mutable polygon:

```php
use LongitudeOne\SpatialTypes\Exception\SpatialTypeExceptionInterface;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\MultiPolygonImmutable;
use LongitudeOne\SpatialTypes\Types\Dimension2\Polygon;

try {
    new MultiPolygonImmutable([new Polygon([])]);
} catch (SpatialTypeExceptionInterface $exception) {
    // The component must implement ImmutablePolygonInterface.
}
```

Concrete single-component methods accept `SpatialInterface` so that they can
report incompatible spatial objects through this exception contract. Their
interfaces retain the more specific component parameter types. Accepted
components remain unchanged: mutable and immutable objects are never converted
or mixed, and the required point, curve, ring or polygon interface is enforced.
Rejected mutations leave membership and supplied objects unchanged.

Non-spatial arguments to these single-component methods still raise PHP
`TypeError`. Coordinate parsing errors and errors originating in custom component
implementations retain their own exception contracts. Geometric validity and
family/reference compatibility and immutable member-layout compatibility remain explicit consumer checks.
Mutable composites enforce matching component layouts.

### Formatting untrusted values

Untrusted values included in exceptions raised by this library are formatted with
`LongitudeOne\Core\Diagnostic\DiagnosticValueFormatter` (spatial-core 1.1+).
Control characters, invisible Unicode formatting characters and line separators
are escaped visibly; invalid UTF-8 bytes are escaped and each formatted value is
limited to 2,048 characters. This affects diagnostic output only, not coordinate parsing.

Previous exceptions from dependencies retain their original messages and formatting.
Exceptions constructed directly by application code retain PHP's standard constructor behavior.
The formatter does not escape messages for HTML, JSON, XML or SQL.

## Circular strings and the common curve contract

`Interfaces\CurveInterface` extends `SpatialInterface` and is the shared curve
contract implemented by `LineStringInterface`, `CircularStringInterface` and
`CompoundCurveInterface`. It provides `getStartPoint(): ?PointInterface`,
and `getEndPoint(): ?PointInterface`. Empty curves return `null` endpoints.

This is an approved breaking change before 1.0.0: third-party implementations
of these curve interfaces must implement the two common endpoint methods.

`Types\Dimension{2,3z,3m,4zm}\{Geometry,Geography}\CircularStringImmutable` supports
XY, XYZ, XYM and XYZM in both families. Its constructor is:

```text
public function __construct(array $points, int|SpatialReference $srid = 0);
```

Pass defining `ImmutablePointInterface` values or coordinate tuples. `[]` creates an
empty circular string. Odd cardinality, non-empty members and distinct arc
points are geometric validity rules and are not automatically checked. Stored
points are never replaced by a linear approximation.

```php
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\CircularStringImmutable;
use LongitudeOne\SpatialTypes\Value\Coordinates;

$arc = new CircularStringImmutable([[0, 0], [1, 1], [2, 0]], 4326);
$circle = new CircularStringImmutable([[1, 0], [-1, 0], [1, 0]], 4326);
$empty = new CircularStringImmutable([], 4326);
$replacement = $arc->withPoint(1, Coordinates::xy(1, 2));
```

`getPoints()`, `getPoint($index)` and `getElements()` expose defining points.
Indexes wrap by the point count and negative indexes count from the end;
empty indexed access throws `OutOfBoundsException`. The ordinary spatial
methods report `CIRCULARSTRING`, coordinate dimension, family and reference.
`toArray()` contains the defining coordinate tuples.

`withPoint()` and `withArrayOfCoordinates()` preserve the curve's family,
dimension and complete reference. No functional curve validation is performed.
`withArrayOfCoordinates([])` returns an empty curve. Reference changes copy
every point without transforming coordinates.

## Compound curves

`Types\Dimension{2,3z,3m,4zm}\{Geometry,Geography}\CompoundCurveImmutable` implements
`ImmutableCompoundCurveInterface` in XY, XYZ, XYM and XYZM. Construct it with ordered
`ImmutableCurveInterface` components and an optional integer or `SpatialReference`:

```php
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\CircularStringImmutable;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\CompoundCurveImmutable;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\LineStringImmutable;

$curve = new CompoundCurveImmutable([
    new LineStringImmutable([[0, 0], [1, 1]], 4326),
    new CircularStringImmutable([[1, 1], [2, 2], [3, 1]], 4326),
], 4326);
$empty = new CompoundCurveImmutable([], 4326);
```

`new CompoundCurveImmutable()` creates an empty XY Geometry value with SRID 0 when
using the class imported above. Components must implement `ImmutableCurveInterface`
and expose point tuples with numeric or null ordinates. Null entries retain
their positions through array access and immutable reference copies. Family,
dimension, reference, non-empty endpoints and continuity are
not validated automatically. Required component interfaces are checked. Components are preserved as objects without
flattening, reversal or linear approximation.

`getCurves()` and `getElements()` expose the ordered components as
`ImmutableCurveInterface[]`. `getCurve($index)` uses wrapping indexes and negative
indexes from the end; EMPTY indexed access raises `OutOfBoundsException`.
`getStartPoint()` and `getEndPoint()` expose the outer endpoints.
`getType()` returns `GeometryTypeEnum::COMPOUNDCURVE`.
`toArray()` contains one array of defining coordinate tuples per component;
use component accessors when interpolation identity is needed. The inherited
JSON representation uses type `CompoundCurve`, these coordinates, and SRID;
it is not a GeoJSON or interchange-format implementation.

`withSpatialReference()` deeply copies components and their points and
does not transform coordinates or validate continuity. `withSrid()` is the
legacy integer adapter. Reconstruct a compound from replacement component
curves to change its path; returned component arrays cannot mutate membership.

The normative basis is ISO/IEC CD 13249-3:201x(E), the available 2009-01-16
Committee Draft: clauses 4.2.7 and 7.4.1 (component types, continuity and empty
values), and 7.4.6–7.4.7 (endpoints, including `null` for EMPTY). The library's
point equality semantics apply to endpoint predicates; continuity is not enforced. This
type provides no serialization, decoding or linearization.
`CompoundCurveFactory::create()` accepts explicit supported curve components;
see [public factories](spatial-factories/index.md).

## Mutable dimensional consistency

Every mutable composite checks its supplied components and descendants during
construction and membership edits. The declared XY, XYZ, XYM or XYZM layout must
match exactly, including for EMPTY components: XYZ and XYM are different layouts.
This applies to paths, compound curves, polygons, triangles, polyhedral surfaces,
multi-objects and nested spatial collections. Coordinate tuples continue to use
the receiver's declared layout.

An incompatible spatial object raises `InvalidDimensionException`, implementing
`SpatialTypeExceptionInterface`, before membership changes. Supplied objects are
never reprojected, truncated or converted. Matching objects retain their identity,
family and spatial reference. Geometric validity remains an explicit consumer
concern.

**Compatibility change:** mixed-layout mutable aggregates are no longer accepted.
Immutable aggregate contracts are unchanged.

## Mutable line strings and circular strings

`Types\Dimension2`, `Types\Dimension3z`, `Types\Dimension3m` and
`Types\Dimension4zm` each provide `LineString` and `CircularString`. They implement
`MutableLineStringInterface` and `MutableCircularStringInterface` respectively.
Their constructor is `__construct(array $points, int|SpatialReference $srid = 0,
SpatialModelEnum $family = SpatialModelEnum::GEOMETRY)`. The coordinate layout and
spatial type remain fixed; the declared family is instance state.

Supply mutable point objects or indexed coordinate tuples in the selected layout.
Tuples create mutable points using the line's declared family and reference,
including the existing X/Y coordinate-string parser. Numeric and null Z/M values
follow the corresponding point constructor. Immutable point objects are rejected
without conversion. Supplied mutable points keep their identity, ordinates,
family and reference; construction and membership edits do not synchronize them.
Family/reference compatibility and geometric validity remain consumer concerns.
All supplied points must match the receiver's coordinate layout.

| Operation                        | Effect                                                      |
|----------------------------------|-------------------------------------------------------------|
| `addPoint($point)`               | Append the supplied mutable point                           |
| `insertPoint($index, $point)`    | Insert before the zero-based index; the point count appends |
| `setPoint($index, $point)`       | Replace an existing point                                   |
| `removePoint($index)`            | Remove an existing point and reindex the remaining points   |
| `setArrayOfCoordinates($tuples)` | Replace all points with newly constructed mutable points    |
| `getPoint($index)`               | Return the same mutable point instance at an existing index |
| `getPoints()` / `getElements()`  | Return an ordered array of the same mutable point instances |

Indexed access, replacement and removal require an existing non-negative index;
invalid addressing throws `OutOfBoundsException`. Unlike the immutable variants,
mutable paths do not wrap indices or accept negative indices. Failed membership,
coordinate or arc edits preserve the path and all referenced points. All mutation
methods return the receiver with return type `static`; there are no `with…`
methods or dimension setter.

```php
use LongitudeOne\SpatialTypes\Types\Dimension2\LineString;
use LongitudeOne\SpatialTypes\Types\Dimension2\Point;

$shared = new Point(0, null, 4326);
$first = new LineString([$shared], 4326);
$second = new LineString([$shared], 4326);
$first->addPoint(new Point(2, 3))->insertPoint(1, new Point(1, null));
$shared->setY(4); // Both lines now expose [0, 4] for their first point.
$first->setSrid(2154); // Updates the shared point, also observed through $second.
$first->setSrid(3857, false); // Updates only $first's declared reference.
```

`setSrid($srid, $propagate = true)`,
`setSpatialReference($reference, $propagate = true)` and
`setFamily($family, $propagate = true)` change the path's declared context.
By default, they also update every contained point, including shared instances in
other paths. Passing `false` changes only the receiver. None of these operations
transforms ordinates or updates the metadata of another containing path.
Returned point arrays cannot change membership, but their mutable points remain shared.

### Circular arc indexing

General point editing is available even for EMPTY or incomplete circular paths.
`setOrigin($point)` inserts the first point into an empty circular string or
replaces only its existing first point. `appendArc($passingPoint,
$destinationPoint)` appends two points after an origin followed by zero or more
complete pairs. Without an origin or after an incomplete pair, it throws
`InvalidValueException` without mutation.

| Arc index | Origin point index | Passing point index | Destination point index |
|-----------|--------------------|---------------------|-------------------------|
| `0`       | `0`                | `1`                 | `2`                     |
| `1`       | `2`                | `3`                 | `4`                     |
| `i`       | `2 * i`            | `2 * i + 1`         | `2 * i + 2`             |

```php
use LongitudeOne\SpatialTypes\Types\Dimension2\CircularString;
use LongitudeOne\SpatialTypes\Types\Dimension2\Point;

$path = new CircularString([]);
$path->setOrigin(new Point(0, 0))
    ->appendArc(new Point(1, 1), new Point(2, 0))
    ->appendArc(new Point(3, -1), new Point(4, 0));
$path->replaceArc(0, new Point(1, 2), new Point(2, 1));
// Point 0 is retained; points 1 and 2 are replaced.
// Point 2 is also the origin of arc 1, whose points 3 and 4 are retained.
```

`replaceArc()` requires all three positions of the addressed arc to exist and
throws `OutOfBoundsException` otherwise. Arc helpers check only this sequence
structure. They do not validate circle geometry, coordinate completeness or
continuity, close the path, repair points, or enforce geometric minimum counts.
Null ordinates, EMPTY points and incomplete point sequences remain representable.

## Mutable compound curves

`Types\Dimension2\CompoundCurve`, `Types\Dimension3z\CompoundCurve`,
`Types\Dimension3m\CompoundCurve` and `Types\Dimension4zm\CompoundCurve`
implement `MutableCompoundCurveInterface`. Their constructor is
`__construct(array $curves = [], int|SpatialReference $srid = 0,
SpatialModelEnum $family = SpatialModelEnum::GEOMETRY)`.

Only `MutableLineStringInterface` and `MutableCircularStringInterface` components
are accepted. Coordinate arrays, immutable curves and nested compound curves are
rejected without conversion. Components and their points must match the
compound curve's layout. They retain their identity, family and reference;
family/reference compatibility and geometric continuity require explicit
validation. Incomplete and empty component sequences remain representable.

| Operation                      | Behavior                                            |
|--------------------------------|-----------------------------------------------------|
| `addCurve($curve)`             | Append a component                                  |
| `insertCurve($index, $curve)`  | Insert before an index; the component count appends |
| `setCurve($index, $curve)`     | Replace an existing component                       |
| `removeCurve($index)`          | Remove an existing component and reindex            |
| `setCurves($curves)`           | Replace the entire ordered sequence atomically      |
| `getCurve($index)`             | Read an existing component                          |
| `getCurves()`, `getElements()` | Return the ordered component instances              |

All indices are zero-based. Negative indices and missing components raise
`OutOfBoundsException`; indexed access does not wrap. Invalid component arrays
and incompatible spatial mutation arguments raise `InvalidValueException`.
Non-spatial arguments to single-component mutations raise PHP `TypeError`.
Failures preserve membership and supplied components.
Successful mutations return the receiver as `static` for chaining. No `with…`
methods or dimension setter are exposed.

```php
use LongitudeOne\Core\Enum\SpatialModelEnum;
use LongitudeOne\SpatialTypes\Types\Dimension2\CircularString;
use LongitudeOne\SpatialTypes\Types\Dimension2\CompoundCurve;
use LongitudeOne\SpatialTypes\Types\Dimension2\LineString;
use LongitudeOne\SpatialTypes\Types\Dimension2\Point;

$point = new Point(0, null, 4326);
$line = new LineString([$point], 4326);
$arc = new CircularString([[10, 0], [11, 1], [12, 0]], 4326);
$path = new CompoundCurve([$line], 4326);
$other = new CompoundCurve([$line], 4326);
$path->addCurve($arc)->insertCurve(1, $line)->removeCurve(1);

assert($path->getCurve(0) === $line);
$point->setY(2); // Both paths now expose the changed point.
$path->setSrid(2154); // Updates both curves and all their points in place.
assert($other->getCurve(0)->getSrid() === 2154);
assert($other->getSrid() === 4326);
$path->setFamily(SpatialModelEnum::GEOGRAPHY, false); // Only this compound changes.
```

Construction, insertion and replacement retain the supplied instances without
cloning. Getters expose those instances; editing a component or its points is
visible to every owner. Modifying the returned PHP membership array itself does
not change the compound.

`setSrid()`, `setSpatialReference()` and `setFamily()` accept a second boolean
`$propagate` argument, defaulting to `true`. Propagation updates existing
components and their points recursively, including instances shared by other
owners. Passing `false` updates only the receiver. No context setter recalculates
coordinates, changes the compound's spatial type or changes its layout.
`toArray()` preserves component boundaries and their defining point tuples;
circular components are never flattened or approximated.

## Mutable polygons and triangles

`Polygon` and `Triangle` are available directly in `Types\Dimension2`,
`Types\Dimension3z`, `Types\Dimension3m`, and `Types\Dimension4zm`.
Both constructors have the same signature:

```text
new Polygon(array $rings, int|SpatialReference $srid = 0,
    SpatialModelEnum $family = SpatialModelEnum::GEOMETRY);
new Triangle(array $rings, int|SpatialReference $srid = 0,
    SpatialModelEnum $family = SpatialModelEnum::GEOMETRY);
```

Each input ring is a `MutableLineStringInterface` or an array of mutable points
and coordinate tuples. Arrays create mutable line strings and points using the
surface's current layout, family and reference. Supplied rings and points must
match that layout and retain their family, reference and identity. Immutable rings and points are rejected without
conversion, including immutable points exposed by a custom ring.

| Operation                                        | Effect                                              |
|--------------------------------------------------|-----------------------------------------------------|
| `addRing($ring)`                                 | Append a mutable line string                        |
| `insertRing($index, $ring)`                      | Insert before the addressed ring; the count appends |
| `removeRing($index)`                             | Remove an existing ring and reindex                 |
| `setRing($index, $ring)`                         | Replace one existing ring                           |
| `setPoint($ringIndex, $pointIndex, $point)`      | Replace one point in an existing ring               |
| `setArrayOfCoordinates($coordinates)`            | Replace all rings from coordinate tuples            |
| `getRing($index)`, `getRings()`, `getElements()` | Return the retained mutable ring instances          |

All successful mutations return the receiver as `static`. Ring and point indices
start at zero; access, replacement and removal require an existing element.
Negative indices and indices beyond the addressed sequence are rejected with
`OutOfBoundsException`. Failed addressing or technical input checks leave the
surface and shared descendants unchanged, including a late invalid tuple during
complete coordinate replacement.

```php
use LongitudeOne\Core\Enum\SpatialModelEnum;
use LongitudeOne\SpatialTypes\Types\Dimension2\LineString;
use LongitudeOne\SpatialTypes\Types\Dimension2\Point;
use LongitudeOne\SpatialTypes\Types\Dimension2\Polygon;
use LongitudeOne\SpatialTypes\Types\Dimension2\Triangle;

$ring = new LineString([[0, null], [3, 4]], 4326);
$polygon = new Polygon([$ring], 4326);
$triangle = new Triangle([$ring], 4326);
$replacement = new Point(7, null, 4326);

$samePolygon = $polygon->setPoint(0, 0, $replacement);
assert($polygon === $samePolygon);
assert($replacement === $triangle->getRing(0)->getPoint(0));
assert([[[7, null], [3, 4]]] === $triangle->toArray());

$polygon->setFamily(SpatialModelEnum::GEOGRAPHY, false); // Only the polygon.
$polygon->setSrid(2154); // Polygon, shared ring and every point.
assert(2154 === $triangle->getRing(0)->getSrid());
assert(4326 === $triangle->getSrid());
```

Construction, insertion and replacement retain supplied components without
cloning; getters expose the same instances. Changes to a shared ring or point
are visible in every surface containing it. Coordinate replacement creates new
descendants and leaves the previous rings and their other owners unchanged.

`setSrid()`, `setSpatialReference()` and `setFamily()` each accept a second
`bool $propagate = true` parameter. By default, they update all rings and points
recursively; `false` updates only the receiver. No ordinates are recalculated.
The instance's spatial type and coordinate layout remain fixed. Mutable surfaces
have no `with…` methods or dimension setter; immutable counterparts keep their
copy-producing operations and reject mutable components.

Open or incomplete rings, EMPTY rings, null ordinates and triangles with extra
points or rings remain representable. Editing preserves the supplied order and
does not close rings, synchronize endpoints, enforce orientation or validate
geometry. ISO/IEC CD 13249-3:201x(E), clauses 8.3.1 and 8.4.1, define the polygon
and triangle models; representing a value does not establish conformity with
those geometric definitions. Request functional checks through
[spatial-validator](validators.md) explicitly.

## Mutable polyhedral surfaces

`Types\Dimension3z\PolyhedralSurface` (XYZ) and
`Types\Dimension4zm\PolyhedralSurface` (XYZM) implement
`MutablePolyhedralSurfaceInterface`. XY and XYM surfaces are not introduced.

```text
new PolyhedralSurface(array $patches = [], int|SpatialReference $srid = 0,
    SpatialModelEnum $family = SpatialModelEnum::GEOMETRY);
```

Each patch is a `MutablePolygonInterface` or an array of rings, using the
[mutable polygon input contract](#mutable-polygons-and-triangles).
Arrays create mutable polygons, rings and points in the surface's layout,
family and reference. Supplied patches, rings and points must match the surface's
layout and retain their family, reference and identity;
immutable patches, rings and points are rejected without conversion, including
immutable descendants exposed by custom mutable components.

| Operation                                                | Effect                                                                |
|----------------------------------------------------------|-----------------------------------------------------------------------|
| `addPatch($patch)`                                       | Append a mutable polygon                                              |
| `insertPatch($index, $patch)`                            | Insert before a patch; the patch count appends                        |
| `removePatch($index)`                                    | Remove an existing patch and reindex                                  |
| `setPatch($index, $patch)`                               | Replace one existing patch                                            |
| `addRing($patchIndex, $ring)`                            | Append a ring in an existing patch                                    |
| `insertRing($patchIndex, $ringIndex, $ring)`             | Insert a ring; the addressed patch's ring count appends               |
| `removeRing($patchIndex, $ringIndex)`                    | Remove an existing ring from a patch                                  |
| `setRing($patchIndex, $ringIndex, $ring)`                | Replace one existing ring                                             |
| `setPoint($patchIndex, $ringIndex, $pointIndex, $point)` | Replace one point in an existing ring                                 |
| `setArrayOfCoordinates($coordinates)`                    | Replace the complete patch sequence from coordinates; `[]` empties it |
| `getPatch($index)`, `getPatches()`, `getElements()`      | Expose the retained mutable patches                                   |

Every successful mutation returns the receiver as `static`. Indices start at
zero at each nesting level; access, replacement and removal require existing
elements. Negative or out-of-range indices raise `OutOfBoundsException`.
Failed addressing and technical input checks leave the surface and shared
descendants unchanged, including a late invalid coordinate in full replacement.

```php
use LongitudeOne\Core\Enum\SpatialModelEnum;
use LongitudeOne\SpatialTypes\Types\Dimension3z\LineString;
use LongitudeOne\SpatialTypes\Types\Dimension3z\Point;
use LongitudeOne\SpatialTypes\Types\Dimension3z\Polygon;
use LongitudeOne\SpatialTypes\Types\Dimension3z\PolyhedralSurface;

$vertex = new Point(0, null, 5, 4326);
$equalVertex = new Point(0, null, 5, 4326);
$first = new Polygon([new LineString([$vertex, $equalVertex], 4326)], 4326);
$second = new Polygon([new LineString([$vertex], 4326)], 4326);
$surface = new PolyhedralSurface([$first, $second], 4326);
$otherOwner = new PolyhedralSurface([$second], 4326);

$vertex->setX(7);
assert([[[[7, null, 5], [0, null, 5]]], [[[7, null, 5]]]] === $surface->toArray());
assert([[[[7, null, 5]]]] === $otherOwner->toArray());
assert($first === $surface->getPatch(0));
assert($vertex === $surface->getPatch(1)->getRing(0)->getPoint(0));

$surface->setFamily(SpatialModelEnum::GEOGRAPHY, false); // Only the surface.
$surface->setSrid(2154); // Surface, patches, rings and points.
assert(2154 === $otherOwner->getPatch(0)->getSrid());
assert(4326 === $otherOwner->getSrid());
```

Construction, insertion and replacement never clone supplied components.
Editing one shared point changes every occurrence of that instance; distinct
points with equal coordinates remain independent. Replacing a point at one
address only changes that ring entry. No vertex detection, merging,
synchronization or neighboring-patch repair occurs. Complete coordinate
replacement creates new descendants and leaves previous components and their
other owners unchanged.

`setSrid()`, `setSpatialReference()` and `setFamily()` each accept
`bool $propagate = true`. By default, they update the receiver and all patches,
rings and points in place; `false` updates only the receiver. Ordinates never
change. Spatial type and layout stay fixed, and mutable surfaces expose neither
`with…` methods nor a dimension setter. Immutable counterparts retain their
separate copy contracts and reject mutable components.

EMPTY or incomplete patches, open rings and null ordinates remain representable.
Mutation does not enforce face validity, adjacency, closure or manifold rules.
ISO/IEC CD 13249-3:201x(E), clause 8.5.1, defines polyhedral-surface validity;
this representation API leaves its evaluation to explicit spatial-validator use.

## Mutable multi-objects and spatial collections

`MultiPoint`, `MultiLineString`, `MultiPolygon` and `SpatialCollection` are
available directly under each of `Types\Dimension2`, `Types\Dimension3z`,
`Types\Dimension3m` and `Types\Dimension4zm`. All four use this constructor:

```text
new MultiPoint(array $elements = [], int|SpatialReference $srid = 0,
    SpatialModelEnum $family = SpatialModelEnum::GEOMETRY);
```

| Mutable aggregate   | Accepted members                                        | Coordinate-array input                            |
|---------------------|---------------------------------------------------------|---------------------------------------------------|
| `MultiPoint`        | `MutablePointInterface`                                 | Point tuples                                      |
| `MultiLineString`   | `MutableLineStringInterface`                            | Arrays of points or tuples                        |
| `MultiPolygon`      | `MutablePolygonInterface`                               | Arrays of rings, points or tuples                 |
| `SpatialCollection` | `MutableSpatialInterface`, including nested collections | Not accepted: arrays do not identify member types |

Construction and `setElements()` support the listed coordinate arrays. Arrays
create mutable descendants in the receiver's current layout, family and
reference. Supplied spatial objects and descendants must match the receiver's
layout and retain their family, reference and identity. Immutable members and
immutable descendants are rejected without
conversion or cloning. A mutable triangle implements `MutablePolygonInterface`
and can therefore be retained by a mutable multi-polygon.

`SpatialCollection` is the family-independent mutable counterpart of
`GeometryCollectionImmutable` and `GeographyCollectionImmutable`. Changing its
family preserves both its concrete class and its instance identity.

| Operation, common to all four kinds   | Result                                                          |
|---------------------------------------|-----------------------------------------------------------------|
| `addElement($element)`                | Append a mutable member                                         |
| `insertElement($index, $element)`     | Insert before an index; the member count appends                |
| `setElement($index, $element)`        | Replace one existing member                                     |
| `removeElement($index)`               | Remove one existing member and reindex                          |
| `setElements($elements)`              | Replace complete ordered membership atomically; `[]` empties it |
| `getElement($index)`, `getElements()` | Expose the retained mutable instances                           |

`MultiPoint::getPoints()`, `MultiLineString::getLineStrings()` and
`MultiPolygon::getPolygons()` also expose the retained instances. Single-member
mutations take mutable spatial objects; coordinate arrays are accepted by the
constructor and complete replacement. Indices start at zero. Access,
replacement and removal require existing members; insertion accepts indices
from zero through the count. Invalid addressing raises `OutOfBoundsException`.
Wrong mutable member kinds, invalid membership arrays and immutable descendants
raise `InvalidValueException`, including immutable spatial arguments to single-member
mutators. Non-spatial arguments to those mutators raise PHP `TypeError`.
Technical input or addressing failures preserve
membership and referenced descendants, including late failures during complete
replacement. Successful mutations return the receiver as `static`.

Containment must be acyclic. Construction and every member-mutation path reject
already cyclic member graphs or a new direct/indirect reference back to the
receiver with `InvalidValueException` and the message
`Mutable aggregate members must not form reference cycles.` The failure changes
neither membership nor the context of any referenced instance. This is a
technical object-graph restriction, independent of geometric validation.
Repeated members and shared descendants in an acyclic graph remain supported.

```php
use LongitudeOne\Core\Enum\SpatialModelEnum;
use LongitudeOne\SpatialTypes\Types\Dimension2\LineString;
use LongitudeOne\SpatialTypes\Types\Dimension2\MultiLineString;
use LongitudeOne\SpatialTypes\Types\Dimension2\MultiPoint;
use LongitudeOne\SpatialTypes\Types\Dimension2\Point;
use LongitudeOne\SpatialTypes\Types\Dimension2\SpatialCollection;

$point = new Point(0, null, 4326);
$points = new MultiPoint([$point], 4326);
$line = new LineString([$point], 4326);
$lines = new MultiLineString([$line], 4326);
$collection = new SpatialCollection([$points, $lines], 4326);

$points->addElement(new Point(3, 4))->insertElement(1, $point);
$point->setX(7); // Both occurrences in $points and the point in $line change.
assert($point === $points->getElement(0));
assert([[[7, null]]] === $lines->toArray());

$collection->setFamily(SpatialModelEnum::GEOGRAPHY, false); // Only this collection.
$collection->setSrid(2154); // Nested aggregates, their members and all points.
assert(2154 === $point->getSrid());
assert([7, null] === $point->toArray()); // Coordinates are unchanged.
```

`setSrid()`, `setSpatialReference()` and `setFamily()` each accept
`bool $propagate = true`. By default, changes reach all descendants recursively,
including points in compound curves and polyhedral surfaces held by a
`SpatialCollection`. Propagation updates existing shared instances and is visible
to other owners of those instances. Passing `false` updates only the receiver.
Membership arrays returned by getters are PHP array values: editing that array
does not edit membership, while editing a returned spatial object does.

`toArray()` preserves member boundaries, including nested collection boundaries.
Complete coordinate replacement creates new mutable descendants and detaches the
previous members from this receiver without modifying their other owners.
Spatial type and coordinate layout remain fixed. Mutable aggregates expose no
`with…` operations or dimension setter.

EMPTY members, incomplete ordinates, duplicate points, open rings and other
geometrically invalid representable data are retained. Construction and editing
check coordinate-layout compatibility without geometric validation, repair,
transformation or dimensional conversion. ISO/IEC CD 13249-3:201x(E), clause 9.1.1,
defines the collection model and its validity requirements, including shared
spatial references. This representation API leaves those functional checks to
explicit [spatial-validator](validators.md) use.
