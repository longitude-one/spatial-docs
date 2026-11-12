# Spatial validation rule catalogue

Design reference for [Epic #7](https://github.com/longitude-one/spatial-validator/issues/7),
[Story #8](https://github.com/longitude-one/spatial-validator/issues/8) and
[Story #12](https://github.com/longitude-one/spatial-validator/issues/12).
Revised 22 October 2026. [Version française](catalogue-validation.fr.md).

This catalogue separates the delivered infrastructure, approved target rules and unresolved decisions.
A rule listed below is not a claim that its algorithm is implemented.

## 1. Delivered API and coverage

Public namespace: `LongitudeOne\SpatialValidator\Validator\Constraints`.
`Spatial` extends Symfony Constraint; `SpatialValidator` extends ConstraintValidator.
Use `$validator->validate($geometry, new Spatial())` through Symfony ValidatorInterface.
Standard groups and payload are supported; no custom isValid service or additional common contract is introduced.

`SpatialValidator` uses `match` on the declared GeometryTypeEnum value to select the specialized constraint.
Delegation preserves root, property path and active group. Every enum case has a constraint/validator pair:

| Types with dedicated dispatch |
| --- |
| BRepSolid, Circle, CircularString, Clothoid, CompoundCurve, CompoundSurface, Curve, CurvePolygon |
| EllipticalCurve, GeodesicString, Geometry, GeometryCollection, LineString |
| MultiCurve, MultiLineString, MultiPoint, MultiPolygon, MultiSurface, NURBSCurve |
| Point, Polygon, PolyhedralSurface, Solid, SpiralCurve, Surface, TIN, Triangle |

These 27 routes include abstract/future model types: dispatch availability does not establish concrete model
support.
GeometryCollection uses CollectionInterface; Triangle requires TriangleInterface.
Specialized validators require their available interface and exact enum case.
Types without a dedicated interface require SpatialInterface and the exact enum case.

### L-INPUT-01 — Current input and failure contract

Alexandre's 22 October revision supersedes #10's empty-string exemption for the active API.

- **Wrong constraint** — Symfony UnexpectedTypeException, checked before the value

- **PHP null with the correct constraint** — No violation; compose with NotNull when presence is required

- **Any string, including '' and WKT, or another incompatible value** — Symfony UnexpectedValueException directly;
  type violation through the Symfony Validator service

- **Admissible spatial object, including EMPTY** — Point coordinate rules or specialized non-implementation warning

- **Unknown dispatch type** — PHP InvalidArgumentException: `Unsupported spatial type: <type>`

Except for Point and LineString, specialized validators currently emit `<Type> validation is not implemented yet.`
with default constraint payload `['severity' => 'warning']`.
Spatial has default payload null and emits no global warning. Its custom payload is not copied to child constraints.
Symfony retains warnings in its violation list; payload is metadata interpreted by the consumer.
The defensive default is unreachable through the current closed enum for a conforming object.

**Point coordinate checks V02, V03 and V16 and LineString rules V04/B01 are delivered.**
`PointValidator` composes `CoordinateLayout`, `FiniteCoordinates` and `GeographyBounds`.
`Components` delivers recursive member checks C01–C04 and cycle detection for the supported aggregates.
See the [validator reference](../validators.md#component-rules) for paths, codes and composition limits.
A warning means a check was not performed, not that validity or invalidity was established.
There is no general SQL/MM or geodetic conformance claim.
See [README](../../README.md) for usage and [Symfony input conventions][symfony-input].

### Concrete model variants

| Model types | Geometry / Geography variants |
| --- | --- |
| Point, LineString, CircularString, CompoundCurve, Polygon, Triangle | XY, XYZ, XYM, XYZM |
| MultiPoint, MultiLineString, MultiPolygon, GeometryCollection | XY, XYZ, XYM, XYZM |
| PolyhedralSurface | XYZ, XYZM only |

The Geography collection class follows the same geometry-type dispatch.
Other enum routes do not imply corresponding concrete classes exist.
XYZ and XYM remain distinct despite both having three ordinates.

## 2. Sources and authority

The rule references below retain the findings of the 21 October catalogue; this revision condenses them
and incorporates approved API decisions without establishing new normative interpretations.

- **ISO-CD** — ISO/IEC CD 13249-3:201x(E), 2009-01-16, Committee Draft, not final

  **Relevant clauses:** Base 4.2.1–4.2.19, 5.1.7–5.1.10; curves 7.1–7.4; surfaces 8.3–8.5; collections 9; checks
  16.1

- **OGC** — OGC 06-103r4, SFA 1.2.1, Corrigendum

  **Relevant clauses:** 6.1.2–6.1.3, 6.1.6–6.1.7, 6.1.11–6.1.14

- **GML** — OGC 07-036, GML 3.2.1, 2007-08-27

  **Relevant clauses:** 10.5.8, linear rings

- **ISO 19107 / 19111 / 19136** — Normative references in ISO-CD clause 2

  **Relevant clauses:** Source editions and dependent clauses require inspection before a new conclusion

ISO-CD was inspected from the private skill PDF; extracts are not redistributed.
[OGC SFA][ogc-sfa] and [GML][ogc-gml] are publicly available.
Database behavior, historical code and constructor guarantees are not normative evidence.
Approved LongitudeOne choices are identified below; unresolved interpretations require Alexandre's decision.

## 3. Target rules and reference scenarios

Validity, simplicity, closure and application restrictions are separate.
A valid curve need not be simple or closed. Topological closure of a set does not imply curve closure or a solid.
Point implements V02, V03 and V16. LineString delivers V04/B01 and explicit S01 for Geometry.
Ring delivers F01 by composing the existing line rules, cardinality, closure and simplicity.
Other geometric rules below await specialized implementation;
`Components` now applies component rules C01–C04 recursively.

### Common and point rules

- **V01** — Genuine EMPTY objects may be valid; ISO-CD 5.1.10(2a). Check consistency and permitted components, not
  only an EMPTY summary.

  **Reference scenarios:** Zero-point line: EMPTY; one-point line: invalid; EMPTY Point inside LineString: invalid.

- **V02** — LongitudeOne: reject INF, -INF and NAN in every present ordinate, including M; do not equate them with
  null.

  **Reference scenarios:** Infinite X, NaN Z or infinite M: violation.

- **V03** — LongitudeOne point representation; ISO-CD 4.2.3 defines the position. All variant ordinates null means
  EMPTY; none null means non-empty; a mixture is invalid.

  **Reference scenarios:** XY (null,null): EMPTY; XYZ/XYM (1,2,null): invalid; zero is a coordinate.

- **V16** — LongitudeOne Geography bounds in degrees, inclusive: X longitude [-180,+180], Y latitude [-90,+90].

  **Reference scenarios:** Boundaries accepted; beyond either bound rejected; Geometry X=700000 has no V16 failure.

V03 checks X/Y, X/Y/Z, X/Y/M or X/Y/Z/M according to the declared variant.
This retains the approved L-POINT-01 representation contract.
An axis absent from that variant is not a missing required ordinate.
A third-party interface object must be checked independently of model constructor guarantees.

### Curves and linear rings

**Delivered in #15:** LineString composes Point validity through Components, minimum count, non-EMPTY Point
membership and consecutive-position checks. EMPTY means zero members; two EMPTY Points are invalid.
Validity does not imply simplicity or closure. `SimpleLineString` is opt-in, uses XY/XYZ according to Z and
ignores M, as approved in Q01. Geography simplicity is explicitly unavailable for non-empty lines (Q03).
Exact signs on finite binary coordinates avoid determinant tolerances; coordinate equality retains Q02.
Geography warnings use a copied constraint, preserving explicit payload and the original instance.
The [line constraint reference](../validators.md#line-rules) records paths, codes and coverage.

- **V04** — LineString: zero points or at least two non-empty valid points; ISO-CD 7.2.1 Description 3–5, 10–11;
  7.2.3 → 16.1.7 → 16.1.6.

  **Reference scenarios:** Zero: EMPTY; one: invalid; two distinct points satisfy cardinality, not every line rule.

- **V05** — CircularString: odd count >=3 unless EMPTY; first arc uses three points, each next arc two. ISO-CD
  4.2.6, 7.3.1 Description 6–11.

  **Reference scenarios:** 3/5 points admissible; 2/4 invalid; collinear triple may degenerate to a line.

**Delivered in #17:** CircularString composes Components, CircularPointCount and CircularArcPoints;
EMPTY is valid, non-empty cardinality is odd and >=3, and intermediate positions differ from endpoints under
Q02 (XYZ when Z exists, M ignored). Full circles and source-defined collinear endpoint segments are accepted.
Explicit SimpleCircularString checks actual arcs/segments, including crossings, tangencies and overlap;
ordinary validity does not require simplicity or closure. Non-empty Geography topology remains unavailable.
Repeated arc endpoints outside global closure, including tangent-circle figure eights, are not simple.
**Approved #17 limit:** an isolated full circle XYZ A,B,A is simple, but its plane is indeterminate;
interactions with other arcs report explicit unavailable warnings without selecting an arbitrary XY plane.
See the [circular reference](../validators.md#circular-curve-rules) for diagnostics, payload and coverage.

- **V06** — CompoundCurve: well-formed LineString/CircularString components with consecutive endpoint continuity;
  ISO-CD 7.4.1 Description 3–10.

**Delivered in #18:** CompoundCurve composes Components before inspecting joins, prohibits EMPTY contributing
curves and uses Q02 equality in XYZ when Z exists, otherwise XY, ignoring M. SimpleCompoundCurve separately
checks all line/line, line/arc and arc/arc interactions within and across members using actual arcs and exact
predicates. Zero members pass both checks. Geography joins/topology and inherited underdetermined XYZ full-circle
planes produce explicit warnings; no Cartesian or arbitrary-plane substitute is used.
See the [public reference](../validators.md#compound-curve-rules) for codes, paths and payload semantics.

  **Reference scenarios:** A→B then B→C joins; B≠C fails; Polygon member fails.

- **S01** — Curve simplicity in the selected space; ISO-CD 4.2.4, 5.1.8–5.1.9; OGC 6.1.6–6.1.7.

  **Reference scenarios:** Crossing/overlap: non-simple; XY crossing at separate elevations can be simple in XYZ.

**Delivered in #16:** Explicit `Ring` composes minimum four positions, `FirstPointEqualsLastPoint` and
`SimpleLineString`, including the latter's LineString/Point/component validity. Ring rejects EMPTY without
changing EMPTY LineString validity. Geometry uses XYZ when Z exists, otherwise XY, ignoring M; closure retains
Q02 while simplicity uses the original exact coordinates and cannot exempt an interior crossing near closure.
Geography closure/simplicity remain unavailable warnings; structural and Point checks continue. Warning
constraints are copied, preserving explicit payload and the original instances. CircularString is not subject
to this LineString boundary constraint. Polygon integration remains in its specialized Stories.
See the [ring reference](../validators.md#linear-ring-rules) for paths, codes and API limits.

- **F01** — A ring is simple and closed; EMPTY is neither. ISO-CD 4.2.4–4.2.5, 7.1.6–7.1.9. Linear rings need >=4
  positions including repeated closure; GML 10.5.8.

  **Reference scenarios:** A,B,C,A non-collinear: ring; crossing closed loop: not a ring; different M alone does not
  break closure.

- **B01** — Consecutive duplicate check for line points: ISO-CD 7.2.3 → 16.1.7, also calling 16.1.6. Identifier
  retained although this is a SQL/MM method condition, not merely business policy.

  **Reference scenarios:** A,A,B fails; A,B,A with A≠B passes this check; different M alone does not distinguish
  positions.

CircularString's intermediate arc point differs from both endpoints.
The full-circle case (1,0),(-1,0),(1,0) is admissible; do not require three distinct points.
Chord tests do not establish arc simplicity. The four-position rule concerns linear rings, not circular rings.
Do not substitute ST_Equals for a SQL equality symbol without verifying the applicable procedure semantics.

### Polygons, Triangle and aggregates

- **V07** — Polygon exterior and holes are linear rings; ISO-CD 8.3.1 Description 2–4.

  **Reference scenarios:** Open exterior or self-crossing hole fails; non-empty Polygon requires an exterior.

- **V08** — Planar, non-degenerate Polygon/Triangle and surface patches; ISO-CD 4.2.9–4.2.10, OGC 6.1.11.1.

  **Reference scenarios:** Inclined/vertical square passes planarity; non-coplanar vertex, out-of-plane hole or
  collinear exterior fails.

- **V09** — Ring relationships: no crossing, cut lines, spikes or punctures; connected interior. ISO-CD 4.2.9, OGC
  6.1.11.1.

  **Reference scenarios:** Outside/crossing/overlapping/nested holes fail; isolated tangency may pass if interior
  stays connected; shared segment fails.

- **V15** — OGC 6.1.11.1: holes oppose exterior direction viewed from the same plane side; LongitudeOne reports
  same-direction holes as warnings.

  **Reference scenarios:** Reverse all rings: relative orientation unchanged; do not auto-reorient or impose
  absolute clockwise order.

- **V10** — Triangle: four ring positions, three distinct non-collinear vertices, no holes. ISO-CD 8.4.1 Description
  2–4; OGC 6.1.11.1.

  **Delivered in #21:** TriangleInterface with declared Triangle type composes shared Polygon structure,
  Ring/Point/metadata/plane and cyclic-boundary checks. Four exterior positions, three distinct non-collinear
  spatial vertices and no holes are required. EMPTY is valid. XYZ uses its actual plane; M is ignored spatially.
  Geography retains structural checks and explicit unavailable warnings. See [Triangle rules](../validators.md#triangle-rules).

  **Reference scenarios:** A,B,C,A non-collinear passes; collinear vertices, fourth distinct vertex or hole fails.

- **S02** — MultiPoint simplicity: no equal point pair; ISO-CD 4.2.15.

  **Reference scenarios:** Repeated position: non-simple, not automatically invalid; EMPTY: simple.

- **S03** — MultiLineString simplicity: simple members intersect only at their respective boundaries; ISO-CD
  4.2.16–4.2.17.

  **Reference scenarios:** Shared endpoints of open lines may pass; endpoint inside another line, crossing or
  overlap fails simplicity.

- **F02** — MultiLineString closed if all members closed; EMPTY MultiCurve is not closed under ISO-CD 9.3.3–9.3.4.

  **Reference scenarios:** Two closed loops: closed; an open member: not closed.

- **V11** — MultiPolygon: disjoint interiors, finite point boundary contacts; no cut lines, spikes or punctures.
  ISO-CD 4.2.18–4.2.19, OGC 6.1.14.

  **Reference scenarios:** Separate polygons/vertex contact pass; shared edge or overlapping interiors fails;
  polygon inside another's hole may pass.

Approved Polygon composition: one public Polygon constraint delivers the complete J+K contract.
J supplies reusable structural/ring/planarity blocks; K completes topology and public integration.
A coplanar outside hole fails both Polygon and Spatial through the complete #20 integration; structural
success alone is not full validity.
Triangle remains restricted to TriangleInterface, not inferred from Polygon coordinates.

### PolyhedralSurface

- **V12** — Valid planar Polygon patches with Z; ISO-CD 8.5.1 Description 16–17.

  **Reference scenarios:** Missing Z, non-planar patch or invalid hole fails; all Polygon rules apply.

- **V13** — Contiguous surface, linear shared boundaries, <=2 incident patches per segment, opposite shared-edge
  directions. ISO-CD 4.2.12, 8.5.1 Description 2,4,18–19; OGC 6.1.12.1.

  **Reference scenarios:** Oppositely traversed shared edge passes; same direction, three incidents or disjoint
  patches fails; vertex-only contact is not edge connection.

- **V14** — LongitudeOne permits open surfaces by default and requires solid closure through a separate validator.

  **Reference scenarios:** Valid open book passes default and fails closure; valid cube/tetrahedron passes both;
  EMPTY XYZ/XYZM passes general validity and fails explicit closure (#24 approved refinement).

ISO-CD 8.5.1 Description 6 suggests a closed polyhedron; Description 7, 4.2.12 and OGC 6.1.12.1
distinguish the closed case. Q08 records the approved product decision without hiding that tension.
Checking shared edges alone does not detect arbitrary patch intersections.

### C01–C04 — Components and compatibility

- **C01** — Validate permitted member types and each component recursively.

  **Source / limitation:** ISO-CD 7.4.1, 8.3.1, 8.5.1, 4.2.14–19; recursive traversal delivered by D / #13.

- **C02** — Check Geometry/Geography family compatibility.

  **Source / limitation:** Approved D policy: each member has exactly the parent Geometry/Geography family.

- **C03** — Check coordinate-layout compatibility, distinguishing XYZ from XYM.

  **Source / limitation:** Approved D policy: exact parent XY/XYZ/XYM/XYZM variant, with no conversion.
  This LongitudeOne contract is stricter than ISO-CD 8.5.1 Description 9's minimum patch dimension.

- **C04** — Check spatial reference compatibility.

  **Source / limitation:** ISO-CD 4.2.1, 4.2.14; authority+identifier identity does not prove CRS equivalence or
  axis/dimension agreement. D compares authority and identifier exactly, without CRS lookup.

General collections may mix geometry types/topological dimensions; member intersections alone do not imply
invalidity.
`Components` checks every member even behind an EMPTY parent flag. Valid EMPTY GeometryCollection, MultiPoint
and MultiLineString members are retained; no blanket EMPTY exemption is applied to other parent rules.
Direct and indirect cycles produce `Components::CYCLE_ERROR` at the cyclic reference and stop that branch;
independent branches, including repeated shared objects, continue. Diagnostics retain root, prefix and active
group; delegated constraints retain their codes and payloads. Components errors have payload null by default.
Polygon member slots admit Triangle subtypes (ISO-CD 4.2.11); Triangle dispatch remains distinct.
Type-specific parent geometry rules remain deferred to their specialized Stories.
An equal integer SRID under different authorities does not establish reference identity.
Do not infer axis validity or transform coordinates from SRID alone.

## 4. Approved decisions Q01–Q09

Decisions received on 21 October remain applicable except where the approved 22 October API revision supersedes
them.
L-DIM-01 refers to Q01's calculation space; L-GEO-01 to Q03's structural-first Geography coverage.

- **Q01** — Geometry calculations use XYZ when Z exists, otherwise XY; always ignore M, including equality, closure,
  joins and simplicity. Ordinary ISO-CD operations remain XY; explicit 3D operations are distinct.

- **Q02** — Finite coordinates compare with abs(a-b) <= PHP_FLOAT_EPSILON * max(1.0, abs(a), abs(b)). No rounding,
  coordinate mutation or distance interpretation.

- **Q03** — Unavailable geographic checks yield explicit violations with warning payload; continue available checks.
  Cartesian topology is not a geodetic substitute.

- **Q04** — Reject non-finite ordinates including M; Geography uses the inclusive degree bounds in V16. No other
  SRS-specific limits are implied.

- **Q05** — Distinguish spatial-object EMPTY semantics from SQL/MM construction/mutation restrictions; see the
  membership table below.

- **Q06** — Non-empty linear ring: >=4 positions including closure; Triangle: exactly four, no holes. Circular rings
  do not inherit this threshold.

- **Q07** — Unpublished historical APIs, helpers, messages and restrictions may be changed/removed; they are
  inventory, not compatibility obligations.

- **Q08** — Default PolyhedralSurface permits open surfaces. The explicit closed-surface contract requires a
  non-empty envelope enclosing volume; EMPTY fails closure (Alexandre, approved #24 refinement).

- **Q09** — Same-direction Polygon hole/exterior yields a warning, viewed from the same plane side; no automatic
  repair.

Q02 is symmetric and approximate, not transitive; it does not cover all accumulated arithmetic errors.
Examples: 0.1+0.2 vs 0.3 and 700000.1+0.2 vs 700000.3 compare equal; 3 vs 3.000001 differ.
Intermediate determinants, projections, orientation and intersection tolerances need separate specification.
See [PHP floating-point comparison][php-floats].

### Q05 — EMPTY membership and SQL/MM boundaries

- **LineString / CircularString** — EMPTY Point members prohibited; ISO-CD 7.2.3 / 7.3.3 → 16.1.7 → 16.1.6.

- **CompoundCurve** — EMPTY curve prohibited in inspected SQL/MM path, 7.4.3 → 16.1.6.

- **Polygon / Triangle** — EMPTY holes rejected in inspected path 8.3.4 → 8.2.4 → 16.1.6; non-empty object needs a
  ring, 8.3.3 → 8.2.3 and 7.1.8. Triangle has no holes.

- **PolyhedralSurface** — EMPTY patch prohibited in inspected path 8.5.3 → 16.1.6.

- **GeometryCollection** — Valid EMPTY members accepted by approved LongitudeOne contract; preserve and validate
  every member.

- **MultiPoint / MultiLineString** — Valid EMPTY Point / LineString members accepted under M / #22; preserve members
  and strict metadata/type compatibility.

- **MultiPolygon** — Inspected method 9.6.3 → 16.1.15 → 16.1.6 rejects EMPTY members; no blanket extension of the
  MultiPoint decision.

ISO-CD ST_CheckNulls (16.1.6) rejects both null and EMPTY members.
Collection method 9.1.3 and MultiPoint/MultiLineString methods 9.2.3→16.1.8 / 9.4.3→16.1.10
call it; these SQL/MM method restrictions must not be presented as blanket object-validity obligations.
The approved general-collection contract follows OGC 6.1.3.1 and empty-set semantics in 6.1.2;
ISO-CD 4.2.14 also gives a general collection definition.

A memberless collection and a collection of valid EMPTY members are EMPTY.
A non-empty Point plus an EMPTY LineString is admissible and non-EMPTY, subject to component/reference rules.
Never drop members, reorder them or skip invalid members because the parent claims EMPTY.
This does not permit an EMPTY Point inside LineString.
A list without members differs from a list containing an EMPTY member.
An EMPTY exterior with holes does not describe a valid non-empty Polygon.

## 5. Historical inventory and verification

Historical source is archived in old/ and excluded from production autoload.
Its inspected revision was fca0ef88424a862deda7f7d2e8d7c8deafe58c16.
Model inventory used spatial-types 1.0.0-beta at ceaee5d142c77fc3922ab50c762fa6648fea0e30
and spatial-core 1.3.0 at 1289582288e8954243de5ccb1f28ab7e78f4e9a4.
These revisions establish provenance, not current runtime guarantees or dependency pins.

- **SameFamily, SameDimension, SameSpatialReference** — Compare expected metadata; no automatic traversal.

- **MinimumPointCount, FirstPointEqualsLastPoint, NoConsecutiveDuplicatePoints, Ring** — Historical ring omitted
  simplicity; equality included M and is not the approved geometric comparison.

- **SimpleLineString / Simple3dLineString** — XY/XYZ line simplicity, no complete arc/CompoundCurve analysis.

- **Triangle, PlanarPatch, PolyhedralSurfaceTopology** — Partial structure/plane/incidence checks; no full hole
  topology or arbitrary patch-intersection proof.

Historical equalsTo used concrete class, family, dimension, integer SRID and strict X/Y/Z/M comparison,
not full SRS identity or ST_Equals.
Historical model constructors partially guarded coordinates, members, rings and joins;
their guarantees can disappear during extraction and do not cover third-party interface implementations.

Current functional tests cover input classification, all enum routes, specialized preconditions,
warning payloads, groups, root/property paths and the defensive default.
Coverage enforces 100% production statement coverage; this does not prove normative completeness.
Local tests/quality do not establish success of the full PHP 8.4/8.5 × Symfony 5.4/6/7/8 matrix.
Independent review, successful CI and merge remain necessary for Done.

## 6. Remaining decisions and delivery map

| Open detail | Affected scope |
| --- | --- |
| Scaled tolerance for intermediate calculations | H–O; retain Q02 for coordinate pairs |
| CRS axes and model dimension agreement; inspect ISO 19111 | Future CRS metadata validation; outside D and E |
| EMPTY surface behavior under the additional closure validator | O/P; default EMPTY validity is already approved |
| Arc interactions and arbitrary patch intersections | H/I/O; declare unavailable checks explicitly |

D's exact family/layout/reference compatibility and cycle policy are approved and implemented.
GeometryCollection and #22's EMPTY MultiPoint/MultiLineString acceptance are approved, not open questions.
No further type's EMPTY policy is inferred from silence.

| Story identifier | Delivery |
| --- | --- |
| A / #8 | Catalogue and normative traceability |
| B / #10 | Historical Symfony input alignment; active empty-string policy superseded by C |
| C / #12 | Spatial/SpatialValidator, 27 specialized pairs, exhaustive dispatch and warnings; no geometric algorithms |
| D | C01–C04, recursive traversal, paths/groups/diagnostics |
| E | V02/V03/V16 coordinate and Point checks |
| F / G | V04/S01/B01 lines / F01 linear rings |
| H / I | V05 arcs / V06 CompoundCurve and requested simplicity |
| J / K | V07/V08 structural blocks / V09/V15 topology and complete public Polygon |
| L | V10 Triangle, reusing applicable Polygon rules |
| M / #22 | Collections, C01–C04 and optional S02/S03/F02 |
| N | V11 MultiPolygon interactions |
| O | V12–V14 surfaces and separate closure validation |
| P | User API, diagnostics and delivered coverage documentation |

Letters identify scopes, not GitHub issue numbers. Consult live Issues for dependencies, refinements and readiness.
Specialized delivery progressively replaces warnings; C does not depend on completion of D–O.
Detailed spatial-docs user documentation remains scheduled from 1.0.0-RC.0.

[symfony-input]: https://symfony.com/doc/7.4/validation/custom_constraint.html#creating-the-validator-itself
[ogc-sfa]: https://portal.ogc.org/files/?artifact_id=25355
[ogc-gml]: https://docs.ogc.org/is/07-036/07-036.pdf
[php-floats]: https://www.php.net/manual/en/language.types.float.php
