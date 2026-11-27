import type { TestProject } from 'vitest/node';
import { startTestDatabase, type TestDatabase } from '../support/database.ts';

declare module 'vitest' {
	export interface ProvidedContext {
		database: TestDatabase;
	}
}

export default async function setup(project: TestProject) {
	const { container, config } = await startTestDatabase();
	project.provide('database', config);
	return async () => {
		await container.stop();
	};
}
