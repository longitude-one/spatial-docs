---
title: Collections and EMPTY members
description: Validate collection members, preserve EMPTY values and distinguish geometric validity from SQL/MM method restrictions.
sidebar_position: 6
---

A collection groups spatial objects without discarding their identities.
A MultiPoint can retain an EMPTY Point alongside a measured position; validation checks both members and does not normalize the collection.
General GeometryCollection also permits valid EMPTY members and heterogeneous spatial types.

## All-EMPTY and mixed members

```php
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\LineString;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\MultiLineString;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\MultiPoint;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\Point;
use LongitudeOne\SpatialValidator\Validator\Constraints as SpatialAssert;
use Symfony\Component\Validator\Validation;

$validator = Validation::createValidator();
$emptyPoint = new Point();
$emptyLine = new LineString([]);
$allEmpty = new MultiPoint([$emptyPoint, $emptyPoint]);
$mixed = new MultiPoint([$emptyPoint, new Point(10, 20)]);
$allEmptyLines = new MultiLineString([$emptyLine]);
$mixedLines = new MultiLineString([$emptyLine, new LineString([[0, 0], [1, 1]])]);

foreach ([$allEmpty, $mixed, $allEmptyLines, $mixedLines] as $value) {
    echo count($validator->validate($value, new SpatialAssert\Spatial())); // 0 each
}
echo count($allEmpty->getPoints()); // 2: members are preserved
```

For GeometryCollection, MultiPoint, MultiLineString and MultiPolygon, an empty list and an all-EMPTY member list both represent the empty set under the validation profile.
A mixed list represents the non-empty members' spatial content while retaining its EMPTY members.
The validator computes the relevant aggregate state from members; it does not rewrite the object's `isEmpty()` accessor.
In the inspected model revision, some collection accessors report list emptiness, so a retained all-EMPTY list can still have `isEmpty() === false`.

| Aggregate or component           | Permitted members              | EMPTY members    | Additional ordinary requirements                                          |
| -------------------------------- | ------------------------------ | ---------------- | ------------------------------------------------------------------------- |
| GeometryCollection               | Any spatial type               | ✅ Allowed       | Available recursive validity; no cross-member disjointness                |
| MultiPoint                       | Points                         | ✅ Allowed       | Point rules and metadata                                                  |
| MultiLineString                  | LineStrings                    | ✅ Allowed       | LineString rules and metadata                                             |
| MultiPolygon                     | Polygons or Triangles          | ✅ Allowed       | Complete surfaces and pair topology                                       |
| **LineString components**        | **Points**                     | **EMPTY policy** | **Component rules**                                                       |
| LineString positions             | Points                         | ❌ Rejected      | Every Point in the position sequence must be non-EMPTY                    |
| **CircularString components**    | **Defining Points**            | **EMPTY policy** | **Component rules**                                                       |
| CircularString positions         | Points                         | ❌ Rejected      | Every arc-defining Point must be non-EMPTY                                |
| **CompoundCurve components**     | **Contributing curves**        | **EMPTY policy** | **Component rules**                                                       |
| CompoundCurve members            | LineStrings or CircularStrings | ❌ Rejected      | Every contributing curve must be non-EMPTY and joins must be continuous   |
| **Polygon components**           | **Boundary rings**             | **EMPTY policy** | **Component rules**                                                       |
| Polygon exterior                 | LineString ring                | ❌ Rejected      | A non-empty Polygon requires a non-EMPTY exterior ring                    |
| Polygon holes                    | LineString rings               | ❌ Rejected      | Every interior ring must be non-EMPTY                                     |
| **Triangle components**          | **Boundary rings**             | **EMPTY policy** | **Component rules**                                                       |
| Triangle exterior                | LineString ring                | ❌ Rejected      | Exactly four positions A–B–C–A; three distinct non-collinear vertices     |
| Triangle holes                   | None permitted                 | ❌ Rejected      | Interior rings are forbidden, whether EMPTY or non-empty                  |
| **PolyhedralSurface components** | **Surface patches**            | **EMPTY policy** | **Component rules**                                                       |
| PolyhedralSurface patches        | Polygons or Triangles          | ❌ Rejected      | Every patch must be non-EMPTY and valid; the surface requires XYZ or XYZM |

All members must keep the parent's Geometry/Geography family, exact XY/XYZ/XYM/XYZM variant,
and full spatial-reference identity: authority **and** identifier. Numeric SRID equality alone is insufficient if authorities differ.
Validation neither converts nor reprojects mismatched members.

The ❌ entries prohibit EMPTY components, not a genuinely EMPTY geometry with no components.
A LineString or CircularString with no Points, a CompoundCurve with no curves, and a Polygon or Triangle with no rings are valid EMPTY objects.
A memberless XYZ/XYZM PolyhedralSurface is also valid EMPTY; a stored list of EMPTY patches is rejected.
A Point has no component geometries: it is valid EMPTY when all its declared ordinates are absent, rather than only some of them.
An EMPTY Point is still prohibited inside a non-empty LineString; neither the exterior nor the holes of a Polygon may be EMPTY rings.
Likewise a contributing CompoundCurve member or PolyhedralSurface patch cannot be EMPTY.
Typed EMPTY collection membership does not remove these separate per-type rules.

## Optional aggregate properties

Continue with the validator and collections above:

```php
$duplicates = new MultiPoint([new Point(1, 2), new Point(1, 2)]);
echo count($validator->validate($duplicates, new SpatialAssert\MultiPoint())); // 0
echo count($validator->validate($duplicates, new SpatialAssert\SimpleMultiPoint())); // 1
echo count($validator->validate($allEmptyLines, new SpatialAssert\ClosedMultiLineString())); // 1
```

`SimpleMultiPoint` ignores absent EMPTY positions and rejects repeated non-empty spatial positions.
`SimpleMultiLineString` first validates and checks each member's simplicity, then permits inter-member contacts only at both members' boundaries.
A closed line has an empty boundary, so its closing vertex is not an allowed inter-member endpoint contact.

`ClosedMultiLineString` requires a non-empty aggregate and every member closed.
An EMPTY member fails explicit closure in a mixed aggregate. Simplicity and closure remain independent.
Non-empty Geography simplicity and closure calculations that are unavailable produce warnings; available structural checks still run.

## SQL/MM methods have a separate scope

The inspected ISO/IEC CD 13249-3:201x(E), 2009-01-16 Committee Draft, describes member well-formedness in
9.2.1 Description 7 for MultiPoint and 9.4.1 Description 3 for MultiLineString.
The approved LongitudeOne geometric profile permits valid EMPTY members rather than applying a blanket prohibition.
OGC SFA 1.2.1, 6.1.5 and 6.1.8–6.1.9 are the related collection definitions.

Specific SQL/MM mutation/cast paths impose stricter input restrictions:

| Inspected path | Consequence |
| --- | --- |
| `ST_MultiPoint.ST_Geometries(array)`, 9.2.3 → `ST_ToPointAry`, 16.1.8 → `ST_CheckNulls`, 16.1.6 | Rejects null or EMPTY elements |
| `ST_MultiLineString.ST_Geometries(array)`, 9.4.3 → `ST_ToLineStringAry`, 16.1.10 → `ST_CheckNulls`, 16.1.6 | Rejects null or EMPTY elements |

Constructor or mutation operations that traverse those support paths inherit their restrictions.
These are method-specific acceptance rules, not proof that every spatial object containing an EMPTY member is geometrically invalid.
The Symfony API validates spatial objects; it does not execute these SQL routines or promise their construction behavior.
