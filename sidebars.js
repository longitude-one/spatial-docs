const sidebars = {
  docsSidebar: [
    'intro',
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
          label: 'spatial-core',
          link: { type: 'doc', id: 'libraries/spatial-core/index' },
          items: ['libraries/spatial-core/index'],
        },
      ],
    },
  ],
};

export default sidebars;