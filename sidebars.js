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
          label: 'spatial-core',
          link: { type: 'doc', id: 'libraries/spatial-core/index' },
          items: ['libraries/spatial-core/index'],
        },
      ],
    },
  ],
};

export default sidebars;
