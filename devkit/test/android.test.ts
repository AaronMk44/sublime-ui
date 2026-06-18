import { describe, it, expect } from 'vitest';
import { parseAdbDevices } from '../src/lib/android.js';

describe('parseAdbDevices', () => {
  it('returns serials only for ready devices', () => {
    const out = [
      'List of devices attached',
      'emulator-5554\tdevice',
      'ABC123XYZ\tdevice',
      'BADdevice\toffline',
      'UNAUTH99\tunauthorized',
      '',
    ].join('\n');
    expect(parseAdbDevices(out)).toEqual(['emulator-5554', 'ABC123XYZ']);
  });
  it('returns empty when none attached', () => {
    expect(parseAdbDevices('List of devices attached\n\n')).toEqual([]);
  });
});
