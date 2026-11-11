# Public spatial factories

Use a type-specific static factory to create a supported spatial object in the
current mutable or immutable mode. Select the mode once for the execution;
all public type-specific factories and their consumers share it.
Direct constructors remain available and do not consult this setting.
For local configuration and progressive assembly, use the
[reusable spatial builder](spatial-builder.md).

## Select the shared mode

```php
use LongitudeOne\SpatialTypes\Factory\Dimension2\Geography\PointFactory;
use LongitudeOne\SpatialTypes\Factory\SpatialFactory;
use LongitudeOne\SpatialTypes\Types\Dimension2\Geography\PointImmutable;
use LongitudeOne\SpatialTypes\Types\Dimension2\Point;

assert(!SpatialFactory::isMutable()); // Initial setting in a fresh execution.
$first = PointFactory::create(0, null, 4326);
assert($first instanceof PointImmutable);

SpatialFactory::mutable();
assert(SpatialFactory::isMutable());
$second = PointFactory::create(0, null, 4326);
assert($second instanceof Point);
$second->setX(2.5);

SpatialFactory::immutable();
$third = PointFactory::create(0, null, 4326);
assert($third instanceof PointImmutable);
assert([0, null] === $first->toArray());
assert([2.5, null] === $second->toArray());
```

`SpatialFactory::immutable(): void` and `SpatialFactory::mutable(): void`
select the mode for subsequent calls. `SpatialFactory::isMutable(): bool`
reports it. Repeating a selection is harmless. Switching never converts,
clones, freezes or edits previously created objects.

The selection is global within the same PHP execution, including different
libraries using these factories. If one consumer selects mutable output,
another consumer's next creation call also produces mutable output. There is
no mode argument on individual `create()` calls and no per-factory setting.

## Find a factory

Factories live under:

```text
LongitudeOne\SpatialTypes\Factory\<dimension>\<family>\<type>Factory
```

| Coordinate layout | Dimension segment | Family segments |
| --- | --- | --- |
| XY | `Dimension2` | `Geometry`, `Geography` |
| XYZ | `Dimension3z` | `Geometry`, `Geography` |
| XYM | `Dimension3m` | `Geometry`, `Geography` |
| XYZM | `Dimension4zm` | `Geometry`, `Geography` |

Each combination provides `PointFactory`, `LineStringFactory`,
`CircularStringFactory`, `CompoundCurveFactory`, `PolygonFactory`,
`TriangleFactory`, `MultiPointFactory`, `MultiLineStringFactory` and
`MultiPolygonFactory`. `Geometry` additionally provides
`GeometryCollectionFactory`; `Geography` provides `GeographyCollectionFactory`.
`PolyhedralSurfaceFactory` is available for XYZ and XYZM in both families.
This gives 84 public factories; unsupported types and layouts are not added.

The namespace fixes the layout and family. In immutable mode the result is
the final `Types\<dimension>\<family>\<type>Immutable` class. In mutable mode
it is `Types\<dimension>\<type>`, with its family selected by the factory.
Both heterogeneous collection factories create the corresponding dimension's
mutable `SpatialCollection` in mutable mode.

For example, `Factory\Dimension2\Geography\PointFactory` returns either
`Types\Dimension2\Geography\PointImmutable` or `Types\Dimension2\Point`
with `SpatialModelEnum::GEOGRAPHY`. Method return types declare the two
concrete alternatives; read-only consumers can use their common interfaces.
There are no separate mutable and immutable factory classes.

## Creation arguments

`create()` uses the parameter names, native types, order and defaults of the
corresponding immutable constructor. The same arguments work in both modes;
mutable constructor differences are handled internally. Family is fixed by
the factory namespace. `$srid` accepts `int|SpatialReference` and defaults to `0`.

| Factory | Arguments to `create()` |
| --- | --- |
| XY `PointFactory` | `$x = null, $y = null, $srid = 0` |
| XYZ `PointFactory` | `$x = null, $y = null, $z = null, $srid = 0` |
| XYM `PointFactory` | `$x = null, $y = null, $m = null, $srid = 0` |
| XYZM `PointFactory` | `$x = null, $y = null, $z = null, $m = null, $srid = 0` |
| `LineStringFactory`, `CircularStringFactory`, `MultiPointFactory` | `array $points, $srid = 0` |
| `CompoundCurveFactory` | `array $curves = [], $srid = 0` |
| `PolygonFactory`, `TriangleFactory` | `array $rings, $srid = 0` |
| `MultiLineStringFactory` | `array $lineStrings, $srid = 0` |
| `MultiPolygonFactory` | `array $polygons, $srid = 0` |
| `PolyhedralSurfaceFactory` | `array $patches = [], $srid = 0` |
| `GeometryCollectionFactory`, `GeographyCollectionFactory` | `$srid = 0, array $elements = []` |

X/Y accept `float|int|string|null`; coordinate strings use the constructor's
geo-parser path. Z/M accept `float|int|null`. Arrays accept the component and
coordinate-array forms of the selected constructor. Technical input failures
retain the constructor's exceptions. See [direct construction](instantiable-spatial-types.md#direct-construction)
for details.

## Nested coordinate arrays and ownership

```php
use LongitudeOne\SpatialTypes\Factory\Dimension4zm\Geography\MultiPolygonFactory;
use LongitudeOne\SpatialTypes\Factory\SpatialFactory;
use LongitudeOne\SpatialTypes\Reference\SpatialReference;

SpatialFactory::mutable();
$polygons = MultiPolygonFactory::create(
    polygons: [[[[0, null, 12, 7]]], []],
    srid: SpatialReference::epsg(4326)
);
```

Every descendant created from these arrays is mutable: polygons, rings and
points. In immutable mode they are all immutable instead. Array-created
members receive the factory's layout, family and declared reference. Empty
members, supplied null ordinates and coordinate nesting are preserved.
Construction does not repair or validate the geometry.

Supplied spatial objects retain the identity, metadata and ownership behavior
of their constructors. Mutable aggregates retain mutable components by
reference; editing a shared component is visible through every owner.
Immutable aggregates retain supplied immutable components. Neither mode
implicitly clones or converts an opposite-representation component. Opposite
representations are rejected, including descendants of nested aggregates.
Changing the global mode does not make an earlier component compatible with
the new mode.

## Heterogeneous collections

Assemble collections from explicitly typed components created in the same mode:

```php
use LongitudeOne\SpatialTypes\Factory\Dimension2\Geometry\GeometryCollectionFactory;
use LongitudeOne\SpatialTypes\Factory\Dimension2\Geometry\LineStringFactory;
use LongitudeOne\SpatialTypes\Factory\Dimension2\Geometry\PointFactory;
use LongitudeOne\SpatialTypes\Factory\SpatialFactory;

SpatialFactory::immutable();
$point = PointFactory::create(0, null, 4326);
$line = LineStringFactory::create([[1, 2]], 4326);
$nested = GeometryCollectionFactory::create(4326, [$line]);
$collection = GeometryCollectionFactory::create(4326, [$point, $nested]);
assert([$point, $nested] === $collection->getElements());
```

Collections accept supported spatial components, including nested collections.
They do not infer component types from untyped coordinate arrays and do not
require a typed-tree format. Compound curves similarly require explicit
supported curve components.

## Read, copy and mutation contracts

| Representation | Public contract | Ownership |
| --- | --- | --- |
| Both | `SpatialInterface` and common type interfaces expose read operations | Layout and spatial type stay fixed |
| Immutable | Final classes named `…Immutable`; `Immutable<Type>Interface` exposes the applicable `with…` methods | Copies leave their source unchanged |
| Mutable | `Mutable<Type>Interface` exposes the applicable `set…`, `add…` and `remove…` methods | Successful edits return the same instance; shared members observe edits |

`with…` methods belong exclusively to immutable variants. Mutable objects have
no `with…` methods; immutable objects have no mutation methods. Neither has a
dimension setter. `Coordinates` and `SpatialReference` remain immutable
auxiliary values. Renamed immutable classes are used directly, with no
deprecated aliases or compatibility layer. See [immutability and ownership](immutability.md).

Family and declared-reference relabeling never transform coordinates.
Dimension conversion and reprojection belong to `spatial-transformer`.
Geometric validation is explicit and belongs to `spatial-validator`:
`PointFactory::create(0, null)` represents the incomplete `Point(0, null)`
state, without claiming its geometric validity under SQL/MM Spatial or OGC.

## Consumer integration follow-up

### `spatial-decoder`

- **Required follow-up outside this Story:** Construct decoded domain objects through these public type-specific factories; observe the shared current mode, including for
nested components. Keep format decoding outside `spatial-types` .

### `spatial-transformer`

- **Required follow-up outside this Story:** Create conversion and reprojection results through the public factories using transformed ordinates and the target
layout/reference; observe the same global mode.

### Doctrine integration

- **Required follow-up outside this Story:** Handle in-place coordinate, context and aggregate-member changes when detecting persistence changes. Object identity alone cannot
establish that a mutable value is unchanged.

### Read-only consumers

- **Required follow-up outside this Story:** Depend on common read interfaces; inspect the representation-specific interfaces before using copy or mutation operations.

These are integration expectations, not claims that sibling repositories have
already migrated. This Story changes only `spatial-types`. Consumers do not
need internal registries, hydrators or constructor-dispatch helpers.
The internal indexed-array pipeline continues to hydrate immutable direct
constructors independently of the public mode.
