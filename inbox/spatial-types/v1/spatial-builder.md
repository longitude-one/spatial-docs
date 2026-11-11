# Reusable spatial builder

`LongitudeOne\SpatialTypes\Builder\SpatialBuilder` is the one public builder
class. A context holds the representation, coordinate layout, Geometry or
Geography family, and declared spatial reference for new objects. It starts
as immutable XY Geometry with SRID 0.

```php
use LongitudeOne\Core\Enum\CoordinateDimensionEnum;
use LongitudeOne\Core\Enum\SpatialModelEnum;
use LongitudeOne\SpatialTypes\Builder\SpatialBuilder;
use LongitudeOne\SpatialTypes\Reference\SpatialReference;

$base = SpatialBuilder::create();
$geography = $base
    ->mutable()
    ->dimension(CoordinateDimensionEnum::XYM)
    ->family(SpatialModelEnum::GEOGRAPHY)
    ->srid(SpatialReference::epsg(4326));

$point = $geography->point(0, null, m: 7);
$line = $geography->lineString()->addPoint(0, null, m: 7);
$first = $line->build();
$second = $line->addPoint(1, 2, m: 8)->build();

assert($first !== $second);
assert([[0, null, 7]] === $first->toArray());
assert([[0, null, 7], [1, 2, 8]] === $second->toArray());
```

`immutable(): SpatialBuilder`, `mutable(): SpatialBuilder`,
`dimension(CoordinateDimensionEnum): SpatialBuilder`,
`family(SpatialModelEnum): SpatialBuilder`, and
`srid(int|SpatialReference): SpatialBuilder` return new contexts. Their source
remains reusable. Selecting an aggregate also returns a new `SpatialBuilder`
with the chosen configuration. Additions return that same aggregate builder.
Repeated `build(): SpatialInterface` calls create distinct aggregates and keep
the accumulated components. An aggregate builder without additions builds an
EMPTY object. A later addition does not change membership of earlier builds.

## Direct and progressive operations

Component additions accept `SpatialInterface` and reject the wrong spatial kind
or representation with `InvalidValueException`, implementing
`SpatialTypeExceptionInterface`. A rejected addition preserves accumulated
components and supplied objects. Non-spatial arguments still raise PHP
`TypeError`. The table identifies the component interfaces required for success.

| Direct creation | Selection | Additions on the selected builder | Required component |
| --- | --- | --- | --- |
| `point($x = null, $y = null, $z = null, $m = null): PointInterface` | — | — | — |
| `createLineString(array $points): LineStringInterface` | `lineString()` | `addPoint(...)`, `addPointComponent(SpatialInterface $point)` | `PointInterface` |
| `createCircularString(array $points): CircularStringInterface` | `circularString()` | `addPoint(...)`, `addPointComponent(SpatialInterface $point)` | `PointInterface` |
| `createMultiPoint(array $points): MultiPointInterface` | `multiPoint()` | `addPoint(...)`, `addPointComponent(SpatialInterface $point)` | `PointInterface` |
| `createCompoundCurve(array $curves = []): CompoundCurveInterface` | `compoundCurve()` | `addCurve(SpatialInterface $curve)` | `LineStringInterface` or `CircularStringInterface` |
| `createPolygon(array $rings): PolygonInterface` | `polygon()` | `addRing(SpatialInterface $ring)` | `LineStringInterface` |
| `createTriangle(array $rings): TriangleInterface` | `triangle()` | `addRing(SpatialInterface $ring)` | `LineStringInterface` |
| `createMultiLineString(array $lineStrings): MultiLineStringInterface` | `multiLineString()` | `addLineString(SpatialInterface $lineString)` | `LineStringInterface` |
| `createMultiPolygon(array $polygons): MultiPolygonInterface` | `multiPolygon()` | `addPolygon(SpatialInterface $polygon)` | `PolygonInterface` |
| `createPolyhedralSurface(array $patches = []): PolyhedralSurfaceInterface` | `polyhedralSurface()` | `addPatch(SpatialInterface $patch)` | `PolygonInterface` |
| `createCollection(array $elements = []): CollectionInterface` | `collection()` | `addElement(SpatialInterface $element)` | `SpatialInterface` |

`point()` and `addPoint()` have the same native signature in all layouts:
`float|int|string|null $x = null`, `float|int|string|null $y = null`,
`float|int|null $z = null`, `float|int|null $m = null`. Supply `m:` by name for
XYM. Non-null ordinates on unavailable axes are rejected. The context supplies
the reference, family, layout and representation; creation methods take no
additional SRID. PolyhedralSurface is available only in XYZ and XYZM.
Direct arrays follow the corresponding constructors. Collections require
spatial components rather than untyped coordinate arrays.

```php
use LongitudeOne\SpatialTypes\Builder\SpatialBuilder;

$builder = SpatialBuilder::create();
$point = $builder->point(0, null);
$line = $builder->createLineString([$point, [1, 2]]);
$collection = $builder->collection()
    ->addElement($point)
    ->addElement($line)
    ->build();

assert($point === $collection->getElements()[0]);
```

Supplied components retain their identity, reference and family. A mutable
component shared between aggregates remains shared, so edits are visible
through each owner. A builder does not convert components between mutable and
immutable representations; incompatible components are rejected before an
addition changes builder state and checked again on `build()`. Components made
from coordinate arrays use the context's representation, layout, family and
reference. Geometric validity remains the caller's responsibility.

The builder's local representation does not read or change the shared
`SpatialFactory` mode. The builder is public; its constructor selection helpers
under `lib/Internal` are implementation details and are absent from public
method signatures. See [public factories](public-factories.md) for the
independent static factory API and [direct construction](instantiable-spatial-types.md)
for constructor input contracts.
