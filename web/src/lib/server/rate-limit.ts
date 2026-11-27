/**
 * Counts attempts per key in fixed windows, in memory. The portal runs as one process, so
 * memory is the only store it needs; a restart forgets the counts.
 */
export class RateLimiter {
	readonly #limit: number;
	readonly #windowMs: number;
	readonly #windows = new Map<string, { count: number; resetAt: number }>();

	constructor(limit: number, windowMs: number) {
		this.#limit = limit;
		this.#windowMs = windowMs;
	}

	/** Whether `key` has used up its attempts in the current window. */
	isLimited(key: string, now = Date.now()): boolean {
		const window = this.#windows.get(key);
		return window !== undefined && window.resetAt > now && window.count >= this.#limit;
	}

	/** Counts one attempt for `key`. */
	hit(key: string, now = Date.now()): void {
		const window = this.#windows.get(key);
		if (window === undefined || window.resetAt <= now) {
			this.#sweep(now);
			this.#windows.set(key, { count: 1, resetAt: now + this.#windowMs });
		} else {
			window.count += 1;
		}
	}

	/** Forgets the attempts of `key`, after a success. */
	reset(key: string): void {
		this.#windows.delete(key);
	}

	/** Drops ended windows, so keys that stop coming back do not pile up. */
	#sweep(now: number): void {
		if (this.#windows.size < 1000) return;
		for (const [key, window] of this.#windows) {
			if (window.resetAt <= now) this.#windows.delete(key);
		}
	}
}

const MINUTE = 60_000;

/** Every login attempt from one address. */
export const loginAttemptsByAddress = new RateLimiter(20, 15 * MINUTE);

/** Failed logins on one avatar name, from any address. */
export const loginFailuresByName = new RateLimiter(5, 15 * MINUTE);

/** Every account creation attempt from one address. */
export const signupAttemptsByAddress = new RateLimiter(10, 60 * MINUTE);

/** Wrong current passwords on one account, when changing the password or deleting it. */
export const passwordFailuresByAccount = new RateLimiter(5, 15 * MINUTE);
