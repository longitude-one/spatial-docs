---
title: Type class hierarchy
description: Inheritance of concrete and abstract spatial value classes and curve interfaces in Spatial Types 1.x.
---

## Class hierarchy

Public concrete classes are organized under `LongitudeOne\SpatialTypes\Types`.
The trees below show namespace organization, rather than inheritance.
`Dimension2`, `Dimension3z`, `Dimension3m`, and `Dimension4zm` correspond to
XY, XYZ, XYM, and XYZM respectively. `PolyhedralSurface` is available only
in XYZ and XYZM.

Immutable classes have an `Immutable` suffix and are grouped by dimension,
then by the `Geometry` or `Geography` family namespace.

```text
LongitudeOne\SpatialTypes\Types
└── Dimension{2,3m,3z,4zm}
    └── {Geometry,Geography}
    │   ├── CircularStringImmutable
    │   ├── CompoundCurveImmutable
    │   ├── GeographyCollectionImmutable
    │   ├── LineStringImmutable
    │   ├── MultiLineStringImmutable
    │   ├── MultiPointImmutable
    │   ├── MultiPolygonImmutable
    │   ├── PointImmutable
    │   ├── PointImmutable
    │   ├── PolyhedralSurfaceImmutable
    │   ├── PolygonImmutable
    │   └── TriangleImmutable
    │
    ├── CircularString
    ├── CompoundCurve
    ├── LineString
    ├── MultiLineString
    ├── MultiPoint
    ├── MultiPolygon
    ├── Point
    ├── Polygon
    ├── PolyhedralSurface
    ├── SpatialCollection
    └── Triangle
```

## Class inheritance

Concrete mutable classes live under `Types\Dimension*`; their family is a
constructor argument. Concrete immutable classes live under
`Types\Dimension*\{Geometry,Geography}` and have an `Immutable` suffix.
Abstract implementation classes live under `Internal\Types` and
`Internal\Types\Collection`.

The following tree summarizes the shared implementation branches. Each leaf
represents the concrete variants for their supported layouts and families;
dimension-specific intermediate bases are omitted.

```text
AbstractSpatialType
├── AbstractPoint → Point
├── AbstractPointSequence
│   ├── AbstractLineString → LineString
│   └── AbstractCircularString → CircularString
├── AbstractCompoundCurve → CompoundCurve
├── AbstractPolygon → Polygon, Triangle
├── AbstractPolyhedralSurface → PolyhedralSurface
├── AbstractMutableCollection
│   ├── AbstractMultiPoint → MultiPoint
│   ├── AbstractMultiLineString → MultiLineString
│   ├── AbstractMultiPolygon → MultiPolygon
│   └── AbstractSpatialCollection → SpatialCollection
└── AbstractSpatialTypeImmutable
    ├── AbstractPointImmutable → PointImmutable
    ├── AbstractCircularStringImmutable → CircularStringImmutable
    ├── AbstractCompoundCurveImmutable → CompoundCurveImmutable
    ├── AbstractPolygonImmutable
    │   ├── PolygonImmutable
    │   └── AbstractTriangleImmutable → TriangleImmutable
    ├── AbstractPolyhedralSurfaceImmutable → PolyhedralSurfaceImmutable
    ├── AbstractMultiPolygonImmutable → MultiPolygonImmutable
    ├── AbstractCollectionImmutable → GeometryCollectionImmutable, GeographyCollectionImmutable
    ├── AbstractPointCollectionImmutable
    │   ├── AbstractLineStringImmutable → LineStringImmutable
    │   └── AbstractMultiPointImmutable → MultiPointImmutable
    └── AbstractLineStringCollectionImmutable
        └── AbstractMultiLineStringImmutable → MultiLineStringImmutable
```

`LineStringInterface`, `CircularStringInterface` and `CompoundCurveInterface`
extend `CurveInterface`, which exposes nullable start/end points in addition
to `SpatialInterface`. Closure and simplicity require explicit validation;
there is no `isClosed()` method in the curve contract.

Read interfaces are shared by both representations. `ImmutableSpatialInterface`
adds copy operations, while `MutableSpatialInterface` adds mutation operations.
Immutable aggregates require immutable descendants and mutable aggregates require
mutable descendants. Constructors retain geometric representations without
checking curve continuity or topology. See [Structural and geometric validation](validators.md).
