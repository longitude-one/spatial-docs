---
title: Curves, rings and surfaces
description: Select independent validity, simplicity and closure contracts, complete Polygon validation and explicit surface closure.
sidebar_position: 5
---

A route can cross itself and still be a valid LineString. A parcel boundary needs stronger rules: its ring must also be simple and closed.
Select the constraint for the property your application needs; a closed curve is not automatically simple.
See [simplicity validators](./simplicity-validators.md) for the optional constraints, illustrated examples and diagnostic messages.

## Independent curve properties

| Value | Ordinary validity | Explicit simplicity | Closure |
| --- | --- | --- | --- |
| Self-crossing LineString | Can pass | Fails `SimpleLineString` | Independent endpoint check |
| Open semicircle | Passes `CircularString` | Passes `SimpleCircularString` | Open |
| Retraced semicircle | Passes `CircularString` | Fails `SimpleCircularString` | Closed, but not a ring |
| Full circle | Passes `CircularString` | Passes `SimpleCircularString` | Closed |
| EMPTY curve | Passes ordinary and simplicity checks | Simple | Does not form a ring |

LineString validity requires either an empty point list or at least two valid non-EMPTY Points, without consecutive duplicate spatial positions.
`FirstPointEqualsLastPoint` checks linear closure alone. `Ring` composes line validity, at least four positions, closure and simplicity, and explicitly rejects EMPTY.
Ring's four-position minimum applies to linear boundaries, not circular curves.

## Validate actual circular arcs

A CircularString uses successive triples of positions to define arcs, sharing the previous arc's endpoint.
Non-empty curves need an odd count of at least three valid non-EMPTY Points; an arc's middle position must differ spatially from both endpoints.
A triple A,B,A represents a full circle. Collinear triples degenerate to their endpoint segment.

```php
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\CircularString;
use LongitudeOne\SpatialValidator\Validator\Constraints as SpatialAssert;
use Symfony\Component\Validator\Validation;

$validator = Validation::createValidator();
$open = new CircularString([[-1, 0], [0, 1], [1, 0]]);
$retraced = new CircularString([[-1, 0], [0, 1], [1, 0], [0, 1], [-1, 0]]);
$circle = new CircularString([[-1, 0], [0, 1], [1, 0], [0, -1], [-1, 0]]);

echo count($validator->validate($open, new SpatialAssert\SimpleCircularString())); // 0
echo count($validator->validate($retraced, new SpatialAssert\CircularString())); // 0
echo count($validator->validate($retraced, new SpatialAssert\SimpleCircularString())); // 1
echo count($validator->validate($circle, new SpatialAssert\SimpleCircularString())); // 0
```

![The open semicircle is simple, its retraced version is closed but non-simple, and complementary semicircles form a simple closed circle.](../../assets/images/spatial-validator/circular-properties.svg)

Simplicity checks the actual arcs and degenerate segments, including crossings, interior tangencies, overlapping or retraced intervals.
Allowed adjacent joins and one common start/end do not excuse a repeated interior position. Testing only the chords between defining positions would give incorrect results.
A circular ring must be non-empty, simple **and** closed; there is no separate public circular-ring constraint in this release scope.

`CompoundCurve` validates LineString/CircularString members and consecutive endpoint continuity, rejecting EMPTY contributing members.
A memberless compound curve is valid EMPTY. `SimpleCompoundCurve` additionally checks the whole curve,
including line/line, line/arc and arc/arc interactions across otherwise simple members.

Non-empty Geography topology produces unavailable-check warnings.
For XYZ/XYZM, an isolated full circle A,B,A is simple, but those positions do not determine its supporting plane for interactions with another arc.
Such undetermined interactions produce explicit warnings rather than inventing an XY plane; independently provable repeated-position errors still apply.

## One complete Polygon constraint

A Polygon has an exterior ring followed by zero or more interior rings that define holes.
`Polygon` validates the complete contract: structure, metadata, Point and Ring rules, a common plane, hole placement, boundary contacts and connected interior.
Generic `Spatial` selects that same complete Polygon validation.

This coplanar candidate has individually simple, closed rings, but its hole lies outside the exterior:

```php
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\Polygon;

$outsideHole = new Polygon([
    [[0, 0], [12, 0], [12, 12], [0, 12], [0, 0]],
    [[20, 2], [20, 4], [22, 2], [20, 2]],
]);

foreach ([new SpatialAssert\Polygon(), new SpatialAssert\Spatial()] as $constraint) {
    $violations = $validator->validate($outsideHole, $constraint);
    echo $violations->get(0)->getCode(); // polygon-outside
    echo $violations->get(0)->getPropertyPath(); // rings[1]
}
```

There is one public Polygon constraint, accepting standard Symfony groups/payload and no structural-only option.
Internal reusable structure helpers support composition; successful structural checks alone do not establish full Polygon validity.

| Ring relationship | Result |
| --- | --- |
| Hole inside exterior, holes mutually outside | Valid |
| Isolated tangent contacts preserving connected interior | Valid |
| Outside, nested or overlapping holes | Error |
| Crossing or shared boundary interval | Error |
| Contact chains or cycles disconnecting the interior | Error |
| Hole with exterior's relative orientation | Warning |

Orientation is relative to the exterior, without a universal clockwise-exterior requirement.
Reversing every ring preserves the relative result. Validation never reorients rings automatically.
Geometry XYZ/XYZM checks the actual supporting plane, including inclined or vertical planes, while ignoring M spatially.
Geography retains available checks and emits explicit warnings for unavailable closure, simplicity, planarity and topology calculations.

## Triangle is a declared contract

```php
$triangularPolygon = new Polygon([[[0, 0], [4, 0], [0, 4], [0, 0]]]);
echo count($validator->validate($triangularPolygon, new SpatialAssert\Spatial())); // 0: Polygon dispatch
echo count($validator->validate($triangularPolygon, new SpatialAssert\Triangle())); // 1: type violation
```

`Triangle` requires `TriangleInterface` and declared Triangle type. A plain Polygon is rejected even with triangular coordinates.
A non-empty Triangle needs four exterior positions A,B,C,A, three distinct non-collinear spatial vertices and no interior ring.
It reuses Polygon's elementary/internal rules without broadening its input contract or invoking the public Polygon constraint on an incompatible value.
Generic dispatch never infers a different type from a shape. Genuine EMPTY Triangle is valid.

## MultiPolygon and polyhedral surfaces

MultiPolygon recursively validates each Polygon/Triangle and checks filled surfaces, including holes.
Filled interiors must not overlap or intersect. Shared boundary intervals are invalid; isolated admissible contacts are permitted.
XYZ members need not share a plane: separate parallel planes with overlapping XY shadows can be valid.
The [MultiPolygon examples](./geometric-types.md#multipolygon-checks) explain the approved boundary/interior contact rule.

`PolyhedralSurface` validates complete Polygon/Triangle patches, surface intersections, edge incidence, opposite shared-edge direction,
edge connectivity and manifold vertex neighborhoods. Coplanar adjacent patches are permitted; a vertex-only contact cannot connect separate components.
It requires XYZ/XYZM and permits an open surface.

`ClosedPolyhedralSurface` adds a non-empty closed envelope: every subdivided boundary edge has two uses and the enclosed volume is nonzero.
It accepts global orientation reversal and does not close or repair the object.

```php
use LongitudeOne\SpatialTypes\Types\Dimension3z\Geometry\PolyhedralSurface;

$emptySurface = new PolyhedralSurface();
echo count($validator->validate($emptySurface, new SpatialAssert\PolyhedralSurface())); // 0
echo count($validator->validate($emptySurface, new SpatialAssert\ClosedPolyhedralSurface())); // 1
```

EMPTY patches are invalid inside a non-empty surface. An empty XYZ/XYZM surface is ordinarily valid but fails explicit closure.
Geography surface topology remains unavailable and emits warnings alongside available structural checks.
The open-allowed/default and non-empty/closed contracts are explicit LongitudeOne choices;
they do not assert that every closed-polyhedron statement and conditional closed-surface statement in the ISO draft are identical.
