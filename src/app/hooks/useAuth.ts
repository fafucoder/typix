import { authClient } from "@/app/lib/auth-client";

function useAuthWrap() {
	const session = authClient.useSession();

	return {
		// User data and authentication status
		user: session.data?.user || null,
		isLogin: !!session.data?.user,
		isLoading: session.isPending,
		error: session.error,

		// Authentication methods
		logout: authClient.signOut,
		signIn: authClient.signIn,
		signUp: authClient.signUp,
	};
}

type UseAuthReturnType = ReturnType<typeof useAuthWrap>;

// Custom hook that wraps BetterAuth's useSession
export function useAuth() {
	// Always use the auth wrap function to get real authentication status
	// This ensures consistent behavior across all modes
	return useAuthWrap();
}