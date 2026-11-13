import { bucketize, median, toUsd } from './money';

describe('toUsd', () => {
  const fx = { USD: 1, INR: 0.012, JPY: 0.0066 };

  it('converts using the snapshot rate', () => {
    expect(toUsd(100, 'USD', fx)).toBeCloseTo(100);
    expect(toUsd(1_000_000, 'INR', fx)).toBeCloseTo(12_000);
  });

  it('fails loudly on a currency with no rate instead of returning zero', () => {
    expect(() => toUsd(10, 'XXX', fx)).toThrow('XXX');
  });
});

describe('median', () => {
  it('handles odd counts', () => {
    expect(median([1, 2, 9])).toBe(2);
  });

  it('averages the middle pair for even counts', () => {
    expect(median([1, 2, 3, 10])).toBe(2.5);
  });

  it('returns null for empty input', () => {
    expect(median([])).toBeNull();
  });
});

describe('bucketize', () => {
  it('puts values into width sized buckets and an open ended last bucket', () => {
    const buckets = bucketize([5_000, 15_000, 25_000, 250_000, 400_000], 10_000, 30_000);
    expect(buckets).toHaveLength(4); // 0-10k, 10-20k, 20-30k, 30k+
    expect(buckets[0].count).toBe(1);
    expect(buckets[1].count).toBe(1);
    expect(buckets[2].count).toBe(1);
    expect(buckets[3].count).toBe(2);
    expect(buckets[3].max).toBeNull();
  });

  it('treats the cap boundary as open ended', () => {
    const buckets = bucketize([30_000], 10_000, 30_000);
    expect(buckets[buckets.length - 1].count).toBe(1);
  });
});
