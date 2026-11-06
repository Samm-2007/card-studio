import type { Design } from './design';
import { madarFieldValue } from './madar';
import { normalizeTrackInput } from './magnetic';

// A single source for both card details and the Windows Track 2 payload.
export function cardTrack2(design: Design): string {
  return normalizeTrackInput(design.template === 'madar'
    ? madarFieldValue(design, 'number') : design.number).replace(/\s/g, '');
}
