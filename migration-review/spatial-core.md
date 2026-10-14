# Spatial Core migration review — Task #58

Both collected files are assigned to Spatial Core v1, matching the explicit
collection context and README's 1.3.0 installation example. The exact installation
constraint and PHP 8.3 support statement retain their source scope.

| Collected source under `inbox/spatial-core/v1/` | Published destination under `docs/spatial-core/v1/` |
| --- | --- |
| `README.md` | `index.md`; GeometryTypeEnum section in `geometry/geometry-types.md` |
| `geometry-type.md` | Distinctions and examples consolidated in `geometry/geometry-types.md` |

## Preserved content

- Installation, PHP support, all enum API examples, geographic axes and ranges,
  exception factories, formatter behavior and both development commands.
- GeometryTypeEnum additions, component/dimension classifications and the README's
  exact 2015 DIS provenance; this records the collected API description without
  extending the existing shared normative reference's assessed edition.
- Separation between model membership, instantiability, concrete implementation
  and serialization strategy. Line-string and polygon WKT examples are retained.
- Geometry primitive index links the API and existing Concepts references.
- Add the missing `ExceptionInterface` import to the formatter factory example.

## Deliberate exclusions and consolidation

- Exclude live CI, download, coverage, PHP and release badges: these are repository
  status indicators, not stable versioned API instructions.
- Do not publish the older cross-standard table or enum inventory in
  `geometry-type.md`: its `MULTICURVE`/`MULTISURFACE` instantiability contradicts
  the collected README's current enum API, and its `LINE`/`LINEARRING` enum
  inventory is not corroborated by that API. The README's explicit library
  classification is retained as implementation documentation, not as a new
  normative ruling.
- Do not reproduce the stale normative table's unchecked OGC/ISO/WKT support
  matrix or unsupported standalone example tokens. Readers use the existing
  evidenced Concepts and Standards references for normative semantics and the
  selected strategy for actual representation support.
- Consolidate repeated GeometryTypeEnum explanation into one owning API page.
  All useful distinction and valid representation examples remain available.
- No new normative interpretation, public API or implementation behavior is
  introduced. `inbox/` remains unchanged.
