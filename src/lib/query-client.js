import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 2,
			retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
		},
		mutations: {
			retry: 1,
		},
	},
});