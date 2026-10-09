# Empty MultiLineString members

Issue [#9](https://github.com/longitude-one/spatial-types/issues/9) protects the
distinction between zero line-string members, one empty member, and a mixture
of empty and non-empty members. The domain tests cover XY, XYZ, XYM and XYZM
in both Geometry and Geography families, using objects and coordinate arrays.

The available ISO/IEC CD 13249-3:201x(E), Committee Draft dated 2009-01-16,
clause 9.4.1 defines `ST_MultiLineString` as a collection of `ST_LineString`
values. Clause 5.1.57, Description 1 ar, distinguishes an empty member array
from the array of supplied line strings; its `<linestring text>` production
allows `EMPTY`. Clause 5.1.58 describes the corresponding nested binary
representations. These references identify the supplied Committee Draft,
not a final published edition or a claim of complete library conformance.

## Interoperability verification

The following default-branch revisions were checked on 2026-09-21:

| Component | Commit |
| --- | --- |
| spatial-writer | `96742f933afe9db368a177e9e1ba1afcc3fcfb33` |
| wkt-parser | `cfce11754610236c8587e4a52521209ecb277834` |
| wkb-parser | `86bfca8ec4e94190f5107c0dbb1b98f7ea27a2ae` |

The check used this issue's spatial-types implementation and the other
repositories' source code through a temporary Composer autoloader. It does
not assert that released Composer constraints install these revisions
together. No writer or parser dependency was added to the domain library.

For each of the eight dimension/family combinations, the check constructed
zero members, one empty member, and five members alternating empty and
non-empty line strings. In all 24 cases:

- `WktTextStrategy` produced the expected literal WKT, preserving empty member
  positions and the dimension qualifier.
- `WkbBinaryStrategy` followed by the WKB parser preserved member count,
  positions and coordinates. Reconstructing the same concrete spatial type
  and writing it again produced identical WKB bytes.
- The WKT parser rejected the first `EMPTY` token with
  `UnexpectedValueException`. This is tracked in
  [wkt-parser #28](https://github.com/longitude-one/wkt-parser/issues/28).

Standard WKT/WKB do not carry the Geometry/Geography family or the declared
reference in these adapters. The check supplied the original family and SRID
4326 when reconstructing the spatial value. It tested the writer's supported
little-endian output, without adding a byte-order contract to spatial-types.

For XY values, representative output is:

| Members | WKT | WKB hexadecimal |
| --- | --- | --- |
| None | `MULTILINESTRING EMPTY` | `010500000000000000` |
| One empty line string | `MULTILINESTRING (EMPTY)` | `010500000001000000010200000000000000` |

A mixed value produces
`MULTILINESTRING (EMPTY, (1 2, 3 4), EMPTY, (1 2, 3 4), EMPTY)`.
XYZ, XYM and XYZM use the respective `Z`, `M` and `ZM` qualifiers and retain
their own complete coordinate tuples.

The parser limitation can be reproduced independently:

```php
$parser = new LongitudeOne\Geo\WKT\Parser();
$parser->parse('MULTILINESTRING (EMPTY)');
// UnexpectedValueException: expected an opening parenthesis, got "EMPTY".
```

The follow-up belongs to the current WKT parsing repository. Its implementation
is separate from preserving members in the spatial domain model.
