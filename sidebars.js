const sidebars = {
  docsSidebar: [
    'intro',
    {
      type: 'category',
      label: 'About',
      items: ['about/versioning'],
    },
    {
      type: 'category',
      label: 'Shared',
      link: { type: 'doc', id: 'shared/index' },
      items: [
        'shared/index',
        'shared/portable-markdown-publication-contract',
        'shared/spatial-reference-documentation-architecture',
        'shared/markdown-export-example',
      ],
    },
    {
      type: 'category',
      label: 'Standards',
      items: [
        'standards/iso/index',
        'standards/iso/iso-iec-13249-3',
        'standards/iso/iso-19107',
        'standards/iso/iso-19111',
        'standards/iso/iso-19136',
        'standards/ogc/index',
        'standards/ogc/ogc-06-103r4',
        'standards/rfc/index',
        'standards/rfc/rfc-7946',
      ],
    },
    {
      type: 'category',
      label: 'Concepts',
      link: { type: 'doc', id: 'concepts/index' },
      items: [
        'concepts/index',
        'concepts/geometries',
        'concepts/dimensions',
        'concepts/crs',
        'concepts/formats',
      ],
    },
    {
      type: 'category',
      label: 'DBMS',
      link: { type: 'doc', id: 'dbms/index' },
      items: ['dbms/index', 'dbms/postgis', 'dbms/mysql', 'dbms/mariadb', 'dbms/sql-server'],
    },
    {
      type: 'category',
      label: 'Libraries',
      items: [
        {
          type: 'category',
          label: 'Spatial Core 1.x',
          link: { type: 'doc', id: 'spatial-core/v1/index' },
          items: ['spatial-core/index', 'spatial-core/v1/index', 'spatial-core/v1/geometry/index', 'spatial-core/roadmap'],
        },
        {
          type: 'category',
          label: 'Spatial Decoder 1.x',
          link: { type: 'doc', id: 'spatial-decoder/v1/index' },
          items: ['spatial-decoder/index', 'spatial-decoder/v1/index', 'spatial-decoder/roadmap'],
        },
        {
          type: 'category',
          label: 'Geo Parser 4.x',
          link: { type: 'doc', id: 'geo-parser/v4/index' },
          items: ['geo-parser/index', 'geo-parser/v4/index', 'geo-parser/roadmap'],
        },
        {
          type: 'category',
          label: 'Spatial Encoder 1.x',
          link: { type: 'doc', id: 'spatial-encoder/v1/index' },
          items: ['spatial-encoder/index', 'spatial-encoder/v1/index', 'spatial-encoder/roadmap'],
        },
        {
          type: 'category',
          label: 'Spatial Types 1.x',
          link: { type: 'doc', id: 'spatial-types/v1/index' },
          items: ['spatial-types/index', 'spatial-types/v1/index', 'spatial-types/roadmap'],
        },
        {
          type: 'category',
          label: 'WKB Parser 3.x',
          link: { type: 'doc', id: 'wkb-parser/v3/index' },
          items: ['wkb-parser/index', 'wkb-parser/v3/index', 'wkb-parser/roadmap'],
        },
        {
          type: 'category',
          label: 'WKT Parser 3.x',
          link: { type: 'doc', id: 'wkt-parser/v3/index' },
          items: ['wkt-parser/index', 'wkt-parser/v3/index', 'wkt-parser/roadmap'],
        },
        {
          type: 'category',
          label: 'Spatial Transformer 1.x',
          link: { type: 'doc', id: 'spatial-transformer/v1/index' },
          items: ['spatial-transformer/index', 'spatial-transformer/v1/index', 'spatial-transformer/roadmap'],
        },
        {
          type: 'category',
          label: 'Doctrine Spatial',
          items: [
            'doctrine-spatial/index',
            'doctrine-spatial/roadmap',
            'doctrine-spatial/v4/index',
            'doctrine-spatial/v5/index',
            'doctrine-spatial/v6/index',
            'doctrine-spatial/v7/index',
          ],
        },
      ],
    },
  ],
};

export default sidebars;
