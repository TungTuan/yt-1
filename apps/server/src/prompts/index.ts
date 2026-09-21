import type { Market, SegmentType } from '@komorebi/shared-types';
import type { PromptModule } from './types';
import { jpPrompts } from './jp';
import { krPrompts } from './kr';

const promptsByMarket: Record<Market, Record<SegmentType, PromptModule>> = {
  jp: jpPrompts,
  kr: krPrompts,
};

export function getPromptModule(market: Market, segmentType: SegmentType): PromptModule {
  return promptsByMarket[market][segmentType];
}

export function allPromptModules(): PromptModule[] {
  return [...Object.values(jpPrompts), ...Object.values(krPrompts)];
}

export * from './types';
export * from './schemas';
