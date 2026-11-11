---
title: Type class hierarchy
description: Separate immutable and mutable spatial class hierarchies, public interfaces and internal implementation bases in Spatial Types 1.x.
sidebar_position: 1
---

All abstract bases and traits shown here are internal implementation symbols.
Their documented operations remain available through public concrete types.
Common interfaces expose reads; immutable interfaces add copy and replacement operations; mutable interfaces add in-place edits.

The following tree describes class inheritance, rather than the file layout.
Abstract nodes are relative to `Internal\Types`; concrete spatial nodes remain
relative to the public `Types` namespace. The dimension-specific and collection
branches of every abstract base are preserved under `Internal\Types`.
The point behavior and sequence-editing traits shown here are under
`Internal\Types`.
`{Dimension2, Dimension3m, Dimension3z, Dimension4zm}` represents
one branch for each listed coordinate dimension and `{Geometry, Geography}` one
concrete class for each spatial model.

`AbstractSpatialTypeImmutable` extends the read-only `AbstractSpatialType` base.
The following hierarchy contains immutable implementation bases. Mutable points
extend `AbstractSpatialType` through `AbstractPoint`, with concrete
`Dimension{2,3m,3z,4zm}\Point` classes. `PointBehaviorTrait` shares point reads,
coordinate initialization and parsing between `AbstractPoint` and
`AbstractPointImmutable`; mutable points do not inherit copy operations.

All immutable branches implement `ImmutableSpatialInterface::copy(): static`.
The common base copies leaf values; aggregate storage owners recursively copy
their spatial descendants while retaining each descendant's own declared
context. Custom implementations must provide the same public contract; see
[immutability guide](../mutability-and-immutability/immutability.md).

```text
AbstractSpatialTypeImmutable
├── AbstractCompoundCurveImmutable
│   └── Dimension{2,3m,3z,4zm}\{Geometry,Geography}\CompoundCurveImmutable
├── AbstractCircularStringImmutable
│   └── Dimension{2,3m,3z,4zm}\{Geometry,Geography}\CircularStringImmutable
├── AbstractPointImmutable
│   └── Dimension{2,3m,3z,4zm}\{Geometry,Geography}\PointImmutable
├── AbstractPolygonImmutable
│   ├── Dimension{2,3m,3z,4zm}\{Geometry,Geography}\PolygonImmutable
│   └── AbstractTriangleImmutable
│       └── Dimension{2,3m,3z,4zm}\{Geometry,Geography}\TriangleImmutable
├── AbstractPolyhedralSurfaceImmutable
│   └── Dimension{3z,4zm}\{Geometry,Geography}\PolyhedralSurfaceImmutable
├── AbstractMultiPolygonImmutable
│   └── Dimension{2,3m,3z,4zm}\{Geometry,Geography}\MultiPolygonImmutable
├── AbstractCollectionImmutable
│   ├── Dimension2\AbstractCollectionImmutable
│   │   ├── Dimension2\Geometry\GeometryCollectionImmutable
│   │   └── Dimension2\Geography\GeographyCollectionImmutable
│   └── Dimension{3m,3z,4zm}\{Geometry\GeometryCollectionImmutable,Geography\GeographyCollectionImmutable}
├── Collection\AbstractPointCollectionImmutable
│   ├── AbstractLineStringImmutable
│   │   └── Dimension{2,3m,3z,4zm}\AbstractLineStringImmutable
│   │       └── Dimension{2,3m,3z,4zm}\{Geometry,Geography}\LineStringImmutable
│   └── AbstractMultiPointImmutable
│       └── Dimension{2,3m,3z,4zm}\AbstractMultiPointImmutable
│           └── Dimension{2,3m,3z,4zm}\{Geometry,Geography}\MultiPointImmutable
└── Collection\AbstractLineStringCollectionImmutable
    └── AbstractMultiLineStringImmutable
        └── Dimension{2,3m,3z,4zm}\AbstractMultiLineStringImmutable
            └── Dimension{2,3m,3z,4zm}\{Geometry,Geography}\MultiLineStringImmutable
```

`LineStringInterface`, `CircularStringInterface` and `CompoundCurveInterface`
extend `CurveInterface`, which exposes nullable start/end points
in addition to `SpatialInterface`. Circular strings have their own point
storage; they are not line strings. Closure and simplicity predicates are absent from the spatial interfaces.
Compound curves retain ordered `ImmutableCurveInterface` components
and require curve interfaces and point tuples with numeric or null ordinates; functional compatibility
and endpoint continuity are not checked.

Mutable point-defined paths extend the read-only spatial base independently of
immutable implementations:

```text
AbstractSpatialType
└── AbstractPointSequence
    ├── AbstractLineString
    │   └── Dimension{2,3m,3z,4zm}\LineString
    └── AbstractCircularString
        └── Dimension{2,3m,3z,4zm}\CircularString
```

`PointSequenceEditingTrait` shares ordered membership editing between the two
mutable path bases. These paths contain only `MutablePointInterface` instances;
coordinate tuples create mutable points, and immutable components are rejected.
Their interfaces refine the common read methods to return mutable points and
expose type-specific mutation, including optional context propagation. The common
interfaces remain read-only, and mutable paths expose no copy operations.

Mutable compound curves use a separate base:

```text
AbstractSpatialType
└── AbstractCompoundCurve
    └── Dimension{2,3m,3z,4zm}\CompoundCurve
```

`MutableCompoundCurveInterface` refines component getters to mutable line-string
or circular-string interfaces and exposes ordered membership editing. Immutable
compound curves retain their separate immutable base and copy contracts.

Mutable polygons and triangles share ring storage and editing in a separate base:

```text
AbstractSpatialType
└── AbstractPolygon
    ├── Dimension{2,3m,3z,4zm}\Polygon
    └── Dimension{2,3m,3z,4zm}\Triangle
```

`MutablePolygonInterface` refines ring accessors to `MutableLineStringInterface`
and provides ring editing and ring-then-point replacement. `MutableTriangleInterface`
adds the distinct triangle type contract. Both concrete variants retain mutable
rings and points by reference and expose no immutable copy operations. Their
layout and spatial type are fixed; geometric validity remains explicit.

Mutable polyhedral surfaces use a separate patch-owning base:

```text
AbstractSpatialType
└── AbstractPolyhedralSurface
    └── Dimension{3z,4zm}\PolyhedralSurface
```

`MutablePolyhedralSurfaceInterface` refines patch accessors to
`MutablePolygonInterface` and exposes patch editing plus patch-then-ring-then-point
addressing. The base retains patches and their mutable descendants by reference.
Coordinate arrays create mutable polygons in the fixed XYZ or XYZM layout;
immutable surface implementations and their copy contracts remain separate.

Mutable multi-objects and heterogeneous collections share ordered membership:

```text
AbstractSpatialType
└── AbstractMutableCollection
    ├── AbstractMultiPoint
    │   └── Dimension{2,3m,3z,4zm}\MultiPoint
    ├── AbstractMultiLineString
    │   └── Dimension{2,3m,3z,4zm}\MultiLineString
    ├── AbstractMultiPolygon
    │   └── Dimension{2,3m,3z,4zm}\MultiPolygon
    └── AbstractSpatialCollection
        └── Dimension{2,3m,3z,4zm}\SpatialCollection
```

`MutableCollectionInterface` provides ordered member editing and recursive
context propagation. Each `MutableMulti<Type>Interface` refines member reads to
the corresponding mutable type. `SpatialCollection` accepts mutable spatial
objects, including nested collections, through `MutableSpatialInterface`.
`MutableComponentGuard` rejects immutable descendants, containment cycles and
coordinate layouts incompatible with the mutable receiver, without geometric checks.
Mutable implementations remain independent of immutable classes and expose no
copy operations. The public operations and ownership rules are documented in
[mutable multi-objects and spatial collections](../instantiable-spatial-types.md#mutable-multi-objects-and-spatial-collections).

## Factory selection

[Public type-specific factories](../spatial-factories/index.md) parallel the dimension,
family and type namespaces under `Factory`. Their shared static mode selects
the immutable or mutable concrete implementation without changing this
inheritance hierarchy. The immutable default and subsequent mode switches
apply across all consumers in the same execution.
