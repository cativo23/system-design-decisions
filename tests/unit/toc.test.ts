import { describe, expect, it } from 'vitest';
import { currentSection, lastOnScreen } from '../../src/lib/layout/toc.ts';

const TOPS = [
  { id: 'problem', top: 100 },
  { id: 'how', top: 400 },
  { id: 'when', top: 900 },
];

describe('currentSection', () => {
  it('should return the last section whose top is above the line', () => {
    expect(currentSection(TOPS, 500)).toBe('how');
    expect(currentSection(TOPS, 900)).toBe('when');
  });

  it('should return the first id when none is above the line', () => {
    expect(currentSection(TOPS, 10)).toBe('problem');
  });

  it('should return null for empty input', () => {
    expect(currentSection([], 100)).toBeNull();
  });
});

describe('lastOnScreen', () => {
  it('should return the last section whose heading is above the bottom edge of the screen', () => {
    expect(lastOnScreen(TOPS, 1000)).toBe('when');
    expect(lastOnScreen(TOPS, 500)).toBe('how');
  });

  it('should skip headings that are off the bottom of the screen', () => {
    expect(lastOnScreen(TOPS, 300)).toBe('problem');
  });

  it('should return null when nothing is on screen, or for empty input', () => {
    expect(lastOnScreen(TOPS, 50)).toBeNull();
    expect(lastOnScreen([], 800)).toBeNull();
  });
});

describe('currentSection at the bottom of the page', () => {
  // The last headings can never reach the reading line there, so what is on screen is what has been reached.
  const NEAR_END = [
    { id: 'pitfalls', top: -300 },
    { id: 'related', top: 224 },
    { id: 'deeper', top: 438 },
  ];

  it('should highlight the last section on screen once the page cannot scroll further', () => {
    expect(currentSection(NEAR_END, 200)).toBe('pitfalls'); // above the end the reading line decides
    expect(currentSection(NEAR_END, 200, { viewport: 900 })).toBe('deeper');
  });

  it('should fall back to the reading line when no heading is on screen', () => {
    expect(currentSection(TOPS, 500, { viewport: 50 })).toBe('how');
  });
});

