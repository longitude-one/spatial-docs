# Spatial validators

Symfony Validator `^5.4 || ^6.0 || ^7.0 || ^8.0` is supported. Versions below
5.4 and future major versions such as 9.x are not accepted. The library still
requires PHP 8.4 or later within PHP 8.x, independently of Symfony's requirements.
CI explicitly installs and verifies Validator 5.4.x, 6.4.x, 7.4.x and 8.1.x,
then runs the complete test suite for each version.

This library exposes Symfony Validator constraints for checking spatial values.
They are useful in two complementary situations:

- **Internal invariants** protect a value while it is built or updated. The
  library invokes the relevant validator and throws `InvalidValueException` or
  a compatibility exception when the invariant is not met.
- **Application rules** are opt-in. Create a Symfony validator and apply the
  constraint yourself; validation returns a `ConstraintViolationList` and does
  not alter the spatial value.

The second category is deliberately not imposed by constructors. For example,
a `LineString` can be non-simple when an application needs to retain imported
or invalid geometry for later review.

## Summary

| Constraint | Rule |
| --- | --- |
| `NoConsecutiveDuplicatePoints` | Adjacent points must differ. |
| `MinimumPointCount` | Requires at least the configured number of points (four by default). |
| `FirstPointEqualsLastPoint` | First and last points are equal. |
| `Ring` | Composes minimum point count, closure, and no consecutive duplicate points. |
| `Triangle` | Empty or one four-position exterior ring, validated through `Ring`, without holes. |
| `PolyhedralSurface` | Empty or connected planar 3D faces with simple rings and consistent shared edges; free edges are allowed. |
| `SameFamily` | Uses the requested `Geometry` or `Geography` family. |
| `SameDimension` | Uses the requested `XY`, `XYZ`, `XYM`, or `XYZM` layout. |
| `SameSpatialReference` | Uses the requested complete spatial reference. |
| `SimpleLineString` | Is simple in the XY projection; Z and M are ignored. |
| `SimpleThreeDimensionalLineString` | Is simple in XYZ space; M is ignored. |

### Application of constraints

| Constraint | Value | Applied internally | Typical external use |
| --- | --- | --- | --- |
| `NoConsecutiveDuplicatePoints` | `LineString` | Yes: `LineString` construction and coordinate replacement. | Audit an implementation of `LineStringInterface`. |
| `MinimumPointCount` | `LineString` | Through `Ring` when a polygon receives a ring. | Validate a candidate ring before building a polygon. |
| `FirstPointEqualsLastPoint` | `LineString` | Through `Ring` when a polygon receives a ring. | Validate a candidate ring. |
| `Ring` | `LineString` | Yes: polygon boundaries. | Validate a ring independently. |
| `Triangle` | `PolygonInterface` | Yes: triangle construction and coordinate replacement. | Check whether a polygon has triangle structure. |
| `PolyhedralSurface` | `PolyhedralSurfaceInterface` | Yes: construction and coordinate replacement. | Audit patch boundaries without requiring a closed solid. |
| `SameFamily` | Spatial value | Yes: aggregate membership. | Validate an incoming member against an expected family. |
| `SameDimension` | Spatial value | Yes: aggregate membership. | Validate an incoming member against an expected layout. |
| `SameSpatialReference` | Spatial value | Yes: aggregate membership. | Validate an incoming member against an expected reference. |
| `SimpleLineString` | `LineString` | No. | Apply the usual two-dimensional simplicity rule. |
| `SimpleThreeDimensionalLineString` | `XYZ`/`XYZM` `LineString` | No. | Apply a three-dimensional simplicity rule. |

“Applied internally” describes the library's public constructors and immutable
replacement methods. It does not mean every constraint is automatically run
when Symfony validates an object.

## Using a constraint externally

Create Symfony's validator, validate the value, then inspect the violation
list. No exception is thrown merely because the rule fails.

```php
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\LineString;
use LongitudeOne\SpatialTypes\Validator\Constraints\SimpleLineString;
use Symfony\Component\Validator\Validation;

$line = new LineString([[0, 0], [2, 2], [0, 2], [2, 0]]);
$violations = Validation::createValidator()->validate($line, new SimpleLineString());

if (0 !== count($violations)) {
    // The line self-intersects in XY.
}
```

Several constraints may be evaluated together:

```php
use LongitudeOne\SpatialTypes\Validator\Constraints\FirstPointEqualsLastPoint;
use LongitudeOne\SpatialTypes\Validator\Constraints\MinimumPointCount;
use LongitudeOne\SpatialTypes\Validator\Constraints\NoConsecutiveDuplicatePoints;
use LongitudeOne\SpatialTypes\Validator\Constraints\SimpleLineString;

$violations = Validation::createValidator()->validate($line, [
    new MinimumPointCount(),
    new FirstPointEqualsLastPoint(),
    new NoConsecutiveDuplicatePoints(),
    new SimpleLineString(),
]);
```

Use `Ring` instead of its three structural components when simplicity is not a
requirement. Add `SimpleLineString` separately when it is. `PolyhedralSurface`
composes `Ring` and `SimpleThreeDimensionalLineString` for each face boundary,
checks face planarity and tests oriented edge incidence and global connectivity.
Empty surfaces and single faces are accepted, but empty member faces are not.
The edge test splits common segments at existing vertices and ignores M. It
uses exact XYZ arithmetic, including in Geography, without geodesic modelling.
It does not validate arbitrary face-interior intersections, hole containment or
vertex-manifold topology. A surface can have free boundary edges; closure around
a solid is not required.

## Two-dimensional and three-dimensional simplicity

`SimpleLineString` checks only X/Y. An XY crossing is a violation even when
the segments use different elevations. This corresponds to the usual 2D
topological predicate.

`SimpleThreeDimensionalLineString` accepts only line strings with a Z ordinate
(`XYZ` or `XYZM`) and checks X/Y/Z. Two segments that cross in projection but
are at different elevations do not meet in 3D. M is not a spatial coordinate
for this rule and is ignored.

```php
use LongitudeOne\SpatialTypes\Types\Dimension3z\Geometry\LineString;
use LongitudeOne\SpatialTypes\Validator\Constraints\SimpleThreeDimensionalLineString;

$line = new LineString([[0, 0, 0], [2, 2, 0], [0, 2, 1], [2, 0, 1]]);
$violations = Validation::createValidator()->validate($line, new SimpleThreeDimensionalLineString());

// No violation: the projected crossing occurs at two different elevations.
```

## Compatibility constraints

The three compatibility constraints use the expected value as their
constructor argument. This mirrors the checks performed when a spatial value
is added to an aggregate.

```php
use LongitudeOne\Core\Enum\CoordinateDimensionEnum;
use LongitudeOne\Core\Enum\SpatialModelEnum;
use LongitudeOne\SpatialTypes\Reference\SpatialReference;
use LongitudeOne\SpatialTypes\Validator\Constraints\SameDimension;
use LongitudeOne\SpatialTypes\Validator\Constraints\SameFamily;
use LongitudeOne\SpatialTypes\Validator\Constraints\SameSpatialReference;

$violations = Validation::createValidator()->validate($line, [
    new SameFamily(SpatialModelEnum::GEOMETRY),
    new SameDimension(CoordinateDimensionEnum::XYZ),
    new SameSpatialReference(SpatialReference::fromSrid(2154), 'line string'),
]);
```

An SRID of `0` is a concrete unnamed spatial reference, not a wildcard. See
[Spatial reference systems](spatial-reference-systems.md) for the membership
rules and their rationale.

## Triangle structure

`Triangle` validates any `PolygonInterface`, including ordinary polygons and
third-party implementations. It accepts an empty boundary; otherwise it requires
exactly one exterior ring containing four positions and no interior rings
(ISO/IEC CD 13249-3, section 8.4). It composes `Ring` to check closure and
consecutive duplicate points. It does not test non-collinearity or full polygon
topology.

```php
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\Polygon;
use LongitudeOne\SpatialTypes\Validator\Constraints\Triangle;
use Symfony\Component\Validator\Validation;

$polygon = new Polygon([[[0, 0], [4, 0], [0, 4], [0, 0]]]);
$violations = Validation::createValidator()->validate($polygon, new Triangle());
```

Triangle values invoke this constraint through `TriangleValidation` during
construction and immutable coordinate replacements, in both families and all
four coordinate layouts. Invalid values raise `InvalidValueException`.
