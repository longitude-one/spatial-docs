# Spatial validation

`spatial-types` represents spatial values without automatic functional validation.
Constructors and immutable replacement methods retain technical typing checks:
member interfaces, numeric or null coordinate ordinates, required tuple indices,
and the coordinate dimension of a concrete point. Mutable composite geometries
also require every supplied component and descendant to match their declared
coordinate layout, including EMPTY components. XY, XYZ, XYM and XYZM remain
distinct; existing spatial objects are never converted to another layout. Every
combination of supplied
and null point ordinates is representable. Only an all-null point is EMPTY; a
partial null does not remove an axis or change the dimension. Indexed operations
still reject empty containers.

Geometry validity is an explicit consumer operation. Functional rules such as
point coordinate completeness, ring closure, triangle cardinality, geographic numeric ranges, aggregate
family/reference compatibility, immutable aggregate dimension compatibility,
curve continuity and surface topology
are not enforced by this package.

Constraints and validators formerly under `LongitudeOne\SpatialTypes\Validator`
now belong to [spatial-validator](https://github.com/longitude-one/spatial-validator).
This package neither depends on that library nor invokes it. Symfony Validator
is no longer a dependency of `spatial-types`.

Coordinate strings still use `geo-parser`; malformed or out-of-range textual
expressions can fail during parsing. Numeric coordinates bypass that parser.

Removing the former validator namespace and automatic rejection behavior is a
breaking change. Applications requiring valid geometry must perform validation
explicitly before consuming the represented values.

Mutable construction and membership edits reject incompatible layouts with
`InvalidDimensionException`, implementing `SpatialTypeExceptionInterface`.
Rejection preserves the receiver and supplied components. Coordinate tuples
continue to be hydrated in the receiver's declared layout. This is a compatibility
change: applications that previously inserted mixed-layout mutable objects must
supply matching components instead.
