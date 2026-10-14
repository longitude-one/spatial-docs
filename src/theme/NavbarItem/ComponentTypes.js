import ComponentTypes from '@theme-original/NavbarItem/ComponentTypes';
import MegaMenu from '../../components/MegaMenu';
import UnavailableNavbarItem from '../../components/UnavailableNavbarItem';
import CanonicalNavbarItem from '../../components/CanonicalNavbarItem';

export default {
  ...ComponentTypes,
  'custom-megaMenu': MegaMenu,
  'custom-unavailable': UnavailableNavbarItem,
  'custom-canonical': CanonicalNavbarItem,
};
