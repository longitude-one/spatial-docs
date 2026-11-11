# Immutability

Spatial values are often reused in several places. Treating their coordinates
as immutable makes that reuse safe and makes a value's location explicit.

## Current contract

Concrete immutable spatial classes have an `Immutable` suffix and
are final and immutable through the public API. Former concrete names are removed,
without deprecated aliases. `Value\Coordinates` and `Reference\SpatialReference`
remain immutable auxiliary values with their existing names. An immutable object's coordinates, spatial reference,
and aggregate membership are set by its constructor, and it has no public
setter or membership mutator. `getCoordinates()` returns an immutable
`Value\Coordinates` value. `withCoordinates()` creates a distinct point with
replacement coordinates, while `withSpatialReference()` creates a distinct point with the
same coordinates and a different declared spatial reference.

```php
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\PointImmutable;
use LongitudeOne\SpatialTypes\Value\Coordinates;
use LongitudeOne\SpatialTypes\Reference\SpatialReference;

$paris = new PointImmutable(2.3522, 48.8566, 4326);
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

`LineStringImmutable`, `CircularStringImmutable`, `MultiPointImmutable`, and `PolygonImmutable` provide an equally immutable
point-replacement operation. `withPoint()` returns a deep copy: the source
aggregate, its rings, and its points remain unchanged.
Unchanged immutable components retain their complete
individual spatial references, including authority metadata, at every nesting
level. See [aggregate references](spatial-reference-systems.md#aggregate-references).

```php
use LongitudeOne\SpatialTypes\Types\Dimension3m\Geometry\LineStringImmutable;
use LongitudeOne\SpatialTypes\Types\Dimension3m\Geometry\MultiPointImmutable;

$line = new LineStringImmutable([[1, 2, 10], [3, 4, 20]], 2154);
$multiPoint = new MultiPointImmutable([[1, 2, 10], [3, 4, 20]], 2154);
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

`PolygonImmutable::withRing()` and `MultiLineStringImmutable::withLineString()` replace a
complete ring or line string from coordinate tuples. They also return deep
copies and preserve the source aggregate's family, dimension, and SRID.

```php
$expandedPolygon = $polygon->withRing(0, [
    [-1, -1], [11, -1], [-1, 11], [-1, -1],
]);
$updatedMultiLine = $multiLine->withLineString(1, [[5, 6], [7, 8]]);
$movedMultiLinePoint = $multiLine->withPoint(1, 0, Coordinates::xy(5, 6));
```

`MultiPolygonImmutable` follows the same rule at every nesting level:
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

`GeometryCollectionImmutable` and `GeographyCollectionImmutable` use `withElement()` to replace
one indexed element. The replacement must implement `ImmutableSpatialInterface`; unchanged elements are deeply copied.

## Independent copies

`ImmutableSpatialInterface::copy(): static` creates a deep copy without changing
the represented value. The concrete spatial type, coordinates, family, dimension,
membership order, and each component's complete spatial reference are preserved.
Every spatial descendant is a distinct instance; immutable auxiliary values
such as `Coordinates` and `SpatialReference` may be shared.

```php
$independentLine = $line->copy();
assert($independentLine !== $line);
assert($independentLine->getPoint(0) !== $line->getPoint(0));
assert($independentLine->toArray() === $line->toArray());
```

| Operation | Reference behavior |
| --- | --- |
| `copy()` | Preserve every component's own complete reference |
| Component replacement, such as `withPoint()` or `withElement()` | Copy unchanged components through their `copy()` contract |
| `withSpatialReference()` / `withSrid()` | Apply the requested reference recursively |

### Custom immutable implementations

**Breaking change:** every implementation of `ImmutableSpatialInterface`,
including implementations of its derived interfaces, must now provide
`public function copy(): static`. Classes supplied by this library already
implement it. Consumers that only use those classes need no migration.

A custom composite must copy each spatial child through its `copy()` method
while preserving the composite's own declared context. For a wrapper around an
immutable collection, the method can delegate to the wrapped value:

```php
public function copy(): static
{
    return new self($this->inner->copy());
}
```

Calling `withSpatialReference($this->getSpatialReference())` is not an equivalent
copy: that operation propagates the parent's reference and can overwrite a
child's different authority or identifier. A shallow `clone` is sufficient for
a point whose auxiliary values are immutable, but does not deeply copy a
composite's spatial children.

## Read, copy and mutation contracts

| Contract | Operations |
| --- | --- |
| `SpatialInterface` and type interfaces such as `PointInterface` | Read coordinates, metadata and members |
| `ImmutableSpatialInterface` and `Immutable<Type>Interface` | Read operations, `copy()`, and the applicable `with…` operations |
| `MutableSpatialInterface` and `Mutable<Type>Interface` | Read operations and mutation contracts; no `with…` operations |

`MutableSpatialInterface` declares `setFamily(SpatialModelEnum $family)`,
`setSpatialReference(SpatialReference $reference)` and `setSrid(int $srid)`, all
returning `static`. These metadata operations must preserve ordinates. Neither
variant has a dimension setter. Immutable concrete namespaces fix the family
and dimension; `withSpatialReference()` and `withSrid()` preserve them.

Mutable `Point` classes are available directly under each dimension namespace.
See [mutable points](instantiable-spatial-types.md#mutable-points) for constructors
and in-place operations. Mutable `LineString` and `CircularString` classes are also available directly under
each dimension namespace. See [mutable paths](instantiable-spatial-types.md#mutable-line-strings-and-circular-strings)
for point ownership, propagation and arc indexing. Mutable `CompoundCurve` classes also retain mutable curves and their points by
reference. See [mutable compound curves](instantiable-spatial-types.md#mutable-compound-curves)
for component editing and recursive context propagation. Mutable `Polygon` and `Triangle` classes retain rings and points by reference;
see [mutable surfaces](instantiable-spatial-types.md#mutable-polygons-and-triangles)
for ring editing and failure atomicity. Mutable `PolyhedralSurface` classes in XYZ and XYZM retain polygon patches, rings
and points by reference; see [mutable polyhedral surfaces](instantiable-spatial-types.md#mutable-polyhedral-surfaces)
for patch editing, shared vertices and propagation. Mutable multi-objects and
spatial collections are also available; see [aggregate ownership](#mutable-aggregate-ownership).
[Public factories](public-factories.md) select either representation through the
shared `SpatialFactory` mode, which defaults to immutable. Changing that mode
does not alter previously created values or direct-constructor behavior.

Immutable aggregate constructors and replacement paths accept only immutable
spatial components. Immutable component getters retain that contract: for example,
`ImmutablePolygonInterface::getRing()` returns `ImmutableLineStringInterface`,
and a ring's `getPoint()` returns `ImmutablePointInterface`.

Coordinate arrays remain supported and create immutable descendants. Mutable
objects, including mutable descendants inside a supplied custom aggregate, are
rejected without conversion or modification of the source or supplied objects.
Invalid array members and incompatible spatial components raise
`InvalidValueException`, implementing `SpatialTypeExceptionInterface`.
Concrete single-component methods accept `SpatialInterface` and check the
required immutable component contract internally; interface signatures retain
their specific types. Non-spatial arguments to those methods still raise PHP
`TypeError`. This ownership check does not validate
geometry, family, coordinate-dimension or reference compatibility.

## Why coordinates are immutable

Consider a point used by a line string, where that line string is then used by
a multi-line string:

```php
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\LineStringImmutable;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\MultiLineStringImmutable;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\PointImmutable;

$point = new PointImmutable(2.3522, 48.8566, 4326);
$line = new LineStringImmutable([
    $point,
    new PointImmutable(2.3600, 48.8600, 4326),
], 4326);
$multiLine = new MultiLineStringImmutable([$line], 4326);
```

`$point` is referenced by `$line`, and `$line` is referenced by `$multiLine`.
If a public operation such as `setX()` could change `$point`, the line and the
multi-line string would both change as an indirect side effect. A caller that
only holds `$multiLine` could therefore observe a geometry change without any
operation being made on it.

Because these points are immutable, that operation does not exist. Code that needs
another location creates another point and explicitly builds the spatial value
that should contain it. The represented value remains separate from functional validity checks.

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
use LongitudeOne\SpatialTypes\Types\Dimension4zm\Geometry\PointImmutable;
use LongitudeOne\SpatialTypes\Value\Coordinates;

$paris = new PointImmutable(2.3522, 48.8566, 28, 12, 4326);
$higherParis = $paris->withCoordinates(
    Coordinates::xyzm(2.3522, 48.8566, 42, 12)
);
```

`withCoordinates()` requires the same dimension as the receiving point. It
preserves its concrete class, family, and SRID. Numeric longitude/latitude
ranges are not checked.

## Aggregate types

The coordinate-replacement API applies to `PointImmutable`, `LineStringImmutable`, `MultiPointImmutable`,
and `PolygonImmutable` (including `TriangleImmutable`). `LineStringImmutable::withPoint()` and
`MultiPointImmutable::withPoint()` select a point; `PolygonImmutable::withPoint()` selects a ring then a point. All use the
immutable `Value\Coordinates` value, so a replacement must match the receiver's
coordinate dimension.

`PolygonImmutable::withRing()` selects a ring from coordinate tuples. `MultiLineStringImmutable::withPoint()` selects a line string then a point,
while `MultiLineStringImmutable::withLineString()` selects one of its line strings.
Both derive the expected coordinate layout from the receiver.

`MultiPolygonImmutable::withPoint()` selects a polygon, ring, then point.
`MultiPolygonImmutable::withRing()` selects a polygon then ring, while
`MultiPolygonImmutable::withPolygon()` replaces an entire polygon. Each operation
creates a deep copy of every polygon in the collection. `PolyhedralSurfaceImmutable`
uses patch indexes with `withPoint()`, `withRing()` and `withPatch()`. Its
`withArrayOfCoordinates()` replaces all patches atomically, or returns an empty
surface for `[]`. Indexed replacements on an empty surface are invalid.
Neighboring faces are never changed implicitly when editing a shared vertex.

`GeometryCollectionImmutable::withElement()` and `GeographyCollectionImmutable::withElement()`
replace one element and deeply copy every unchanged element.

Aggregate membership is fixed at construction. Their plural getters return PHP
arrays, so changing a returned array cannot change the aggregate; the objects
inside it are also immutable. Calling `withSpatialReference()` on an aggregate
creates a deep copy whose descendants all receive the requested reference.

See [Instantiable spatial types](instantiable-spatial-types.md#immutability-contract)
for the complete current mutability contract.

Circular strings also provide `withArrayOfCoordinates()` without functional
validity checks. Reference replacements preserve defining coordinates and copy
the contained points. Editing an endpoint does not automatically edit the
other end of a closed circular string.

Compound curves retain immutable ordered `ImmutableCurveInterface` components with
numeric or null coordinate tuples. Their `withSpatialReference()` and legacy
`withSrid()` operations deeply copy components without checking continuity.
Construct a new compound from replacement curves to change its path; modifying
a returned `getCurves()` array does not affect the original.

### Null point ordinates

`Coordinates` constructors and `withX()`, `withY()`, `withZ()`, and `withM()`
accept null for axes supported by the declared dimension. The original value
is preserved. Replacing point coordinates with an all-null value creates an
EMPTY copy; partial nulls preserve a non-empty point and its dimension.

```php
$partial = $paris->withCoordinates(Coordinates::xy(0, null));
assert([0, null] === $partial->toArray());
```

### Mutable path ownership

Mutable line strings and circular strings reject immutable point components
without conversion. Supplied mutable points are retained by reference on
construction, insertion and replacement; getters expose those same instances.
Mutating a shared point is observable through every path containing it.

Their declared-context setters accept a second `$propagate` argument, defaulting
to `true`. Propagation edits all contained points in place, so other paths sharing
those points observe the updated point metadata. Passing `false` updates only the
receiving path. Ordinates never change during a declared-context update.

### Mutable aggregate ownership

Mutable multi-points, multi-line strings, multi-polygons and `SpatialCollection`
retain supplied members and descendants by reference. Their common
`getElement()`/`getElements()` methods expose those same instances.
`setElement()` replaces one membership entry; editing a retained object is
visible through every aggregate referencing it. Complete `setElements()`
replacement checks all inputs before changing membership.

These aggregates reject immutable spatial components recursively. Containment
cycles are also rejected atomically; repeated members and shared descendants
remain supported when their references form an acyclic graph. Coordinate
arrays supported by the multi-object constructors and `setElements()` create
mutable descendants. The three context setters propagate through all members
by default; `false` changes only the receiver. Propagation modifies shared
instances without recalculating coordinates. See the
[aggregate API reference](instantiable-spatial-types.md#mutable-multi-objects-and-spatial-collections)
for signatures and examples.
