# Spatial reference systems

Every spatial value has a `Reference\SpatialReference`. It identifies the
spatial reference system (SRS) through an integer identifier and, when known,
its authority. For example, `SpatialReference::epsg(4326)` represents
`EPSG:4326`.

`getSrid()` remains available as the legacy integer view of that reference.
Use `getSpatialReference()` when the authority must be retained or compared.

## Aggregate references

Constructors retain each supplied member's declared reference without checking
it against the aggregate. Identifier `0` identifies an unnamed reference; it
is not rewritten when an object is inserted into an aggregate.

Coordinate tuples are hydrated using the receiving aggregate's reference.
`withSpatialReference()` instead deeply copies members with the requested
reference. Neither operation transforms coordinates.

Immutable `copy()` and component replacement preserve the complete
reference of every unchanged component, including its authority and identifier.
Nested components keep their individual references even when they differ from
their parent's reference. The components are still deeply copied; the original
geometry and its coordinates remain unchanged.
This includes accepted custom immutable components, whose `copy(): static`
implementation must follow the same contract. See
[custom immutable implementations](immutability.md#custom-immutable-implementations)
for the interface migration requirement.

```php
use LongitudeOne\SpatialTypes\Reference\SpatialReference;

$reference = SpatialReference::epsg(4326);
$line = new \LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\LineStringImmutable([
    new \LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\PointImmutable(1, 2, $reference),
    new \LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\PointImmutable(3, 4, $reference),
], $reference);
$copy = $line->withPoint(0, \LongitudeOne\SpatialTypes\Value\Coordinates::xy(10, 20));

assert('EPSG' === $copy->getPoint(1)->getSpatialReference()->authority);
assert(4326 === $copy->getPoint(1)->getSrid());
assert([3, 4] === $copy->getPoint(1)->toArray());
```

Spatial-reference compatibility is a functional validation concern and must be
checked explicitly by consumers. See [Spatial validation](validators.md).

## Changing a reference is not a transformation

`withSpatialReference()` creates an immutable copy and changes only its declared
reference. It does not change coordinates and therefore does not perform a
coordinate transformation. `withSrid()` is the legacy integer equivalent.

Mutable points provide `setSpatialReference()`, `setSrid()` and `setFamily()`
for changing the declared context on the same instance. These setters return
that instance and preserve every ordinate, including null values.

To obtain a valid value in a different SRS, calculate new coordinates with an
external transformer, then create or update a value with those coordinates and
the target `SpatialReference`.

```php
use LongitudeOne\SpatialTypes\Reference\SpatialReference;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geometry\PointImmutable;
use LongitudeOne\SpatialTypes\Value\Coordinates;

$paris = new PointImmutable(2.3522, 48.8566, SpatialReference::epsg(4326));
$lambert93 = $paris->withSpatialReference(SpatialReference::epsg(2154));
$lambert93 = $lambert93->withCoordinates(Coordinates::xy(652469.0227, 6862035.2594));
```

The Lambert 93 ordinates in this example must be calculated by that external
transformer; this library intentionally does not provide it.

Mutable line strings and circular strings propagate declared-context updates to
contained points by default. Mutable polygons and triangles recursively propagate to rings and their points.
Mutable compound curves recursively propagate to
all components and their points. Their `setSrid()`, `setSpatialReference()` and
`setFamily()` methods accept `$propagate = false` to change only the receiver.
Propagation changes shared instances, so their other owners observe the updated
member context while retaining their own aggregate context. Coordinates are
never recalculated.
