# Public and internal API

Use the public API when integrating `spatial-types`. PHP visibility alone does
not identify a supported consumer contract: some implementation helpers must be
accessible across classes. Internal symbols carry an explicit `@internal` PHPDoc
annotation.

## Supported public contracts

All names below are relative to `LongitudeOne\SpatialTypes`.

### Spatial interfaces

- **Public API:** All contracts in `Interfaces`

### Concrete spatial types

- **Public API:** Non-abstract classes in `Types\Dimension2` , `Types\Dimension3z` , `Types\Dimension3m` and `Types\Dimension4zm` , including their `Geometry` and `Geography`
branches

### Type-specific factories

- **Public API:** All 84 factories in `Factory\Dimension*\Geometry` and `Factory\Dimension*\Geography`

### Factory mode

- **Public API:** Only `Factory\SpatialFactory::immutable()` , `isMutable()` and `mutable()`

### Builder

- **Public API:** `Builder\SpatialBuilder`

### Implementation status

- **Public API:** `Implementation\SpatialTypeImplementationStatus`

### Exceptions

- **Public API:** All exception classes and `Exception\SpatialTypeExceptionInterface`

### Spatial reference

- **Public API:** `Reference\SpatialReference`

### Coordinate value

- **Public API:** `Value\Coordinates`

Public operations inherited by concrete spatial types remain part of those
types' public contracts even when their implementation is declared in an
internal abstract base or trait. Internal classification of a base class does
not hide the documented constructor, read, copy or mutation contracts of its
public concrete types.

See [instantiable spatial types](instantiable-spatial-types.md),
[public factories](public-factories.md), [the builder](spatial-builder.md),
[immutability](immutability.md) and
[spatial references](spatial-reference-systems.md) for usage contracts.

## Internal implementation

### Implementation bases

- **Internal symbols:** Every abstract class under `Internal\Types` , including dimension-specific and collection bases

### Shared mechanisms

- **Internal symbols:** Every trait, component guard and mutable point hydrator

### Builder helpers

- **Internal symbols:** The builder traits and `Internal\BuilderTypes`

### Factory helpers

- **Internal symbols:** All symbols under `Internal\Factory` , including `PointFactoryInterface` , `LineStringFactoryInterface` and `PolygonFactoryInterface`

### Factory pipeline

- **Internal symbols:** Pipeline components in `Internal\Factory`

### Factory hydrators

- **Internal symbols:** `Internal\Factory\Hydrator\CoordinatesHydrator` and `Internal\Factory\Hydrator\SpatialArrayHydrator`

### Aggregate hydration

- **Internal symbols:** `Factory\SpatialFactory` constructor and every `create*` instance method

### Supporting collections

- **Internal symbols:** `Internal\Boundary\PolygonBoundary` and `Internal\Collection\LineStringCollection`

`Internal\Factory\Coordinates` is an internal data-transfer object; the public
coordinate value is `Value\Coordinates`.

The three factory-pipeline interfaces are internal exceptions to the public
interface classification. Consumer-facing interfaces under `Interfaces` and
`Exception\SpatialTypeExceptionInterface` remain public.

The ten helpers formerly under `Factory\Internal` now live under
`Internal\Factory`. Internal imports must use the new namespace; the old
namespace has no aliases. The move changes internal symbol names, without
changing the public factory signatures or spatial behavior.

The two hydrators formerly under `Factory\Hydrator` now live under
`Internal\Factory\Hydrator`, alongside the other factory helpers under
`Internal\Factory`.
The old hydrator namespace has no aliases.

`Boundary\PolygonBoundary` and `Collection\LineStringCollection` have also moved
under `Internal\Boundary` and `Internal\Collection`, respectively. Their old
namespaces have no aliases; internal imports must use the new names.

All 40 abstract spatial classes formerly under `Types` now live under
`Internal\Types`, preserving their relative dimension and collection branches.
Concrete spatial types remain under `Types`; their supported inherited
operations are unchanged. The former abstract-class names have no aliases.

## Evolution and compatibility

Internal status excludes a symbol from the supported public API contract.
It does not authorize maintainers to change or remove internal symbols
arbitrarily between minor releases. Internal changes require deliberate impact
assessment and clear documentation.

This classification establishes no separate automatic compatibility guarantee
for internal symbols and does not change the project's existing
backward-compatibility or versioning policy. The public-contract stabilization
review for the 1.0.0 baseline remains a separate work item.
