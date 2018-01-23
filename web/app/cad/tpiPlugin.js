import TPI from './tpi'

/*
 * TPI stands for the Test Program Interface
 */
export function activate({services}) {
  services.TPI = TPI;
}