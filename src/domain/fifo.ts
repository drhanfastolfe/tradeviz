import { EPSILON } from './constants';
import type { Lot } from './types';

export function consumeLots(lots: Lot[], sharesSold: number): number {
  let remaining = sharesSold;
  let costBasis = 0;

  while (remaining > EPSILON && lots.length > 0) {
    const lot = lots[0];
    const used = Math.min(remaining, lot.shares);
    const unitCost = lot.shares ? lot.cost / lot.shares : 0;
    costBasis += used * unitCost;
    lot.shares -= used;
    lot.cost -= used * unitCost;
    remaining -= used;
    if (lot.shares <= EPSILON) lots.shift();
  }

  return costBasis;
}
