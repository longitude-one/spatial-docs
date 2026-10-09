# Type class hierarchy

The following tree describes class inheritance in `Types`, rather than the
file layout. `{Dimension2, Dimension3m, Dimension3z, Dimension4zm}` represents
one branch for each listed coordinate dimension and `{Geometry, Geography}` one
concrete class for each spatial model.

```text
AbstractSpatialType
├── AbstractCompoundCurve
│   └── Dimension{2,3m,3z,4zm}\{Geometry,Geography}\CompoundCurve
├── AbstractCircularString
│   └── Dimension{2,3m,3z,4zm}\{Geometry,Geography}\CircularString
├── AbstractPoint
│   └── Dimension{2,3m,3z,4zm}\{Geometry,Geography}\Point
├── AbstractPolygon
│   ├── Dimension{2,3m,3z,4zm}\{Geometry,Geography}\Polygon
│   └── AbstractTriangle
│       └── Dimension{2,3m,3z,4zm}\{Geometry,Geography}\Triangle
├── AbstractPolyhedralSurface
│   └── Dimension{3z,4zm}\{Geometry,Geography}\PolyhedralSurface
├── AbstractMultiPolygon
│   └── Dimension{2,3m,3z,4zm}\{Geometry,Geography}\MultiPolygon
├── AbstractCollection
│   ├── Dimension2\AbstractCollection
│   │   ├── Dimension2\Geometry\GeometryCollection
│   │   └── Dimension2\Geography\GeographyCollection
│   └── Dimension{3m,3z,4zm}\{Geometry\GeometryCollection,Geography\GeographyCollection}
├── Collection\AbstractPointCollection
│   ├── AbstractLineString
│   │   └── Dimension{2,3m,3z,4zm}\AbstractLineString
│   │       └── Dimension{2,3m,3z,4zm}\{Geometry,Geography}\LineString
│   └── AbstractMultiPoint
│       └── Dimension{2,3m,3z,4zm}\AbstractMultiPoint
│           └── Dimension{2,3m,3z,4zm}\{Geometry,Geography}\MultiPoint
└── Collection\AbstractLineStringCollection
    └── AbstractMultiLineString
        └── Dimension{2,3m,3z,4zm}\AbstractMultiLineString
            └── Dimension{2,3m,3z,4zm}\{Geometry,Geography}\MultiLineString
```

`LineStringInterface`, `CircularStringInterface` and `CompoundCurveInterface`
extend `CurveInterface`, which exposes nullable start/end points and closure
in addition to `SpatialInterface`. Circular strings have their own point
storage and validation; they are not line strings and do not inherit point-set
simplicity checks. Compound curves retain ordered `CurveInterface` components
and validate their types, compatibility and endpoint continuity.
