# Spatial Encoder migration (#55)

| Collected source | Destination |
| --- | --- |
| `inbox/spatial-encoder/v1/README.md` | `docs/spatial-encoder/v1/index.md` |
| `inbox/spatial-encoder/v1/docs/strategies.md` | `docs/spatial-encoder/v1/strategies.md` |

README strategy list consolidated into the more complete six-strategy guide (includes GeoJSON).
Repository badges excluded. Pre-release install command retained explicitly as collected snapshot.
Repository-relative code/test links rewritten to GitHub. All encoding examples preserved.
The obsolete note claiming GeometryCollections unavailable is superseded by their implementation section in the same source.
The guide describes collected implementation behavior; reference links remain distinct from conformance guarantees.

HTTP review: legacy encoder code/test main paths returned 404 or transient 503; removed these links while retaining their descriptions and examples.
MySQL manual returned 403 (access blocked); retained authoritative vendor URL without claiming successful retrieval.
Other format-reference URLs returned 200 except transient GitHub GDAL 503.
