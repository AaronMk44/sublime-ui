// devkit/test/scaffold/versions.test.ts
import { describe, it, expect } from 'vitest';
import { SUBLIME_VERSIONS, PEER_VERSIONS } from '../../src/lib/scaffold/versions.js';

describe('versions', () => {
  it('pins all four @sublime-ui packages with a caret range', () => {
    for (const k of ['framework', 'library', 'ui', 'desktop'] as const) {
      expect(SUBLIME_VERSIONS[k]).toMatch(/^\^\d+\.\d+\.\d+$/);
    }
  });
  it('provides peer ranges for the web and mobile runtimes', () => {
    expect(PEER_VERSIONS['@mui/material']).toBeTruthy();
    expect(PEER_VERSIONS['react-native']).toBeTruthy();
    expect(PEER_VERSIONS['react']).toBeTruthy();
  });
});
