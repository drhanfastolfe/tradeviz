import type { CurrentDataset } from '../domain/types';

export type AppState = {
  currentDataset: CurrentDataset | null;
};
