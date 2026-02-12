import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { useAuth } from "@/app/hooks/useAuth";
import { useToast } from "@/app/hooks/useToast";
import { useUIStore } from "@/app/stores";
import { Eye, EyeOff, Key, User, Mail } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/settings/account")({
	component: AccountSettingsPage,
});

function AccountSettingsPage() {
	const { user, isLogin } = useAuth();
	const { openLoginModal } = useUIStore();
	const { t } = useTranslation();
	const { toast } = useToast();

	// Password change form state
	const [passwordForm, setPasswordForm] = useState({
		currentPassword: "",
		newPassword: "",
		confirmPassword: "",
	});

	const [showPasswords, setShowPasswords] = useState({
		current: false,
		new: false,
		confirm: false,
	});

	const [isSubmitting, setIsSubmitting] = useState(false);

	// Handle password change
	const handlePasswordChange = async (e: React.FormEvent) => {
		e.preventDefault();

		// Validate form
		if (!passwordForm.currentPassword) {
			toast({ title: t("auth.currentPasswordRequired"), variant: "destructive" });
			return;
		}

		if (!passwordForm.newPassword) {
			toast({ title: t("auth.newPasswordRequired"), variant: "destructive" });
			return;
		}

		if (passwordForm.newPassword !== passwordForm.confirmPassword) {
			toast({ title: t("auth.passwordsDoNotMatch"), variant: "destructive" });
			return;
		}

		// Check password length
		if (passwordForm.newPassword.length < 6) {
			toast({ title: t("auth.passwordTooShort"), variant: "destructive" });
			return;
		}

		if (passwordForm.newPassword.length > 72) {
			toast({ title: t("auth.passwordTooLong"), variant: "destructive" });
			return;
		}

		try {
			setIsSubmitting(true);

			// Call custom API endpoint to update password
			const response = await fetch("/api/settings/updatePassword", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					currentPassword: passwordForm.currentPassword,
					newPassword: passwordForm.newPassword,
				}),
			});

			const result: { code: string; message: string; errorCode?: string } = await response.json();

			if (!response.ok || result.code === "error") {
				// Use errorCode for internationalization if provided
				if (result.errorCode && t(`auth.${result.errorCode}`)) {
					toast({ title: t(`auth.${result.errorCode}`), variant: "destructive" });
				} else {
					toast({ title: result.message || t("auth.passwordUpdateFailed"), variant: "destructive" });
				}
				return;
			}

			// Success
			toast({ title: t("auth.passwordUpdatedSuccessfully"), variant: "default" });
			
			// Reset form
			setPasswordForm({
				currentPassword: "",
				newPassword: "",
				confirmPassword: "",
			});

		} catch (error: any) {
			console.error("Password update error:", error);
			toast({ title: error.message || t("auth.networkError"), variant: "destructive" });
		} finally {
			setIsSubmitting(false);
		}
	};

	// Toggle password visibility
	const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
		setShowPasswords((prev) => ({
			...prev,
			[field]: !prev[field],
		}));
	};

	// Handle login redirect
	const handleLogin = () => {
		openLoginModal();
	};

	// If user is not logged in, show login prompt
	if (!isLogin || !user) {
		return (
			<div className="flex min-h-[600px] w-full flex-col items-center justify-center p-4">
				<Card className="w-full max-w-md">
					<CardHeader className="text-center">
						<CardTitle>{t("auth.accountSettings")}</CardTitle>
						<CardDescription>{t("auth.loginToAccessAccountSettings")}</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col items-center gap-4">
						<Button size="lg" onClick={handleLogin}>
							{t("auth.login")}
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-8">
			<Card>
				<CardHeader>
					<CardTitle>{t("auth.accountInformation")}</CardTitle>
					<CardDescription>{t("auth.yourAccountDetails")}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="name">{t("auth.username")}</Label>
						<div className="flex items-center gap-2">
							<User className="h-5 w-5 text-muted-foreground" />
							<Input
								id="name"
								type="text"
								value={user.name || ""}
								disabled
								className="pl-10"
							/>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="email">{t("auth.email")}</Label>
						<div className="flex items-center gap-2">
							<Mail className="h-5 w-5 text-muted-foreground" />
							<Input
								id="email"
								type="email"
								value={user.email || ""}
								disabled
								className="pl-10"
							/>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>{t("auth.changePassword")}</CardTitle>
					<CardDescription>{t("auth.updateYourPassword")}</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handlePasswordChange} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="currentPassword">{t("auth.currentPassword")}</Label>
							<div className="relative">
								<Key className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
								<Input
									id="currentPassword"
									type={showPasswords.current ? "text" : "password"}
									value={passwordForm.currentPassword}
									onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
									className="pl-10 pr-10"
									required
								/>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="-translate-y-1/2 absolute top-1/2 right-1 h-8 w-8 p-0"
									onClick={() => togglePasswordVisibility("current")}
								>
									{showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
								</Button>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="newPassword">{t("auth.newPassword")}</Label>
							<div className="relative">
								<Key className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
								<Input
									id="newPassword"
									type={showPasswords.new ? "text" : "password"}
									value={passwordForm.newPassword}
									onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
									className="pl-10 pr-10"
									required
								/>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="-translate-y-1/2 absolute top-1/2 right-1 h-8 w-8 p-0"
									onClick={() => togglePasswordVisibility("new")}
								>
									{showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
								</Button>
							</div>
							<p className="text-xs text-muted-foreground">
								{t("auth.passwordRequirements")}
							</p>
						</div>

						<div className="space-y-2">
							<Label htmlFor="confirmPassword">{t("auth.confirmNewPassword")}</Label>
							<div className="relative">
								<Key className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
								<Input
									id="confirmPassword"
									type={showPasswords.confirm ? "text" : "password"}
									value={passwordForm.confirmPassword}
									onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
									className="pl-10 pr-10"
									required
								/>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="-translate-y-1/2 absolute top-1/2 right-1 h-8 w-8 p-0"
									onClick={() => togglePasswordVisibility("confirm")}
								>
									{showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
								</Button>
							</div>
						</div>

						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? (
								<div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
							) : (
								t("auth.updatePassword")
							)}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}