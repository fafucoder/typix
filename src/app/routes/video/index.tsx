import { useAuth } from "@/app/hooks/useAuth";
import { useAiService } from "@/app/hooks/useService";
import { useToast } from "@/app/hooks/useToast";
import { cn } from "@/app/lib/utils";
import { ChatArea, type ChatAreaRef } from "@/app/routes/chat/-components/chat/ChatArea";
import { ChatInput } from "@/app/routes/chat/-components/chat/ChatInput";
import { ChatSidebar } from "@/app/routes/chat/-components/sidebar/ChatSidebar";
import { useChat } from "@/app/routes/chat/-hooks/useChat";
import { ChatSidebarProvider, useSidebar } from "@/app/routes/chat/-hooks/useChatSidebar";
import type { AspectRatio } from "@/server/ai/types/api";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";

export const Route = createFileRoute("/video/")({
	component: VideoPage,
	validateSearch: z.object({
		chatId: z.string().optional(),
	}),
});

function VideoPage() {
	return (
		<ChatSidebarProvider>
			<VideoPageContent />
		</ChatSidebarProvider>
	);
}

function VideoPageContent() {
	const { chatId } = Route.useSearch();
	const navigate = Route.useNavigate();
	const chatAreaRef = useRef<ChatAreaRef>(null);
	const { toast } = useToast();
	const { t } = useTranslation();
	const aiService = useAiService();

	// Local state for model selection when no chat is selected
	const [selectedProvider, setSelectedProvider] = useState<string | undefined>();
	const [selectedModel, setSelectedModel] = useState<string | undefined>();

	// Get available providers for auto-selection (text2video models)
	const { data: providers } = aiService.getEnabledAiProvidersWithModels.swr("ai-providers-with-models-video", {
		modelType: "text2video",
	});

	const {
		chats,
		currentChat,
		currentChatId,
		isGenerating,
		user: chatUser,
		isLoading,
		error,
		createNewChat,
		sendMessage,
		switchChat,
		clearChat,
		deleteChat,
		updateChat,
		updateMessage,
		deleteMessage,
		regenerateMessage,
	} = useChat(chatId, selectedProvider, selectedModel, "text2video");

	// Auto-select first available model for new chats only
	useEffect(() => {
		// If we have a chatId (existing chat), clear the selected provider/model
		// to prevent interference with the existing chat's configuration
		if (chatId) {
			setSelectedProvider(undefined);
			setSelectedModel(undefined);
			return;
		}

		// Only auto-select if:
		// 1. No chat is currently selected in URL (truly new chat)
		// 2. No model is currently selected
		// 3. No existing chat is loaded (currentChat is null/undefined)
		// 4. Not currently loading (to avoid interfering with existing chat loading)
		// 5. Providers are available
		if (
			!chatId &&
			!selectedProvider &&
			!selectedModel &&
			!currentChat &&
			!isLoading &&
			providers &&
			providers.length > 0
		) {
			const firstEnabledProvider = providers.find((p) => p.enabled && p.models.length > 0);
			if (firstEnabledProvider) {
				const firstEnabledModel = firstEnabledProvider.models.find((m) => m.enabled);
				if (firstEnabledModel) {
					setSelectedProvider(firstEnabledProvider.id);
					setSelectedModel(firstEnabledModel.id);
				}
			}
		}
	}, [chatId, selectedProvider, selectedModel, currentChat, isLoading, providers]);
	const { isOpen, isMobile } = useSidebar();

	const handleSendMessage = async (
		content: string,
		imageFiles?: File[],
		imageCount?: number,
		aspectRatio?: AspectRatio,
	) => {
		try {
			// If no chat is selected, create a new one first
			let targetChatId = currentChatId;
			if (!targetChatId) {
				targetChatId = await createNewChat();
				if (!targetChatId) {
					// If createNewChat returns null, it means user is not logged in and login modal is already opened
					// No need to show error toast in this case
					return;
				}
			}

			const result = await sendMessage(content, imageFiles, targetChatId, imageCount, aspectRatio);
			// If sendMessage returns null, it means user is not logged in and login modal is already opened
			// No need to show error toast in this case
			if (result === null) {
				return;
			}
		} catch (error) {
			console.error("Error sending message:", error);
			toast({
				title: t("chat.error.title", "Error"),
				description:
					error instanceof Error
						? error.message
						: t("chat.error.default", "An error occurred while sending the message"),
				variant: "destructive",
			});
		}
	};

	const handleDeleteChat = async (chatId: string) => {
		try {
			await deleteChat(chatId);
			// Navigate to /video without chatId
			navigate({ to: "/video", search: {} });
		} catch (error) {
			console.error("Error deleting chat:", error);
			toast({
				title: t("chat.error.title", "Error"),
				description: t("chat.error.deleteChat", "Failed to delete chat"),
				variant: "destructive",
			});
		}
	};

	const handleRenameChat = async (chatId: string, newTitle: string) => {
		try {
			await updateChat(chatId, { title: newTitle });
		} catch (error) {
			console.error("Error renaming chat:", error);
			toast({
				title: t("chat.error.title", "Error"),
				description: t("chat.error.renameChat", "Failed to rename chat"),
				variant: "destructive",
			});
		}
	};

	const handleSwitchChat = (chatId: string) => {
		switchChat(chatId);
		// Update URL with new chatId
		navigate({
			to: "/video",
			search: { chatId },
		});
	};

	const handleCreateNewChat = async () => {
		try {
			const newChatId = await createNewChat();
			if (newChatId) {
				// Navigate to /video with new chatId
				navigate({
					to: "/video",
					search: { chatId: newChatId },
				});
			}
			// If newChatId is null, it means user is not logged in and login modal is already opened
			// No need to show error toast in this case
		} catch (error) {
			console.error("Error creating new chat:", error);
			toast({
				title: t("chat.error.title", "Error"),
				description:
					error instanceof Error
						? error.message
						: t("chat.error.createChat", "Failed to create chat - no available AI models"),
				variant: "destructive",
			});
		}
	};

	const handleModelChange = (provider: string, model: string) => {
		setSelectedProvider(provider);
		setSelectedModel(model);
	};

	return (
		<div className="flex h-full">
			{/* Sidebar */}
			<ChatSidebar
				chats={chats}
				currentChatId={currentChatId}
				user={chatUser}
				onCreateChat={handleCreateNewChat}
				onSwitchChat={handleSwitchChat}
				onDeleteChat={handleDeleteChat}
				onRenameChat={handleRenameChat}
			/>
			{/* Main chat content area - margin adjustment for slide animation */}
			<div
				className={cn(
					"flex flex-1 flex-col transition-[margin-left] duration-300 ease-in-out",
					// Desktop: Margin calculation based on sidebar slide state
					// When expanded: GlobalNavigation (16px) + ChatSidebar (320px) = 336px
					// When collapsed: Only GlobalNavigation (16px), sidebar is completely hidden
					!isMobile && isOpen && "md:ml-96", // 16 + 320 = 336px, use ml-96 for 24rem
					!isMobile && !isOpen && "md:ml-16", // Only GlobalNavigation width: 16px = 4rem
					// Mobile: No margin, sidebar is overlay
					isMobile && "ml-0",
				)}
			>
				{/* Chat Area */}
				<ChatArea
					ref={chatAreaRef}
					chat={currentChat || null}
					user={chatUser}
					isGenerating={isGenerating}
					onCreateChat={handleCreateNewChat}
					onModelChange={handleModelChange}
					onMessageUpdate={updateMessage}
					onRetry={regenerateMessage}
					onDeleteMessage={deleteMessage}
					fallbackProvider={selectedProvider}
					fallbackModel={selectedModel}
					modelType="text2video"
				/>
				{/* Input Area */}
				<ChatInput
					onSendMessage={handleSendMessage}
					disabled={isGenerating}
					currentProvider={currentChat?.provider || selectedProvider}
					currentModel={currentChat?.model || selectedModel}
					placeholder="输入生成视频，按 Enter 发送 • Shift+Enter 换行"
				/>
			</div>
		</div>
	);
}
