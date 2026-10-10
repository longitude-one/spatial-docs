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
      label: 'Libraries',
      items: [
        {
          type: 'category',
          label: 'Spatial Core 1.x',
          link: { type: 'doc', id: 'spatial-core/v1/index' },
          items: ['spatial-core/v1/index', 'spatial-core/v1/geometry/index', 'spatial-core/roadmap'],
        },
        {
          type: 'category',
          label: 'Spatial Decoder 1.x',
          link: { type: 'doc', id: 'spatial-decoder/v1/index' },
          items: ['spatial-decoder/v1/index'],
        },
        {
          type: 'category',
          label: 'Doctrine Spatial',
          items: [
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
