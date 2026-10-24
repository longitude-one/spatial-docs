---
title: Coverage and rule catalogue
description: Identify supported spatial types, dimensions, elementary constraints, numerical policy and normative coverage limits.
sidebar_position: 4
---

Choose validation according to the declared spatial type and the property you need.
Dispatch support means that Symfony can select a constraint; it does not mean that every geometric calculation is implemented.
An unavailable check produces a warning rather than silently establishing validity.

## Type, family and dimension coverage

Geometry uses Cartesian coordinates. Geography represents geographic coordinates and requires geodetic calculations for topology.
Available structural and Point checks run for both families; Cartesian topology never substitutes for unavailable Geography calculations.

| Declared type | Geometry dimensions | Delivered ordinary validation | Non-empty Geography |
| --- | --- | --- | --- |
| Point | XY, XYZ, XYM, XYZM | Coordinate layout, finiteness, EMPTY consistency | Also inclusive angular bounds |
| LineString | XY, XYZ, XYM, XYZM | Members, minimum count, non-empty points, consecutive positions | Structural and Point rules |
| CircularString | XY, XYZ, XYM, XYZM | Members, odd point count, arc-defining positions | Structural and Point rules |
| CompoundCurve | XY, XYZ, XYM, XYZM | Line/arc members and endpoint continuity | Geodetic continuity warning |
| Polygon | XY, XYZ, XYM, XYZM | Rings, planarity and complete inter-ring topology | Available checks plus geodetic warnings |
| Triangle | XY, XYZ, XYM, XYZM | Shared surface rules, three distinct non-collinear vertices, no holes | Available checks plus geodetic warnings |
| GeometryCollection | XY, XYZ, XYM, XYZM | Recursive member validity and metadata | Each member's coverage applies |
| MultiPoint | XY, XYZ, XYM, XYZM | Point member validity and metadata | Point member rules |
| MultiLineString | XY, XYZ, XYM, XYZM | LineString member validity and metadata | LineString member rules |
| MultiPolygon | XY, XYZ, XYM, XYZM | Complete member validity and filled-surface pair checks | Member and pair-check warnings |
| PolyhedralSurface | XYZ, XYZM | Complete patches and open-allowed manifold topology | Available checks plus topology warning |

This matrix describes validators for compatible interface implementations and model variants where available.
PolyhedralSurface requires Z; XY and XYM candidates fail its dimension rule.
General collections allow different topological dimensions, such as a Point and a Polygon, while requiring the same exact coordinate variant.

The other 16 dispatched enum cases are **BRepSolid, Circle, Clothoid, CompoundSurface, Curve, CurvePolygon,
EllipticalCurve, GeodesicString, Geometry, MultiCurve, MultiSurface, NURBSCurve, Solid, SpiralCurve, Surface and TIN**.
Their admissible objects, including EMPTY, produce `<Type> validation is not implemented yet.` with default warning payload.
Several are dispatch placeholders without a concrete model type; they do not advertise constructible or geometrically validated objects.

Optional simplicity and closure have their own [contracts and limitations](./curves-and-surfaces.md).
In particular, ordinary LineString, CircularString and CompoundCurve validity does not require simplicity or closure.

## Elementary and optional rules

All names below belong to `LongitudeOne\SpatialValidator\Validator\Constraints`.
Apply a rule with `$validator->validate($value, new SpatialAssert\RuleName())`, after importing the namespace as `SpatialAssert`.

| Constraint | Input and purpose | Main diagnostic code |
| --- | --- | --- |
| `CoordinateLayout` | Point: declared ordinates and EMPTY consistency | `coordinatelayout-invalid` |
| `FiniteCoordinates` | Point: finite declared ordinates, including M | `finitecoordinates-invalid` |
| `GeographyBounds` | Point: Geography X/Y angular bounds | `geographybounds-invalid` |
| `Components` | Aggregate: types, metadata, cycles and recursive validation | `components-type`, `-family`, `-dimension`, `-reference`, `-cycle` |
| `MinimumPointCount(limit: 2)` | LineString: minimum count, with independent EMPTY allowance | `minimumpointcount-invalid` |
| `NonEmptyPoints` | LineString: no EMPTY Point members | `nonemptypoints-invalid` |
| `NoConsecutiveDuplicatePoints` | LineString: distinct consecutive spatial positions | `noconsecutiveduplicatepoints-invalid` |
| `FirstPointEqualsLastPoint` | LineString: closure only | `firstpointequalslastpoint-invalid` |
| `SimpleLineString` | Valid LineString and whole-curve simplicity | `simplelinestring-invalid` |
| `Ring` | Non-empty linear ring: validity, at least four positions, closure, simplicity | `ring-empty`; composed rule codes |
| `CircularPointCount` | CircularString: EMPTY or odd count of at least three | `circularpointcount-invalid` |
| `CircularArcPoints` | CircularString: non-empty defining positions and distinct middle position | `circulararcpoints-invalid` |
| `SimpleCircularString` | Valid CircularString and actual-arc simplicity | `simplecircularstring-invalid` |
| `SimpleCompoundCurve` | Valid CompoundCurve and whole-curve line/arc interactions | `simplecompoundcurve-invalid` |
| `SimpleMultiPoint` | Valid MultiPoint and distinct non-empty positions | `simplemultipoint-invalid` |
| `SimpleMultiLineString` | Valid simple members and boundary-only inter-member contacts | `simplemultilinestring-invalid` |
| `ClosedMultiLineString` | Valid non-empty aggregate with every member closed | `closedmultilinestring-invalid`; member closure codes |
| `ClosedPolyhedralSurface` | Valid non-empty closed surface enclosing volume | `closedpolyhedralsurface-invalid` |

For example, check a linear boundary explicitly:

```php
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\LineString;
use LongitudeOne\SpatialValidator\Validator\Constraints as SpatialAssert;
use Symfony\Component\Validator\Validation;

$boundary = new LineString([[0, 0], [4, 0], [0, 4], [0, 0]]);
$violations = Validation::createValidator()->validate($boundary, new SpatialAssert\Ring());
echo count($violations); // 0
```

`Components` does not validate the parent geometry by itself. Internal Polygon structure helpers are building blocks, not a public structural-only Polygon option.
See [surface contracts](./curves-and-surfaces.md#one-complete-polygon-constraint) and [diagnostic codes](./diagnostics-and-composition.md#paths-and-codes).

## Dimensions, bounds and numerical comparisons

| Variant | Spatial calculations | Additional checked ordinate |
| --- | --- | --- |
| XY | X, Y | None |
| XYZ | X, Y, Z | None |
| XYM | X, Y | M must be finite |
| XYZM | X, Y, Z | M must be finite |

For Geography Points, X is checked inclusively within `[-180, 180]` degrees and Y within `[-90, 90]` degrees.
For example, `(180, 90)` passes the bounds rule; `(180.1, 0)` fails it.
Geometry Points have no angular bounds. The validator does not look up CRS metadata, infer axis order or verify the CRS axis count.

Finite coordinate equality uses this approved LongitudeOne comparison, separately for each spatial ordinate:

```text
abs(a - b) <= PHP_FLOAT_EPSILON * max(1.0, abs(a), abs(b))
```

It includes Z when present and ignores M. Thus two XYM positions that differ only in M are spatially equal.
This is a floating-point comparison policy, not a configurable business distance tolerance or a general topology predicate.
Orientation, intersection, planarity, arc and volume calculations use robust intermediate predicates adapted to their quantities;
the delivered Geometry algorithms use exact rational/algebraic signs over the supplied finite binary coordinates.

No determinant threshold is obtained by blindly reusing the coordinate epsilon.
There is no extra proximity tolerance, snapping, rounding, merging or coordinate movement.
Nearby disjoint shapes do not become touching merely because the gap is small.
Approximate endpoint equality does not excuse a real interior crossing or replace the original coordinates.

## Normative sources and LongitudeOne choices

The primary SQL/MM source inspected for this documentation is **ISO/IEC CD 13249-3:201x(E), dated 2009-01-16**.
It is a Committee Draft, not a final published edition. OGC Simple Feature Access — Part 1: Common Architecture,
version 1.2.1, document 06-103r4, supplies the cited Simple Features definitions.

| Subject | Source context | Delivered profile or limitation |
| --- | --- | --- |
| Point and validity | ISO-CD 4.2.3, 5.1.10 | LongitudeOne layout, finiteness and inclusive Geography bounds |
| Curve properties | ISO-CD 4.2.4–4.2.7, 5.1.8–5.1.9 | Separate ordinary validity and explicit simplicity; Z used when present |
| Polygon | ISO-CD 4.2.9–4.2.10; OGC SFA 6.1.11.1 | Complete linear-ring topology; relative hole orientation produces warnings |
| Triangle | ISO-CD 8.4.1 Description 2–4; OGC SFA 6.1.11.1 | Declared Triangle interface/type; no shape inference |
| Typed collection members | ISO-CD 9.2.1 Description 7, 9.4.1 Description 3 | Valid EMPTY members retained; method restrictions are separate |
| MultiPolygon | OGC SFA 6.1.13.1, 6.1.14; ISO-CD 4.2.18–4.2.19 | Full coordinate space, including different XYZ planes |
| PolyhedralSurface | ISO-CD 4.2.12, 8.5.1 Description 2, 4, 6–7, 16–19; OGC SFA 6.1.12.1 | Open-allowed validity and separate non-empty closure |

The numerical comparison, warning severities, strict component identity, EMPTY collection profile and geographic coverage limits are approved LongitudeOne choices.
For MultiPolygon members in different XYZ planes with disjoint interiors, isolated boundary/interior contacts are permitted;
boundary/interior contact segments are forbidden by the approved LongitudeOne profile. That extra segment restriction is not attributed to an independently established OGC requirement.

The profile does not claim identical results for every SQL/MM operation, OGC operation or dimension projection.
It does not establish geodetic topology or general SQL/MM conformity.
ISO 19107, ISO 19111 and ISO 19136 provide wider spatial-schema, referencing and GML context; this validator does not implement their complete models or a GML parser.
The [SQL/MM reference](../../standards/iso/iso-iec-13249-3.md) explains the wider documentation scope.
