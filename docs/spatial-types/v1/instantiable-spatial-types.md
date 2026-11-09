---
title: Instantiable spatial types
description: Concrete spatial classes, constructors, accessors, implementation coverage and immutable replacement APIs in Spatial Types 1.x.
---

This reference documents the public, concrete spatial value types provided by
`longitude-one/spatial-types`. It covers their namespaces, direct constructors,
observable API, and mutation semantics.

## Type guides

Each guide explains a supported type with illustrations, availability, and
construction examples:

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
    // Implementation status is ⊘ to non-instantiable GeometryTypeEnum::GEOMETRY.
}
```

The following matrix covers every current enum case. ✅ indicates an affirmative
value and ❌ a negative value in the corresponding column. **⊘**
means that the request throws `InvalidValueException`, identifying the enum
case and its non-instantiable status. It never returns `false` for an abstract
type. In the implementation column, ❌ means that an instantiable type is not
yet fully implemented.

If a future instantiable enum case has no explicit classification, the API throws
`LongitudeOne\SpatialTypes\Exception\LogicException` with the case name.
This exception extends PHP's `LogicException` and implements
`SpatialTypeExceptionInterface`; it identifies an incomplete library
classification, rather than an unsupported spatial type. A test iterates all
enum cases to ensure this exception is not raised for the current model.

| `GeometryTypeEnum` | Instantiable | Fully implemented by `spatial-types` |
| --- | :---: | :---: |
| `GEOMETRY` | ❌ | ⊘ |
| `POINT` | ✅ | ✅ |
| `CURVE` | ❌ | ⊘ |
| `LINESTRING` | ✅ | ✅ |
| `CIRCULARSTRING` | ✅ | ✅ |
| `COMPOUNDCURVE` | ✅ | ✅ |
| `SURFACE` | ❌ | ⊘ |
| `CURVEPOLYGON` | ✅ | ❌ |
| `POLYGON` | ✅ | ✅ |
| `TRIANGLE` | ✅ | ✅ |
| `POLYHEDRALSURFACE` | ✅ | ✅ |
| `TIN` | ✅ | ❌ |
| `GEOMETRYCOLLECTION` | ✅ | ✅ |
| `MULTIPOINT` | ✅ | ✅ |
| `MULTICURVE` | ✅ | ❌ |
| `MULTILINESTRING` | ✅ | ✅ |
| `MULTISURFACE` | ✅ | ❌ |
| `MULTIPOLYGON` | ✅ | ✅ |
| `SOLID` | ❌ | ⊘ |
| `BREPSOLID` | ✅ | ❌ |
| `CIRCLE` | ✅ | ❌ |
| `CLOTHOID` | ✅ | ❌ |
| `COMPOUNDSURFACE` | ✅ | ❌ |
| `ELLIPTICALCURVE` | ✅ | ❌ |
| `GEODESICSTRING` | ✅ | ❌ |
| `NURBSCURVE` | ✅ | ❌ |
| `SPIRALCURVE` | ✅ | ❌ |

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

## Observing spatial values

All concrete types implement `SpatialInterface` and `JsonSerializable`.

| Method | Result |
| --- | --- |
| `getDimension()` | `CoordinateDimensionEnum` layout |
| `getFamily()` | `SpatialModelEnum` declaration |
| `getType()` | `GeometryTypeEnum` type |
| `getSrid()` | Integer reference identifier |
| `getSpatialReference()` | Complete reference, including authority |
| `hasZ()` / `hasM()` | Presence of the ordinate in the layout |
| `hasSameDimension($other)` | Whether layouts match |
| `toArray()` | Coordinate arrays, omitting type, family and reference |
| `jsonSerialize()` | Array with `type`, `coordinates` and `srid` keys |

Points expose `getX()`, `getY()`, `getLongitude()`, `getLatitude()` and
`getCoordinates()`. EMPTY points return `null` coordinates. `getZ()` and `getM()`
throw `BadMethodCallException` when the layout has no corresponding ordinate.
`equalsTo()` compares concrete class, family, integer SRID, layout and ordinates;
integer and float ordinates with the same exact numeric value compare equal.

Aggregates expose their ordered members through `getElements()` and typed
getters such as `getPoints()`, `getRings()`, `getLineStrings()`, `getPolygons()`,
`getPatches()` or `getCurves()`. Immutable indexed accessors wrap indexes and
support negative indexes; mutable indexed accessors require an existing
zero-based index. Empty indexed access raises `OutOfBoundsException`.

`CurveInterface` exposes nullable `getStartPoint()` and `getEndPoint()`.
The spatial interfaces do not expose `isEmpty()`, `isSimple()`, `isClosed()`
or `isLine()`. Validate those properties explicitly with Spatial Validator.

## Immutability contract

`ImmutableSpatialInterface` provides `copy()`, `withSpatialReference()` and
`withSrid()`. `copy()` deeply copies spatial descendants while preserving each
object's own declared context. Reference replacements instead assign the target
reference to the copied aggregate and all its descendants, without transforming coordinates.

| Immutable type | Coordinate or member replacement |
| --- | --- |
| Point | `withCoordinates(Coordinates $coordinates)` |
| Line string, circular string | `withPoint($pointIndex, $coordinates)`, `withArrayOfCoordinates($coordinates)` |
| Multi-point | `withPoint($pointIndex, $coordinates)` |
| Polygon, triangle | `withPoint($ringIndex, $pointIndex, $coordinates)`, `withRing($ringIndex, $coordinates)`, `withArrayOfCoordinates($coordinates)` |
| Multi-line string | `withPoint($lineIndex, $pointIndex, $coordinates)`, `withLineString($lineIndex, $coordinates)` |
| Multi-polygon | `withPoint($polygonIndex, $ringIndex, $pointIndex, $coordinates)`, `withRing(...)`, `withPolygon($polygonIndex, $coordinates)` |
| Polyhedral surface | `withPoint($patchIndex, $ringIndex, $pointIndex, $coordinates)`, `withRing(...)`, `withPatch(...)`, `withArrayOfCoordinates(...)` |
| Heterogeneous collection | `withElement($elementIndex, $element)` |

`Coordinates::xy()`, `xyz()`, `xym()` and `xyzm()` construct immutable numeric
or nullable tuples. Point replacements require the receiver's coordinate layout.
Polygon point replacements mirror the first and last ring positions when either
endpoint is selected. This editing convention does not validate the ring.
Compound curves are rebuilt from replacement components to change their path.

Plural getters return arrays whose membership can be edited locally without
altering the aggregate. Immutable descendants cannot be edited in place.
See [Immutability and mutability](immutability.md) for the benefits of each approach.

## Mutable values

Mutable classes expose setters and retain supplied mutable components by reference.
An edit to a shared point is visible through every aggregate containing it.
Their constructor's final family argument selects Geometry or Geography.

```php
use LongitudeOne\Core\Enum\SpatialModelEnum;
use LongitudeOne\SpatialTypes\Types\Dimension2\LineString;
use LongitudeOne\SpatialTypes\Types\Dimension2\Point;

$point = new Point(2.3522, 48.8566, 4326, SpatialModelEnum::GEOGRAPHY);
$line = new LineString([
    $point,
    new Point(2.36, 48.86, 4326, SpatialModelEnum::GEOGRAPHY),
], 4326, SpatialModelEnum::GEOGRAPHY);
$point->setX(2.35);
assert(2.35 === $line->getPoint(0)->getX());
```

Mutable and immutable components cannot be mixed in one aggregate.
`setSpatialReference()` and `setFamily()` propagate to descendants by default;
passing `false` as the second argument changes only the receiving declaration.
These setters do not validate geometric compatibility or transform coordinates.

## Diagnostic messages

Untrusted values included in exceptions raised by this library are formatted with
`LongitudeOne\Core\Diagnostic\DiagnosticValueFormatter`.
Control characters and invalid UTF-8 bytes are escaped visibly; each formatted
value is limited to 2,048 characters. Coordinate parsing is unchanged.
Previous exceptions retain their original messages. The formatter does not
escape messages for HTML, JSON, XML or SQL.
