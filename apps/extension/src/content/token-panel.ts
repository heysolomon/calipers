/**
 * Design token panel — thin re-export shim.
 * The token view is now integrated into the control panel (panel.ts)
 * and morphs in/out with a horizontal slide animation.
 */
export {
  showTokensView   as showTokenPanel,
  hideTokensView   as hideTokenPanel,
  toggleTokensView as toggleTokenPanel,
  isPanelElement   as isTokenPanel,
} from './panel';
