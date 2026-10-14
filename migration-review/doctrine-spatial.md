# Doctrine Spatial migration mapping — Task #50

All source paths below are relative to `inbox/doctrine-spatial/v5/`; sources remain unchanged.
General non-historical material belongs to v6 according to the approved migration rules,
which supersede the Task's original v5 default.

| Source | Destination under `docs/doctrine-spatial/` | Treatment |
| --- | --- | --- |
| `README.md` | `v6/project-overview.md`, existing `roadmap.md` | Preserve overview, compatibility, roadmap, limitations and branch strategy. |
| `docs/index.rst` | `v6/index.md` | Overview, history, demo link and Markdown guide navigation. |
| `docs/Installation.rst` | `v6/installation.md` | Composer examples and contributor installation. Close incomplete JSON example. |
| `docs/Configuration.rst` | `v6/configuration.md` | Preserve YAML and PHP examples; local guide and catalogue links. |
| `docs/Entity.rst` | `v5/entity.md` | Preserve historical annotation mapping, incompatible with the v6 ORM baseline. |
| `docs/Repository.rst` | `v6/repository.md` | Preserve spatial query repository example; close its incomplete class. |
| `docs/Glossary.rst` | `v6/glossary.md` | Convert grid tables to GFM; preserve collected capability catalogue. |
| `docs/Contributing.rst` | `v6/contributing.md` | Preserve upstream development workflow and examples. |
| `docs/Test.rst` | `v6/test-environment.md` | Preserve Docker setup and test commands. |

Deliberate exclusions: README status/download badges and donation button are promotional
or live metadata rather than technical documentation. The existing roadmap remains the
library roadmap entry point. RST labels, toctree directives and markup are replaced with
Markdown headings, tables, links and navigation. The collected catalogue and compatibility
snapshot are library implementation records, not independently verified normative claims.
Upstream Sphinx contribution instructions describe the upstream repository, not this site.

## ORM compatibility review

The v5 entity example uses `@ORM\Entity`, `@ORM\Column` and the annotation metadata
driver removed in ORM 3. This is explicitly restricted to Doctrine Spatial 5 with ORM 2,
not all supported ORM versions of v5. Doctrine's
[ORM 3.6 attributes reference](https://www.doctrine-project.org/projects/doctrine-orm/en/3.6/reference/attributes-reference.html)
records the removal of annotation metadata support.

The v6 configuration uses DBAL type registration and ORM custom function registration,
not annotation mapping. These remain documented in the
[ORM 3.6 custom mapping types guide](https://www.doctrine-project.org/projects/doctrine-orm/en/3.6/cookbook/custom-mapping-types.html)
and [DQL function guide](https://www.doctrine-project.org/projects/doctrine-orm/en/3.6/cookbook/dql-user-defined-functions.html).
The repository example uses query builder parameters and ServiceEntityRepository;
its PHPDoc `@method`, `@param` and `@return` entries are documentation, not ORM metadata.
