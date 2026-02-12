import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { useAuth } from "@/app/hooks/useAuth";
import { useToast } from "@/app/hooks/useToast";
import { useUIStore } from "@/app/stores";
import { Eye, EyeOff, Key, User, Mail, Lock } from "lucide-react";
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
			<div className="flex min-h-[700px] w-full items-center justify-center px-4 py-12">
				<Card className="w-full max-w-xl border-none shadow-lg transition-all duration-300 hover:shadow-xl">
					<CardHeader className="text-center pb-4">
						<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
							<Lock className="h-6 w-6" />
						</div>
						<CardTitle className="text-xl font-semibold">{t("auth.accountSettings")}</CardTitle>
						<CardDescription className="mt-1 text-sm text-muted-foreground">{t("auth.loginToAccessAccountSettings")}</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col items-center gap-4">
						<Button size="default" className="w-28 text-sm">
							{t("auth.login")}
						</Button>
						<p className="mt-2 text-center text-xs text-muted-foreground">
							{t("auth.loginToManageYourAccount")}
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6 py-6">
			<Card className="border-none shadow-md">
				<CardHeader className="pb-4">
					<CardTitle className="text-lg font-semibold">{t("auth.accountInformation")}</CardTitle>
					<CardDescription className="mt-1 text-sm text-muted-foreground">{t("auth.yourAccountDetails")}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="name" className="text-xs font-medium">{t("auth.username")}</Label>
						<div className="flex items-center gap-2 border border-input rounded-lg p-2 bg-background">
							<User className="h-4 w-4 text-muted-foreground" />
							<Input
								id="name"
								type="text"
								value={user.name || ""}
								disabled
								className="border-none bg-transparent focus:ring-0"
							/>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="email" className="text-xs font-medium">{t("auth.email")}</Label>
						<div className="flex items-center gap-2 border border-input rounded-lg p-2 bg-background">
							<Mail className="h-4 w-4 text-muted-foreground" />
							<Input
								id="email"
								type="email"
								value={user.email || ""}
								disabled
								className="border-none bg-transparent focus:ring-0"
							/>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card className="border-none shadow-md">
				<CardHeader className="pb-4">
					<CardTitle className="text-lg font-semibold">{t("auth.changePassword")}</CardTitle>
					<CardDescription className="mt-1 text-sm text-muted-foreground">{t("auth.updateYourPassword")}</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handlePasswordChange} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="currentPassword" className="text-xs font-medium">{t("auth.currentPassword")}</Label>
							<div className="relative">
								<Key className="-translate-y-1/2 absolute top-1/2 left-3 h-3 w-3 text-muted-foreground" />
								<Input
									id="currentPassword"
									type={showPasswords.current ? "text" : "password"}
									value={passwordForm.currentPassword}
									onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
									className="pl-8 pr-8 py-1.5 text-sm"
									required
								/>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="-translate-y-1/2 absolute top-1/2 right-1 h-6 w-6 p-0"
									onClick={() => togglePasswordVisibility("current")}
								>
									{showPasswords.current ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
								</Button>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="newPassword" className="text-xs font-medium">{t("auth.newPassword")}</Label>
							<div className="relative">
								<Key className="-translate-y-1/2 absolute top-1/2 left-3 h-3 w-3 text-muted-foreground" />
								<Input
									id="newPassword"
									type={showPasswords.new ? "text" : "password"}
									value={passwordForm.newPassword}
									onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
									className="pl-8 pr-8 py-1.5 text-sm"
									required
								/>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="-translate-y-1/2 absolute top-1/2 right-1 h-6 w-6 p-0"
									onClick={() => togglePasswordVisibility("new")}
								>
									{showPasswords.new ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
								</Button>
							</div>
							<p className="mt-1 text-xs text-muted-foreground">
								{t("auth.passwordRequirements")}
							</p>
						</div>

						<div className="space-y-2">
							<Label htmlFor="confirmPassword" className="text-xs font-medium">{t("auth.confirmNewPassword")}</Label>
							<div className="relative">
								<Key className="-translate-y-1/2 absolute top-1/2 left-3 h-3 w-3 text-muted-foreground" />
								<Input
									id="confirmPassword"
									type={showPasswords.confirm ? "text" : "password"}
									value={passwordForm.confirmPassword}
									onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
									className="pl-8 pr-8 py-1.5 text-sm"
									required
								/>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="-translate-y-1/2 absolute top-1/2 right-1 h-6 w-6 p-0"
									onClick={() => togglePasswordVisibility("confirm")}
								>
									{showPasswords.confirm ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
								</Button>
							</div>
						</div>

						<Button type="submit" disabled={isSubmitting} className="w-full py-1.5 text-sm">
							{isSubmitting ? (
								<div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
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