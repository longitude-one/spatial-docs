# Instantiable spatial types

This reference documents the public, concrete spatial value types provided by
`longitude-one/spatial-types`. It covers their namespaces, direct constructors,
observable API, and mutation semantics.

## Standards and model

The library follows the spatial-object model established by the
[OGC Simple Features Access standard](https://www.ogc.org/standards/sfa/) and
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

| `GeometryTypeEnum` | Instantiable | Fully implemented by `spatial-types` |
| --- | --- | --- |
| `GEOMETRY` | No | Not applicable |
| `POINT` | Yes | Yes |
| `CURVE` | No | Not applicable |
| `LINESTRING` | Yes | Yes |
| `CIRCULARSTRING` | Yes | Yes |
| `COMPOUNDCURVE` | Yes | Yes |
| `SURFACE` | No | Not applicable |
| `CURVEPOLYGON` | Yes | No |
| `POLYGON` | Yes | Yes |
| `TRIANGLE` | Yes | Yes |
| `POLYHEDRALSURFACE` | Yes | Yes |
| `TIN` | Yes | No |
| `GEOMETRYCOLLECTION` | Yes | Yes |
| `MULTIPOINT` | Yes | Yes |
| `MULTICURVE` | Yes | No |
| `MULTILINESTRING` | Yes | Yes |
| `MULTISURFACE` | Yes | No |
| `MULTIPOLYGON` | Yes | Yes |
| `SOLID` | No | Not applicable |
| `BREPSOLID` | Yes | No |
| `CIRCLE` | Yes | No |
| `CLOTHOID` | Yes | No |
| `COMPOUNDSURFACE` | Yes | No |
| `ELLIPTICALCURVE` | Yes | No |
| `GEODESICSTRING` | Yes | No |
| `NURBSCURVE` | Yes | No |
| `SPIRALCURVE` | Yes | No |

Full implementation is evaluated over the layouts applicable to the geometry
type, not over every layout in the library. `POLYHEDRALSURFACE` is fully
implemented for this API: both families provide XYZ and XYZM variants. This
does not add XY or XYM variants. The other eight implemented types are
available in both families for XY, XYZ, XYM and XYZM.

This API requires `spatial-core` 1.3 or newer within the 1.x series. The
library's minimum dependency has accordingly increased from 1.2 to 1.3.
The eight instantiable types added in `spatial-core` 1.3 are explicitly
classified as not yet implemented.
No existing spatial type or supported coordinate layout changes.

`ST_SpatialRefSys` is an SQL/MM spatial-reference-system metadata type rather
than a subtype of `ST_Geometry`; it is outside this value-type hierarchy. This
library identifies a reference with `Reference\SpatialReference`, which can
carry an authority and its integer identifier, without modelling a full
reference-system definition. The supplied ISO/IEC CD 13249-3:201x(E), section
8.5, names the polyhedral surface type `ST_PolyhdrlSurface`.

The `Geography` family is a library-level counterpart to the `Geometry` family;
it is not a separate `ST_Geography` branch in the SQL/MM hierarchy.

The library distinguishes two coordinate families:

- **Geometry** uses Cartesian `X, Y` coordinates. Numeric values are not range
  limited by this library.
- **Geography** uses geodetic `longitude, latitude` coordinates, still ordered
  as `X, Y`. Longitude must be in `[-180, 180]` and latitude in `[-90, 90]`.

The coordinate layouts are `XY`, `XYZ`, `XYM`, and `XYZM`; their tuple order is
always `X, Y[, Z][, M]`. `Z` is elevation and `M` is a measure. In particular,
an `XYM` tuple is `[x, y, m]`, whereas an `XYZ` tuple is `[x, y, z]`.

Every spatial object has a `SpatialReference`; `getSrid()` exposes its legacy
integer identifier. Constructors without a reference use identifier `0`, as
prescribed for SQL/MM constructors without an SRID. Identifier `0` is a real
unnamed reference in this model, not a compatibility wildcard: every member of
an aggregate must have exactly the aggregate's spatial reference.

See [Spatial reference systems](spatial-reference-systems.md) for the ISO/IEC
13249-3 rationale and examples of valid and invalid aggregate membership.
See [Spatial validators](validators.md) for the constraints available through
Symfony Validator, their constructor integration, and opt-in validation.

## Class catalogue

All classes in the following matrix are concrete and instantiable. The class
name is composed from the dimension, family, and type:

```php
LongitudeOne\SpatialTypes\Types\<dimension>\<family>\<type>
```

| Dimension         | Namespace segment | Coordinates  |
| ----------------- | ----------------- | ------------ |
| 2D                | `Dimension2`      | `X, Y`       |
| 3D with elevation | `Dimension3z`     | `X, Y, Z`    |
| 3D with measure   | `Dimension3m`     | `X, Y, M`    |
| 4D                | `Dimension4zm`    | `X, Y, Z, M` |

For each dimension, both `Geometry` and `Geography` provide:

| Type                     | Geometry class                  | Geography class                   |
| ------------------------ | ------------------------------- | --------------------------------- |
| Point                    | `…\Geometry\Point`              | `…\Geography\Point`               |
| Line string              | `…\Geometry\LineString`         | `…\Geography\LineString`          |
| Polygon                  | `…\Geometry\Polygon`            | `…\Geography\Polygon`             |
| Triangle                 | `…\Geometry\Triangle`           | `…\Geography\Triangle`            |
| Multi-point              | `…\Geometry\MultiPoint`         | `…\Geography\MultiPoint`          |
| Multi-line string        | `…\Geometry\MultiLineString`    | `…\Geography\MultiLineString`     |
| Multi-polygon            | `…\Geometry\MultiPolygon`       | `…\Geography\MultiPolygon`        |
| Heterogeneous collection | `…\Geometry\GeometryCollection` | `…\Geography\GeographyCollection` |

`PolyhedralSurface` is additionally available in `Dimension3z` and
`Dimension4zm`, in both families. Its faces require Z; XY and XYM variants are
not provided. It is a surface, not a heterogeneous collection or a solid.

For example, a four-dimensional geographic polygon is
`LongitudeOne\SpatialTypes\Types\Dimension4zm\Geography\Polygon`.

`AbstractSpatialType` and the other `Abstract*` classes are internal base
classes, not part of the instantiable API.

## Direct construction

The selected namespace determines both the coordinate dimension and family.
The optional `$srid` argument accepts `int|SpatialReference` and defaults to
the unnamed reference identified by `0` in every constructor.

### Point

```php
new Point($x, $y, int|SpatialReference $srid = 0);                 // Dimension2
new Point($x, $y, $z, int|SpatialReference $srid = 0);             // Dimension3z
new Point($x, $y, $m, int|SpatialReference $srid = 0);             // Dimension3m
new Point($x, $y, $z, $m, int|SpatialReference $srid = 0);         // Dimension4zm
```

`$x` and `$y` accept `int`, `float`, or a coordinate string accepted by the
geo-parser. `$z` and `$m` accept `int|float`. For Geography, `$x` means
longitude and `$y` means latitude.

Each coordinate parameter is nullable. Omitting every ordinate (or passing
`null` for every ordinate) creates an empty point; incomplete tuples are
invalid. This preserves the selected coordinate layout and optional SRID:

```php
$emptyPoint = new Point(srid: 4326);
assert($emptyPoint->isEmpty());
assert([] === $emptyPoint->toArray());
```

`FromIndexedArrayFactory::createPoint([])` creates the same empty point in its
requested family, dimension, and spatial-reference context. Empty points cannot
be added to point-defined aggregates such as `LineString` or `MultiPoint`.

```php
use LongitudeOne\SpatialTypes\Types\Dimension3z\Geography\Point;

$point = new Point(2.3522, 48.8566, 35, 4326); // longitude, latitude, elevation
```

### Immutable point coordinates

`LongitudeOne\SpatialTypes\Value\Coordinates` is a public immutable value
object for normalized numeric point coordinates. Its named constructors encode
the coordinate dimension: `Coordinates::xy()`, `Coordinates::xym()`,
`Coordinates::xyz()`, and `Coordinates::xyzm()`.

`PointInterface::getCoordinates()` returns this value object.
`PointInterface::withCoordinates(Coordinates $coordinates)` returns a new point
of the same concrete class and SRID. The supplied coordinates must have the
same dimension as the point; geographic points additionally validate longitude
and latitude ranges.

```php
use LongitudeOne\SpatialTypes\Value\Coordinates;

$higherPoint = $point->withCoordinates(Coordinates::xyz(2.3522, 48.8566, 42));
```

### Point-based types

```php
new LineString(array $points, int|SpatialReference $srid = 0);
new MultiPoint(array $points, int|SpatialReference $srid = 0);
```

`$points` may contain instances of `PointInterface` or coordinate tuples for
the selected dimension, for example `[[0, 0], [1, 1]]` for `XY` or
`[[0, 0, 12, 3], [1, 1, 15, 4]]` for `XYZM`.

```php
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\LineString;

$lineString = new LineString([[0, 0], [2, 1], [5, 1]], 3857);
```

### Ring-, line-, and polygon-based types

```php
new Polygon(array $rings, int|SpatialReference $srid = 0);
new Triangle(array $rings, int|SpatialReference $srid = 0);
new MultiLineString(array $lineStrings, int|SpatialReference $srid = 0);
new MultiPolygon(array $polygons, int|SpatialReference $srid = 0);
new PolyhedralSurface(array $patches = [], int|SpatialReference $srid = 0);
```

- A polygon ring is a `LineStringInterface` or an array of point tuples. Every
  supplied ring must be closed.
- A triangle uses the same ring representation as a polygon, with exactly four
  exterior positions (including closure) and no interior rings. `[]` represents
  an empty triangle; `[[]]` is invalid.
- A multi-line-string element is a `LineStringInterface` or an array of point
  tuples. Empty line strings are accepted in every dimension and both families;
  `[]` as an element creates an empty line string in the aggregate's context.
  Empty members retain their positions and must satisfy the same family,
  dimension, and complete spatial-reference checks as non-empty members.
- A multi-polygon element is a `PolygonInterface` or an array of rings. Empty
  polygons are accepted in every dimension and both families; `[]` as an
  element creates an empty polygon in the aggregate's context.
- A polyhedral-surface patch is also a `PolygonInterface` (including a triangle)
  or an array of rings. All patches must match the surface family, XYZ/XYZM
  layout and complete spatial reference. `new PolyhedralSurface()` or `[]`
  creates an empty surface; empty member patches are rejected. A single patch
  is accepted, as are open and closed assemblies: enclosing a volume is not
  required. Faces must be planar with finite XYZ coordinates and simple closed
  rings. Shared edges join at most two faces, in opposite directions, and the
  whole patch adjacency graph must be connected. Shared edges may have
  different vertex subdivisions. M does not participate in adjacency checks.
  These checks use exact floating-point comparisons in Cartesian XYZ, including
  for Geography; they do not compute geodesic edges. General face-interior
  intersections, hole containment and vertex-manifold topology are not checked.
  Direct construction is supported; no new public factory entry point is added.

```php
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\Polygon;

$polygon = new Polygon([
    [[0, 0], [4, 0], [4, 3], [0, 0]],
], 3857);
```

`new MultiLineString([])` has zero members, whereas
`new MultiLineString([[]])` has one empty member. `getElements()`,
`getLineStrings()`, `getLineString()` and `toArray()` preserve this distinction.
The current `MultiLineString::isEmpty()` checks whether it has zero members;
inspect the member arrays when the distinction matters.

`new MultiPolygon([])` has zero members and `isEmpty()` returns `true`.
`new MultiPolygon([[]])` and `new MultiPolygon([new Polygon([])])` each
contain one empty polygon and `isEmpty()` returns `false`. `getElements()`,
`getPolygons()` and `getPolygon()` expose that member, whose own `isEmpty()`
returns `true`. `toArray()` preserves the distinction as `[]` versus `[[]]`;
empty members in mixed collections retain their positions.

`withLineString($index, [])` replaces a member with an empty line string without
removing it. Replacing an empty member with non-empty coordinates preserves its
position too. Unchanged members are deeply copied with their full spatial
reference, including its authority. `withSpatialReference()` and `withSrid()`
preserve empty members while applying the requested reference to the copy.
The original value remains unchanged.

See [empty MultiLineString interoperability](empty-multilinestring-interoperability.md)
for the WKT/WKB verification and the current WKT parser limitation.

`TriangleInterface` extends `PolygonInterface`. All eight dimension/family
combinations provide a concrete `Triangle`:

```php
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\Triangle;

$triangle = new Triangle([[[0, 0], [4, 0], [0, 4], [0, 0]]], 3857);
$empty = new Triangle([]);
```

These structural constraints follow sections 4.2.11 and 8.4 of
ISO/IEC CD 13249-3:201x(E). The `Triangle` constraint enforces them and
composes `Ring` to reject unclosed rings and consecutive duplicate points.
It can also [validate ordinary polygons](validators.md#triangle-structure). Family, coordinate layout, geographic ranges and
spatial reference are validated as for polygons; non-collinearity and full
surface topology are not checked.

Triangles provide the polygon accessors and immutable replacement methods.
Copies preserve the concrete triangle class and enforce its structural
constraints. `getType()` returns `GeometryTypeEnum::TRIANGLE`; JSON uses
`Triangle` with the same nested coordinate representation as polygons.
Triangle factory entry points, SQL/MM visibility attributes and text/binary/GML
conversion routines are not currently exposed.

### Heterogeneous collections

```php
new GeometryCollection(int|SpatialReference $srid = 0, array $elements = []);
new GeographyCollection(int|SpatialReference $srid = 0, array $elements = []);
```

Collections accept their initial elements in their constructor. They accept any
non-collection spatial type with the same family and coordinate dimension.
Nested geometry/geography collections are rejected.

```php
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\GeometryCollection;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\Point;

$collection = new GeometryCollection(3857, [new Point(0, 0, 3857)]);
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
| `isEmpty(): bool`                                 | Whether the object corresponds to the empty set.                |
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
family, SRID, coordinate layout, and all applicable ordinates. `toArray()`
returns one tuple in the layout's order.

### Aggregate getters and predicates

| Type                                         | Element access                                               | Predicates                            |
| -------------------------------------------- | ------------------------------------------------------------ | ------------------------------------- |
| `LineString`                                 | `getPoints()`, `getPoint($index)`, `getElements()`           | `isEmpty()`, `isLine()`, `isClosed()` |
| `MultiPoint`                                 | `getPoints()`, `getPoint($index)`, `getElements()`           | `isEmpty()`, `isSimple()`             |
| `Polygon` / `Triangle`                       | `getRings()`, `getRing($index)`, `getElements()`             | `isEmpty()`                           |
| `MultiLineString`                            | `getLineStrings()`, `getLineString($index)`, `getElements()` | `isEmpty()`                           |
| `MultiPolygon`                               | `getPolygons()`, `getPolygon($index)`, `getElements()`       | `isEmpty()`                           |
| `PolyhedralSurface`                          | `getPatches()`, `getPatch($index)`, `getElements()`          | `isEmpty()`                           |
| `GeometryCollection` / `GeographyCollection` | `getElements()`                                              | `isEmpty()`, `hasElement($spatial)`   |

For point, ring, line-string, polygon, and patch single-element accessors, negative
indexes count from the end (`-1` is the last element). An index is wrapped by
the element count; accessing an empty aggregate raises `OutOfBoundsException`.

In the current implementation, `isLine()` is true for a line string with at
least two points. `isClosed()` requires a line and equal first/last points.
Use the Symfony constraint `Validator\\Constraints\\Ring` to validate a
linear ring: it requires at least four points and equal first and last points.

### Checking line-string simplicity

A `LineString` is allowed to be non-simple: construction and immutable update
methods do not reject self-intersections. When an application needs the
SQL/MM `ST_IsSimple` predicate, validate the value explicitly with Symfony's
validator and the `SimpleLineString` constraint:

```php
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\LineString;
use LongitudeOne\SpatialTypes\Validator\Constraints\SimpleLineString;
use Symfony\Component\Validator\Validation;

$lineString = new LineString([[0, 0], [2, 2], [0, 2], [2, 0]]);
$violations = Validation::createValidator()->validate($lineString, new SimpleLineString());

$isSimple = 0 === count($violations); // false: the two non-neighbouring segments cross
```

The constraint considers the `X, Y` projection only. Z and M ordinates are
ignored, so two segments that cross in `XY` are non-simple even if they have
different elevations or measures. It rejects proper crossings, tangencies and
overlaps; consecutive segments may share their common endpoint, as may the
first and last segments of a closed line. `Ring` validates only ring structure;
apply `SimpleLineString` separately when a simple ring is required. Polygon
topology, such as an inner-ring containment check, remains outside this
constraint.

### Checking three-dimensional line-string simplicity

For `XYZ` and `XYZM` line strings, use the separate
`SimpleThreeDimensionalLineString` constraint. It implements the spatial
three-dimensional check: X, Y and Z determine whether segments meet, while M
is ignored. Consequently, segments that cross in their XY projection at
different elevations are simple in 3D; segments meeting at the same XYZ
position are not, even if their M values differ.

```php
use LongitudeOne\SpatialTypes\Types\Dimension3z\Geometry\LineString;
use LongitudeOne\SpatialTypes\Validator\Constraints\SimpleThreeDimensionalLineString;
use Symfony\Component\Validator\Validation;

$lineString = new LineString([[0, 0, 0], [2, 2, 0], [0, 2, 1], [2, 0, 1]]);
$violations = Validation::createValidator()->validate($lineString, new SimpleThreeDimensionalLineString());

$isSimpleInThreeDimensions = 0 === count($violations); // true
```

Apply this constraint only to line strings that have a Z ordinate (`XYZ` or
`XYZM`). Use `SimpleLineString` when the required rule is the usual 2D
projection check.

## Immutability contract

Every spatial type is immutable through the public API: construction sets its
ordinates, SRID, and aggregate membership, and no public mutator exists.
`withCoordinates(Coordinates $coordinates): static` returns a point with
replacement coordinates of the same dimension; `withSpatialReference(SpatialReference $reference): static`
returns one with the same coordinates and a new declared reference.

`LineString`, `Polygon`, `Triangle`, and `PolyhedralSurface` provide
`withArrayOfCoordinates(array $coordinates): static`. These methods return a
new aggregate with replacement coordinates while preserving family, dimension,
and SRID. The line-string method accepts coordinate tuples; the polygon method
accepts arrays of rings. The receiving aggregate determines whether tuples are
XY, XYM, XYZ, or XYZM. For `PolyhedralSurface`, replacement coordinates are
arrays of patches and use XYZ or XYZM; `[]` returns an empty surface.

`LineString::withPoint(int $pointIndex, Coordinates $coordinates): static`
returns a deep copy with one replacement point. For polygons,
`Polygon::withPoint(int $ringIndex, int $pointIndex, Coordinates $coordinates): static`
uses a ring index followed by a point index. Replacing either endpoint of a
ring updates both endpoints to preserve its closure. Both methods retain the
family, dimension, and SRID of the receiving aggregate.

`MultiPoint::withPoint(int $pointIndex, Coordinates $coordinates): static`
returns a deep copy with one replacement point and preserves the receiving
multi-point's family, dimension, and SRID.

`Polygon::withRing(int $ringIndex, array $coordinates): static` replaces
one closed ring. `MultiLineString::withLineString(int $lineStringIndex, array
$coordinates): static` replaces one line string. Both return deep copies and
derive the expected XY, XYM, XYZ, or XYZM layout from the receiving aggregate.

`MultiLineString::withPoint(int $lineStringIndex, int $pointIndex, Coordinates
$coordinates): static` replaces one point in one line string and returns a deep
copy.

`MultiPolygon::withPoint(int $polygonIndex, int $ringIndex, int $pointIndex,
Coordinates $coordinates): static` replaces one point.
`MultiPolygon::withRing(int $polygonIndex, int $ringIndex, array
$coordinates): static` replaces one ring, and `MultiPolygon::withPolygon(int
$polygonIndex, array $coordinates): static` replaces one polygon. All three
methods return deep copies and preserve family, dimension, and SRID.
`PolyhedralSurface` provides `withPoint($patchIndex, $ringIndex, $pointIndex,
$coordinates)`, `withRing($patchIndex, $ringIndex, $coordinates)` and
`withPatch($patchIndex, $coordinates)` with the same deep-copy semantics.
Every replacement revalidates the complete surface. A local edit that breaks
adjacency is rejected; use `withArrayOfCoordinates()` to update several faces
atomically. Editing a shared vertex does not silently move neighbouring faces.
Empty surfaces reject indexed access and indexed replacements.

`GeometryCollection::withElement(int $elementIndex, SpatialInterface
$element): static` and `GeographyCollection::withElement(...)` replace one
element. They validate the replacement against the receiver and deeply copy the
unchanged elements.

All spatial types implement `withSpatialReference(SpatialReference $reference): static`.
For aggregates, it returns a deep copy whose contained values receive the
requested reference, so the result remains internally reference-consistent.
`withSrid(int $srid)` remains as a legacy integer adapter.

The constructors use these same validation paths. Aggregated values must be
compatible with the receiving type's family, dimension, and spatial-reference
rules; invalid coordinates, missing ordinates, incompatible family/dimension/reference, or a
non-ring polygon boundary cause the corresponding spatial exception.

`getPoints()`, `getRings()`, and the other plural getters return PHP arrays, so
changing the returned array does not alter the aggregate's membership. Their
contained objects are immutable too, so the retrieved object graph is safe to
share.

## Diagnostic messages

Untrusted values included in exceptions raised by this library are formatted with
`LongitudeOne\Core\Diagnostic\DiagnosticValueFormatter` (spatial-core 1.1+).
Control characters, invisible Unicode formatting characters and line separators
are escaped visibly; invalid UTF-8 bytes are escaped and each formatted value is
limited to 2,048 characters. This affects diagnostic output only, not coordinate parsing.
Caller-supplied dimension and family validation messages are formatted as a whole.

Previous exceptions from dependencies retain their original messages and formatting.
Exceptions constructed directly by application code retain PHP's standard constructor behavior.
The formatter does not escape messages for HTML, JSON, XML or SQL.

## Circular strings and the common curve contract

`Interfaces\CurveInterface` extends `SpatialInterface` and is the shared curve
contract implemented by `LineStringInterface`, `CircularStringInterface` and
`CompoundCurveInterface`. It provides `getStartPoint(): ?PointInterface`,
`getEndPoint(): ?PointInterface` and `isClosed(): bool`. Empty curves return
`null` endpoints and are not closed. Endpoint equality uses the existing
`PointInterface::equalsTo()` semantics, including all ordinates and their PHP
numeric types; no tolerance or coordinate normalization is introduced.

This is an approved breaking change before 1.0.0: third-party implementations
of these curve interfaces must implement the three common methods. Existing
concrete line-string closure behavior is preserved.

`Types\Dimension{2,3z,3m,4zm}\{Geometry,Geography}\CircularString` supports
XY, XYZ, XYM and XYZM in both families. Its constructor is:

```php
public function __construct(array $points, int|SpatialReference $srid = 0);
```

Pass defining `PointInterface` values or coordinate tuples, using the same
family, dimension and complete spatial-reference identity as the curve.
`[]` creates an empty circular string. A non-empty value requires an odd
number of at least three non-empty points. The first three points define one
arc; every subsequent pair adds its intermediate and end points, sharing the
preceding endpoint. An intermediate point must differ from both endpoints.

These rules follow ISO/IEC CD 13249-3:201x(E), clause 4.2.6 (the available
2009-01-16 Committee Draft), and clause 7.3.1, Description rules 4–12.
Consecutive duplicates are rejected as required by clause 7.3.3. Collinear defining points are valid and describe
a degenerate straight-line arc. Coincident start and end points describe a
complete circle, with the intermediate point opposite the start across the
circle's centre. Stored defining points are never replaced by a linear
approximation. A closed and simple circular string is a circular ring; this
API does not expose circular simplicity or ring predicates.

```php
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\CircularString;
use LongitudeOne\SpatialTypes\Value\Coordinates;

$arc = new CircularString([[0, 0], [1, 1], [2, 0]], 4326);
$circle = new CircularString([[1, 0], [-1, 0], [1, 0]], 4326);
$empty = new CircularString([], 4326);
$replacement = $arc->withPoint(1, Coordinates::xy(1, 2));
```

`getPoints()`, `getPoint($index)` and `getElements()` expose defining points.
Indexes wrap by the point count and negative indexes count from the end;
empty indexed access throws `OutOfBoundsException`. The ordinary spatial
methods report `CIRCULARSTRING`, coordinate dimension, family and reference.
`toArray()` contains the defining coordinate tuples.

`withPoint()` and `withArrayOfCoordinates()` preserve the curve's family,
dimension and complete reference. Each replacement validates the resulting
curve; `withArrayOfCoordinates([])` returns an empty curve. Reference changes
copy every point without transforming coordinates. Invalid point counts,
empty members and coincident intermediate/endpoints throw
`InvalidValueException`; dimension, family and reference mismatches retain
the existing spatial exception contracts. No parsing, serialization strategy,
linear approximation is performed.

## Compound curves

`Types\Dimension{2,3z,3m,4zm}\{Geometry,Geography}\CompoundCurve` implements
`CompoundCurveInterface` in XY, XYZ, XYM and XYZM. Construct it with ordered
`CurveInterface` components and an optional integer or `SpatialReference`:

```php
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\CircularString;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\CompoundCurve;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\LineString;

$curve = new CompoundCurve([
    new LineString([[0, 0], [1, 1]], 4326),
    new CircularString([[1, 1], [2, 2], [3, 1]], 4326),
], 4326);
$empty = new CompoundCurve([], 4326);
```

`new CompoundCurve()` creates an empty XY Geometry value with SRID 0 when
using the class imported above. Components must report `LINESTRING` or
`CIRCULARSTRING`; nested compounds and other curve types are not supported.
Empty components are rejected because they cannot supply connection endpoints.
Each component retains its own invariants and must match the compound's family,
coordinate dimension and complete spatial-reference identity. Consecutive
components must have equal end/start points; discontinuity raises
`InvalidValueException`. Family, dimension and reference mismatches use the
existing corresponding spatial exceptions. Valid components are preserved as
objects without flattening, reversal or linear approximation.

`getCurves()` and `getElements()` expose the ordered components as
`CurveInterface[]`. `getCurve($index)` uses wrapping indexes and negative
indexes from the end; EMPTY indexed access raises `OutOfBoundsException`.
`getStartPoint()` and `getEndPoint()` expose the outer endpoints. `isClosed()`
compares those endpoints after construction has enforced intermediate
continuity. Closure does not claim simplicity; no compound ring or simplicity
predicate is added. `getType()` returns `GeometryTypeEnum::COMPOUNDCURVE`.
`toArray()` contains one array of defining coordinate tuples per component;
use component accessors when interpolation identity is needed. The inherited
JSON representation uses type `CompoundCurve`, these coordinates, and SRID;
it is not a GeoJSON or interchange-format implementation.

`withSpatialReference()` deeply copies components and their points and
revalidates continuity, without transforming coordinates. `withSrid()` is the
legacy integer adapter. Reconstruct a compound from replacement component
curves to change its path; returned component arrays cannot mutate membership.

The normative basis is ISO/IEC CD 13249-3:201x(E), the available 2009-01-16
Committee Draft: clauses 4.2.7 and 7.4.1 (component types, continuity and empty
values), and 7.4.6–7.4.7 (endpoints, including `null` for EMPTY). The library's
point equality semantics govern continuity as required by Story #25. This
feature adds no serialization, decoding, linearization or factory entry points.
