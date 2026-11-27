import { describe, expect, it } from 'vitest';
import { RateLimiter } from './rate-limit.js';

describe('RateLimiter', () => {
	it('limits a key after its attempts, until the window ends', () => {
		const limiter = new RateLimiter(3, 1000);
		for (let i = 0; i < 3; i++) {
			expect(limiter.isLimited('a', 0)).toBe(false);
			limiter.hit('a', 0);
		}
		expect(limiter.isLimited('a', 999)).toBe(true);
		expect(limiter.isLimited('a', 1000)).toBe(false);
	});

	it('starts a new window after the last one ends', () => {
		const limiter = new RateLimiter(2, 1000);
		limiter.hit('a', 0);
		limiter.hit('a', 0);
		limiter.hit('a', 1500);
		expect(limiter.isLimited('a', 1500)).toBe(false);
		limiter.hit('a', 1600);
		expect(limiter.isLimited('a', 1600)).toBe(true);
	});

	it('counts keys apart', () => {
		const limiter = new RateLimiter(1, 1000);
		limiter.hit('a', 0);
		expect(limiter.isLimited('a', 0)).toBe(true);
		expect(limiter.isLimited('b', 0)).toBe(false);
	});

	it('forgets a key on reset', () => {
		const limiter = new RateLimiter(1, 1000);
		limiter.hit('a', 0);
		limiter.reset('a');
		expect(limiter.isLimited('a', 0)).toBe(false);
	});

	it('keeps live windows when it drops ended ones', () => {
		const limiter = new RateLimiter(1, 1000);
		for (let i = 0; i < 1000; i++) limiter.hit(`old-${i}`, 0);
		limiter.hit('live', 1500);
		// A new window with 1000 keys stored sweeps the ended ones.
		limiter.hit('new', 2000);
		expect(limiter.isLimited('old-1', 2000)).toBe(false);
		expect(limiter.isLimited('live', 2000)).toBe(true);
		expect(limiter.isLimited('new', 2000)).toBe(true);
	});
});
