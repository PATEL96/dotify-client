// lib/posthog.ts
import posthog from "posthog-js";

if (typeof window !== "undefined") {
	posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
		api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST!,
		loaded: (ph) => {
			if (process.env.NODE_ENV === "development") {
				ph.debug(); // Enable debugging in development
			}
		},
	});
}

export default posthog;
