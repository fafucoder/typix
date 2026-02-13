import { authClient } from "@/app/lib/auth-client";
import { useState, useEffect } from "react";

interface UserWithRole {
	id: string;
	name: string;
	email: string;
	emailVerified: boolean;
	image: string | null;
	role: string;
	createdAt: number;
	updatedAt: number;
}

interface ApiResponse {
	code: string;
	data?: {
		user: UserWithRole;
	};
	message?: string;
}

function useAuthWrap() {
	const session = authClient.useSession();
	const [userWithRole, setUserWithRole] = useState<UserWithRole | null>(null);
	const [isLoadingUser, setIsLoadingUser] = useState(false);

	// Get complete user info with role from API
	useEffect(() => {
		const fetchUserInfo = async () => {
			if (session.data?.user) {
				setIsLoadingUser(true);
				try {
					const response = await fetch('/api/settings/getUserInfo', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
					});
					
					if (response.ok) {
						const data: ApiResponse = await response.json();
						if (data.code === 'ok' && data.data?.user) {
							setUserWithRole(data.data.user);
							console.log('Fetched user with role:', data.data.user);
						}
					}
				} catch (error) {
					console.error('Error fetching user info:', error);
				} finally {
					setIsLoadingUser(false);
				}
			}
		};

		fetchUserInfo();
	}, [session.data?.user]);

	return {
		// User data and authentication status
		user: userWithRole || session.data?.user || null,
		isLogin: !!session.data?.user,
		isLoading: session.isPending || isLoadingUser,
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

export type { UserWithRole };