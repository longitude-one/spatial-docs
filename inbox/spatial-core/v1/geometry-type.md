# Geometry Types

The following table lists the geometry types identified across OGC Simple
Feature Access 1.2.1 and ISO/IEC 13249-3.

It distinguishes three separate concepts:

- whether the type belongs to the geometry model;
- whether the type is instantiable;
- whether the type can be represented as a standalone WKT geometry.

These properties must not be inferred from one another. A geometry type may be
part of the geometry hierarchy without being directly instantiable or having a
standalone WKT representation.

| Type                 | OGC SFA   | ISO/IEC 13249-3 | Enum   | Instantiable  | WKT   |
|----------------------|:---------:|:---------------:|:------:|:-------------:|:-----:|
| `GEOMETRY`           |    Yes    |       Yes       |  Yes   |      No       |  No   |
| `POINT`              |    Yes    |       Yes       |  Yes   |     Yes       | Yes   |
| `CURVE`              |    Yes    |       Yes       |  Yes   |      No       |  No   |
| `LINESTRING`         |    Yes    |       Yes       |  Yes   |     Yes       | Yes   |
| `LINE`               |    Yes    |       No        |  Yes   |      No       |  No   |
| `LINEARRING`         |    Yes    |       No        |  Yes   |      No       |  No   |
| `CIRCULARSTRING`     | Reserved¹ |       Yes       |  Yes   |     Yes       | Yes²  |
| `COMPOUNDCURVE`      | Reserved¹ |       Yes       |  Yes   |     Yes       | Yes²  |
| `SURFACE`            |    Yes    |       Yes       |  Yes   |      No       |  No   |
| `CURVEPOLYGON`       | Reserved¹ |       Yes       |  Yes   |     Yes       | Yes²  |
| `POLYGON`            |    Yes    |       Yes       |  Yes   |     Yes       | Yes   |
| `TRIANGLE`           |    Yes    |       Yes       |  Yes   |     Yes       | Yes   |
| `POLYHEDRALSURFACE`  |    Yes    |       Yes       |  Yes   |     Yes       | Yes   |
| `TIN`                |    Yes    |       Yes       |  Yes   |     Yes       | Yes   |
| `GEOMETRYCOLLECTION` |    Yes    |       Yes       |  Yes   |     Yes       | Yes   |
| `MULTIPOINT`         |    Yes    |       Yes       |  Yes   |     Yes       | Yes   |
| `MULTICURVE`         |   Yes³    |       Yes       |  Yes   |     No³       | No³   |
| `MULTILINESTRING`    |    Yes    |       Yes       |  Yes   |     Yes       | Yes   |
| `MULTISURFACE`       |   Yes³    |       Yes       |  Yes   |     No³       | No³   |
| `MULTIPOLYGON`       |    Yes    |       Yes       |  Yes   |     Yes       | Yes   |

## Notes

### OGC reserved geometry types

`CIRCULARSTRING`, `COMPOUNDCURVE`, and `CURVEPOLYGON` appear in the common list
of geometry type codes defined by OGC SFA 1.2.1.

However, this list explicitly reserves some geometry type codes for future use.
Their presence in the WKB type-code table does not make them equivalent to the
geometry types defined by the main SFA geometry model.

ISO/IEC 13249-3, on the other hand, defines these as actual SQL/MM Spatial
geometry types.

### Extended ISO WKT types

`CIRCULARSTRING`, `COMPOUNDCURVE`, and `CURVEPOLYGON` have textual
representations in the ISO SQL/MM Spatial model.

This does not imply that an OGC SFA WKT decoder should accept them. Support for
these types depends on the grammar implemented by the decoder strategy.

### MultiCurve and MultiSurface

`MULTICURVE` and `MULTISURFACE` are collection supertypes introduced to
generalize collections of curves and surfaces.

Their presence in the geometry hierarchy must not by itself be interpreted as
meaning that they are directly instantiable or valid standalone OGC SFA WKT
geometry types.

## Line

A `LINE` is a constrained `LINESTRING` containing exactly two points.

Conceptually:

```text
LineString
└── Line
    └── exactly 2 Points
```

It belongs to the OGC SFA geometry model but is not a standalone instantiable
geometry type.

Consequently, an OGC WKT decoder must not accept:

```text
LINE (0 0, 10 5)
```

The equivalent geometry is represented as a `LINESTRING`:

```text
LINESTRING (0 0, 10 5)
```

## LinearRing

A `LINEARRING` is a constrained `LINESTRING` that is both closed and simple.

Conceptually:

```text
LineString
└── LinearRing
    ├── closed
    │   └── StartPoint = EndPoint
    └── simple
        └── no self-intersection
```

A `LINEARRING` is notably used to represent polygon boundaries.

It belongs to the OGC SFA geometry model but is not a standalone instantiable
geometry type.

Consequently, an OGC WKT decoder must not accept:

```text
LINEARRING (0 0, 10 0, 10 10, 0 0)
```

A linear ring instead appears structurally as part of another geometry, such
as a `POLYGON`:

```text
POLYGON ((0 0, 10 0, 10 10, 0 0))
```

## GeometryTypeEnum

`GeometryTypeEnum` represents the geometry types known by the normative
geometry model.

It should therefore contain both instantiable and non-instantiable types:

```text
GEOMETRY

POINT

CURVE
LINESTRING
LINE
LINEARRING
CIRCULARSTRING
COMPOUNDCURVE

SURFACE
CURVEPOLYGON
POLYGON
TRIANGLE
POLYHEDRALSURFACE
TIN

GEOMETRYCOLLECTION
MULTIPOINT
MULTICURVE
MULTILINESTRING
MULTISURFACE
MULTIPOLYGON
```

The presence of a value in `GeometryTypeEnum` does not imply that the
corresponding geometry can be instantiated.

Likewise, instantiability does not imply that a particular serialization
strategy supports that geometry type.

These are separate responsibilities:

- `GeometryTypeEnum` answers whether a geometry type belongs to the supported
  normative geometry model.
- `isInstantiable()` answers whether that geometry type can be instantiated
  directly.
- A decoder strategy determines whether the type is valid in the grammar and
  representation implemented by that strategy.

For example:

- `GEOMETRY` belongs to the geometry model but is not instantiable.
- `SURFACE` belongs to the geometry model but is not instantiable.
- `LINE` belongs to the OGC geometry model but is not instantiable as a
  standalone geometry.
- `LINEARRING` belongs to the OGC geometry model but is not instantiable as a
  standalone geometry.
- `LINESTRING` is instantiable and has a standalone WKT representation.
- `LINEARRING` may be used structurally inside a `POLYGON` without
  `LINEARRING` being a valid standalone OGC WKT geometry type.
  