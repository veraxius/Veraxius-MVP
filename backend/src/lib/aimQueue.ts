type Job = () => Promise<void>;

const DEBOUNCE_MS = 500;

class MicroRecalcQueue {
	private userTimers: Map<string, NodeJS.Timeout> = new Map();
	private userJobs: Map<string, Job> = new Map();

	enqueue(userId: string, job: Job) {
		this.userJobs.set(userId, job);
		const existing = this.userTimers.get(userId);
		if (existing) clearTimeout(existing);
		const t = setTimeout(async () => {
			this.userTimers.delete(userId);
			const j = this.userJobs.get(userId);
			this.userJobs.delete(userId);
			if (j) {
				try { await j(); } catch { /* ignore */ }
			}
		}, DEBOUNCE_MS);
		this.userTimers.set(userId, t);
	}
}

export const microRecalcQueue = new MicroRecalcQueue();

