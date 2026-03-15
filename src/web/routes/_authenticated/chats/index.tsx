import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { Trash2, MessageSquare, Search, Loader2, User } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'
import { toast } from 'sonner'
import { chatService, type Chat, type Message } from '@/lib/api/chat'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { AlertTriangle } from 'lucide-react'
import ProviderIcon from '@/components/icon/ProviderIcon'

export const Route = createFileRoute('/_authenticated/chats/')({
  component: ChatsPage,
})

function ChatsPage() {
  const [chats, setChats] = useState<Chat[]>([])
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null)
  const [selectedChatMessages, setSelectedChatMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [userName, setUserName] = useState('')
  const pageSize = 20
  const observerRef = useRef<HTMLDivElement>(null)

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [chatToDelete, setChatToDelete] = useState<Chat | null>(null)

  useEffect(() => {
    loadChats()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 500)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setPage(1)
    setChats([])
    loadChats(true)
  }, [debouncedSearch, userName])

  const loadChats = async (isNewSearch = false) => {
    try {
      if (isNewSearch) {
        setIsLoading(true)
      } else {
        setIsLoadingMore(true)
      }

      const currentPage = isNewSearch ? 1 : page
      const result = await chatService.getChats({
        page: currentPage,
        pageSize,
        search: debouncedSearch || undefined,
        userName: userName || undefined,
      })

      if (isNewSearch) {
        setChats(result.chats)
      } else {
        setChats(prev => [...prev, ...result.chats])
      }

      setTotal(result.total)
      if (!isNewSearch) {
        setPage(currentPage + 1)
      }
    } catch (error) {
      toast.error('加载创作列表失败')
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }

  const loadChatDetail = async (chat: Chat) => {
    try {
      setIsLoading(true)
      const result = await chatService.getChatById(chat.id)
      setSelectedChat(result.chat)
      setSelectedChatMessages(result.messages)
    } catch (error) {
      toast.error('加载创作详情失败')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectChat = (chat: Chat) => {
    if (selectedChat?.id !== chat.id) {
      loadChatDetail(chat)
    }
  }

  const handleDelete = (chat: Chat) => {
    setChatToDelete(chat)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!chatToDelete) return

    try {
      await chatService.deleteChat(chatToDelete.id)
      toast.success('删除成功')
      setIsDeleteDialogOpen(false)
      setChatToDelete(null)

      if (selectedChat?.id === chatToDelete.id) {
        setSelectedChat(null)
        setSelectedChatMessages([])
      }

      setPage(1)
      setChats([])
      loadChats(true)
    } catch (error) {
      toast.error('删除失败')
    }
  }

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isLoading && !isLoadingMore && chats.length < total) {
          loadChats()
        }
      },
      { threshold: 0.1 }
    )

    if (observerRef.current) {
      observer.observe(observerRef.current)
    }

    return () => observer.disconnect()
  }, [isLoading, isLoadingMore, chats.length, total, loadChats])

  return (
    <>
      <Header>
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main fluid>
        <section className='flex h-[calc(100vh-8rem)] gap-6'>
          <div className='flex w-full flex-col gap-2 sm:w-56 lg:w-72 2xl:w-80'>
            <div className='sticky top-0 z-10 -mx-4 bg-background px-4 pb-3 shadow-md sm:static sm:z-auto sm:mx-0 sm:p-0 sm:shadow-none'>
              <div className='flex items-center justify-between py-2'>
                <div className='flex gap-2 items-center'>
                  <h1 className='text-2xl font-bold'>创作历史</h1>
                  <MessageSquare size={20} />
                </div>
              </div>
              <div className='space-y-2 mt-2'>
                <div className='relative'>
                  <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
                  <Input
                    placeholder='搜索创作或用户名...'
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value)
                      setUserName(e.target.value)
                    }}
                    className='pl-8'
                  />
                </div>
              </div>
            </div>

            <ScrollArea className='-mx-3 h-full overflow-scroll p-3'>
              {isLoading && page === 1 ? (
                <div className='flex items-center justify-center py-8'>
                  <Loader2 className='h-6 w-6 animate-spin' />
                </div>
              ) : chats.length === 0 ? (
                <div className='flex h-full items-center justify-center text-muted-foreground'>
                  <div className='text-center'>
                    <MessageSquare size={48} className='mx-auto mb-2 opacity-50' />
                    <p>暂无创作记录</p>
                  </div>
                </div>
              ) : (
                <>
                  {chats.map((chat) => (
                    <div key={chat.id}>
                      <button
                        type='button'
                        className={cn(
                          'group hover:bg-accent hover:text-accent-foreground',
                          'flex w-full rounded-md px-2 py-2 text-start text-sm',
                          selectedChat?.id === chat.id && 'bg-muted',
                          chat.deleted === 1 && 'opacity-50'
                        )}
                        onClick={() => handleSelectChat(chat)}
                      >
                        <div className='flex gap-2 w-full'>
                          <div className='flex h-8 w-8 items-center justify-center rounded-full bg-muted'>
                            <MessageSquare size={16} />
                          </div>
                          <div className='flex-1 min-w-0'>
                            <div className='flex items-center gap-2'>
                              <span className={cn(
                                'font-medium truncate',
                                chat.deleted === 1 && 'line-through'
                              )}>
                                {chat.title}
                              </span>
                              {chat.deleted === 1 && (
                                <span className='text-xs px-1.5 py-0.5 bg-red-100 text-red-800 rounded-full'>
                                  已删除
                                </span>
                              )}
                            </div>
                            <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                              {chat.user && (
                                <>
                                  <User size={12} />
                                  <span className='truncate'>{chat.user.name}</span>
                                  <span>·</span>
                                </>
                              )}
                              <span>{format(new Date(chat.createdAt), 'MM-dd HH:mm')}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                      <Separator className='my-1' />
                    </div>
                  ))}
                  {isLoadingMore && (
                    <div className='flex items-center justify-center py-4'>
                      <Loader2 className='h-4 w-4 animate-spin' />
                    </div>
                  )}
                  {chats.length < total && !isLoadingMore && (
                    <div ref={observerRef} className='h-10' />
                  )}
                </>
              )}
            </ScrollArea>
          </div>

          <div className='flex flex-1 flex-col border bg-background overflow-hidden'>
            {selectedChat ? (
              <>
                <div className='flex items-center justify-between border-b p-3 flex-none'>
                  <div>
                    <h2 className='font-medium text-sm'>{selectedChat.title}</h2>
                    <p className='text-xs text-muted-foreground'>
                      {format(new Date(selectedChat.createdAt), 'yyyy-MM-dd HH:mm')}
                      {selectedChat.user && ` · ${selectedChat.user.name}`}
                    </p>
                  </div>
                  <div className='flex items-center gap-2'>
                    <ProviderIcon provider={selectedChat.provider} size={14} />
                    <span className='text-xs text-muted-foreground'>
                      {selectedChat.model}
                    </span>
                  </div>
                </div>

                <div className='flex-1 overflow-hidden'>
                  <ScrollArea className='h-full p-3'>
                  {isLoading ? (
                    <div className='flex h-full items-center justify-center'>
                      <Loader2 className='h-6 w-6 animate-spin' />
                    </div>
                  ) : selectedChatMessages.length === 0 ? (
                    <div className='flex h-full items-center justify-center text-muted-foreground'>
                      <div className='text-center'>
                        <MessageSquare size={48} className='mx-auto mb-2 opacity-30' />
                        <p>该创作暂无记录</p>
                      </div>
                    </div>
                  ) : (
                    <div className='space-y-4'>
                      {[...selectedChatMessages].reverse().map((message) => (
                        <div
                          key={message.id}
                          className={cn(
                            'flex',
                            message.role === 'user' ? 'justify-end' : 'justify-start'
                          )}
                        >
                          <div
                            className={cn(
                              'max-w-[80%] rounded-lg p-3',
                              message.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            )}
                          >
                            <p className='text-sm whitespace-pre-wrap'>{message.content}</p>
                            {/* Display generated images based on message type */}
                            {message.type === 'image' && message.generation && message.generation.resultUrls && message.generation.resultUrls.length > 0 && (
                              <div className='mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2'>
                                {message.generation.resultUrls.map((url, index) => {
                                  if (!url) return null;
                                  return (
                                    <img
                                      key={index}
                                      src={url}
                                      alt={`Generated ${index + 1}`}
                                      className='rounded-md border aspect-square h-auto w-full object-cover shadow-lg'
                                      loading='lazy'
                                    />
                                  );
                                })}
                              </div>
                            )}
                            {/* Display generated videos based on message type */}
                            {message.type === 'video' && message.generation && message.generation.resultUrls && message.generation.resultUrls.length > 0 && (
                              <div className='mt-2'>
                                {message.generation.resultUrls.map((url, index) => {
                                  if (!url) return null;
                                  return (
                                    <video
                                      key={index}
                                      src={url}
                                      controls
                                      className='rounded-md border aspect-video h-auto w-full object-cover shadow-lg'
                                      preload='metadata'
                                    />
                                  );
                                })}
                              </div>
                            )}
                            {message.generation && message.generation.status === 'failed' && (
                              <div className='mt-2 text-xs text-destructive'>
                                生成失败: {message.generation.errorReason}
                              </div>
                            )}
                            <p className='text-xs opacity-70 mt-1'>
                              {format(new Date(message.createdAt), 'HH:mm')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  </ScrollArea>
                </div>
              </>
            ) : (
              <div className='flex flex-1 items-center justify-center text-muted-foreground'>
                <div className='text-center'>
                  <MessageSquare size={64} className='mx-auto mb-4 opacity-30' />
                  <p>点击左侧创作查看详情</p>
                </div>
              </div>
            )}
          </div>
        </section>
      </Main>

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title={
          <div className='flex items-center gap-2 text-destructive'>
            <AlertTriangle size={20} />
            删除创作
          </div>
        }
        desc={
          <div className='space-y-3'>
            <p>
              确定要删除创作 <strong>{chatToDelete?.title}</strong> 吗？
            </p>
            <p className='text-sm text-muted-foreground'>
              此操作将永久删除该创作记录，无法撤销。
            </p>
          </div>
        }
        cancelBtnText='取消'
        confirmText='删除'
        destructive
        handleConfirm={confirmDelete}
      />
    </>
  )
}
