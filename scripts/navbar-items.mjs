import { existsSync } from 'node:fs';
import path from 'node:path';

export const libraryCategories = [
  { label: 'Doctrine Integration', libraries: [['doctrine-spatial', 'Doctrine Spatial']] },
  { label: 'Geometry Model', libraries: [
    ['spatial-types', 'Spatial Types'], ['spatial-core', 'Spatial Core'], ['spatial-validator', 'Spatial Validator'],
  ] },
  { label: 'Data Conversion', libraries: [
    ['spatial-encoder', 'Spatial Encoder'], ['spatial-decoder', 'Spatial Decoder'], ['spatial-transformer', 'Spatial Transformer'],
  ] },
  { label: 'Parsers', libraries: [
    ['geo-parser', 'Geo Parser'], ['wkt-parser', 'WKT Parser'], ['wkb-parser', 'WKB Parser'],
  ] },
];

export function createLibraryCategories(libraries, docsDirectory) {
  return libraryCategories.map(({ label, libraries: entries }) => ({
    label,
    items: entries.map(([name, title]) => {
      const current = Object.entries(libraries[name]?.versions ?? {}).find(([, status]) => status === 'Current')?.[0];
      const currentSource = current && `${name}/${current}/index.md`;
      if (currentSource && existsSync(path.join(docsDirectory, currentSource))) {
        return { label: title, to: `/${currentSource.replace(/\.md$/, '.html')}` };
      }
      const roadmapSource = `${name}/roadmap.md`;
      if (existsSync(path.join(docsDirectory, roadmapSource))) {
        return { label: title, to: `/${name}/roadmap.html`, note: 'Roadmap' };
      }
      return { label: title, note: 'Documentation unavailable' };
    }),
  }));
}

export function createNavbarItems(libraries, docsDirectory) {
  return [
    { type: 'custom-canonical', label: 'Overview', to: '/index.html', position: 'left' },
    {
      type: 'custom-megaMenu', label: 'Libraries', position: 'left',
      overview: '/index.html#browse-the-documentation',
      overviewLabel: 'All libraries',
      categories: createLibraryCategories(libraries, docsDirectory),
    },
    {
      type: 'custom-megaMenu', label: 'Guides', position: 'left',
      categories: [
        { label: 'DBMS', items: [
          { label: 'DBMS overview', to: '/dbms/index.html' },
          { label: 'PostGIS', to: '/dbms/postgis.html' },
          { label: 'MySQL', to: '/dbms/mysql.html' },
          { label: 'MariaDB', to: '/dbms/mariadb.html' },
          { label: 'SQL Server', to: '/dbms/sql-server.html' },
        ] },
        { label: 'Concepts', items: [
          { label: 'Concepts overview', to: '/concepts/index.html' },
          { label: 'Geometries', to: '/concepts/geometries.html' },
          { label: 'Dimensions', to: '/concepts/dimensions.html' },
          { label: 'Coordinate reference systems', to: '/concepts/crs.html' },
          { label: 'Formats', to: '/concepts/formats.html' },
        ] },
      ],
    },
    {
      type: 'custom-megaMenu', label: 'Standards', position: 'left', categories: [
        { label: 'ISO', items: [
          { label: 'ISO overview', to: '/standards/iso/index.html' },
          { label: 'ISO/IEC 13249-3 — SQL/MM Spatial', to: '/standards/iso/iso-iec-13249-3.html' },
          { label: 'ISO 19107 — Spatial schema', to: '/standards/iso/iso-19107.html' },
          { label: 'ISO 19111 — Referencing by coordinates', to: '/standards/iso/iso-19111.html' },
          { label: 'ISO 19136 — Geography Markup Language', to: '/standards/iso/iso-19136.html' },
        ] },
        { label: 'OGC', items: [
          { label: 'OGC overview', to: '/standards/ogc/index.html' },
          { label: 'Simple Feature Access 1.2.1', to: '/standards/ogc/ogc-06-103r4.html' },
        ] },
        { label: 'RFC', items: [
          { label: 'RFC overview', to: '/standards/rfc/index.html' },
          { label: 'RFC 7946 — GeoJSON', to: '/standards/rfc/rfc-7946.html' },
        ] },
      ],
    },
    { type: 'custom-unavailable', label: 'Search', note: 'Documentation search is not available yet.', position: 'right' },
    { label: 'GitHub', href: 'https://github.com/longitude-one', position: 'right' },
  ];
}
