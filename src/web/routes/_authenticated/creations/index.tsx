import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Image as ImageIcon, Video, Loader2, Wand2, Search as SearchIcon, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { Search } from '@/components/search'
import { ConfigDrawer } from '@/components/config-drawer'
import { toast } from 'sonner'
import { creationService, type Creation } from '@/lib/api/creation'

export const Route = createFileRoute('/_authenticated/creations/')({
  component: CreationsPage,
})

function CreationsPage() {
  const [creations, setCreations] = useState<Creation[]>([])
  const [filteredCreations, setFilteredCreations] = useState<Creation[]>([])
  const [selectedCreation, setSelectedCreation] = useState<Creation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (search.trim() === '') {
      setFilteredCreations(creations)
    } else {
      const lowerSearch = search.toLowerCase()
      setFilteredCreations(
        creations.filter(
          (creation) =>
            creation.title.toLowerCase().includes(lowerSearch) ||
            creation.prompt.toLowerCase().includes(lowerSearch)
        )
      )
    }
  }, [search, creations])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const creationsData = await creationService.getCreations()
      setCreations(creationsData)
      setFilteredCreations(creationsData)
    } catch (error) {
      toast.error('加载数据失败')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <div className="h-2 w-2 rounded-full bg-yellow-500" />
      case 'generating':
        return <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
      case 'completed':
        return <div className="h-2 w-2 rounded-full bg-green-500" />
      case 'failed':
        return <div className="h-2 w-2 rounded-full bg-red-500" />
      default:
        return null
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '等待中'
      case 'generating':
        return '生成中'
      case 'completed':
        return '已完成'
      case 'failed':
        return '失败'
      default:
        return status
    }
  }

  const parseResultUrls = (resultUrls: string | null) => {
    if (!resultUrls) return []
    try {
      return JSON.parse(resultUrls)
    } catch (e) {
      console.error('Failed to parse resultUrls:', e)
      return []
    }
  }

  return (
    <>
      <Header>
        <Search />
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
                  <Wand2 size={20} />
                </div>
              </div>

              <label
                className={cn(
                  'focus-within:ring-1 focus-within:ring-ring focus-within:outline-hidden',
                  'flex h-10 w-full items-center space-x-0 rounded-md border border-border ps-2 mt-2'
                )}
              >
                <SearchIcon size={15} className='me-2 stroke-slate-500' />
                <span className='sr-only'>Search</span>
                <input
                  type='text'
                  className='w-full flex-1 bg-inherit text-sm focus-visible:outline-hidden'
                  placeholder='搜索创作...'
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
            </div>

            <ScrollArea className='-mx-3 h-full overflow-scroll p-3'>
              {isLoading ? (
                <div className='flex items-center justify-center py-8'>
                  <Loader2 className='h-6 w-6 animate-spin' />
                </div>
              ) : filteredCreations.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-8 text-muted-foreground'>
                  <ImageIcon size={48} className='mb-2 opacity-50' />
                  <p>暂无创作历史</p>
                </div>
              ) : (
                filteredCreations.map((creation) => (
                  <div key={creation.id}>
                    <button
                      type='button'
                      className={cn(
                        'group hover:bg-accent hover:text-accent-foreground',
                        'flex w-full rounded-md px-2 py-2 text-start text-sm',
                        selectedCreation?.id === creation.id && 'bg-muted',
                        creation.deleted === 1 && 'opacity-50'
                      )}
                      onClick={() => setSelectedCreation(creation)}
                    >
                      <div className='flex gap-2 w-full'>
                        <div className='flex h-8 w-8 items-center justify-center rounded-full bg-muted relative'>
                          {creation.type === 'text2image' ? (
                            <ImageIcon size={16} />
                          ) : (
                            <Video size={16} />
                          )}
                          {creation.deleted === 1 && (
                            <div className='absolute -top-1 -right-1'>
                              <Trash2 size={12} className='text-destructive bg-background rounded-full p-0.5' />
                            </div>
                          )}
                        </div>
                        <div className='flex-1 min-w-0'>
                          <div className='flex items-center gap-2'>
                            <span className='font-medium truncate'>
                              {creation.title}
                            </span>
                          </div>
                          <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                            {getStatusIcon(creation.status)}
                            <span>{getStatusText(creation.status)}</span>
                            <span>·</span>
                            <span>{format(new Date(creation.createdAt), 'MM-dd HH:mm')}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                    <Separator className='my-1' />
                  </div>
                ))
              )}
            </ScrollArea>
          </div>

          <div className='flex flex-1 flex-col border bg-background overflow-hidden'>
            {selectedCreation ? (
              <>
                <div className='flex items-center justify-between border-b p-3 flex-none'>
                  <div>
                    <h2 className='font-medium text-sm'>{selectedCreation.title}</h2>
                    <p className='text-xs text-muted-foreground'>
                      {format(new Date(selectedCreation.createdAt), 'yyyy-MM-dd HH:mm')}
                    </p>
                  </div>
                  <div className='flex items-center gap-2'>
                    {getStatusIcon(selectedCreation.status)}
                    <span className='text-xs'>{getStatusText(selectedCreation.status)}</span>
                  </div>
                </div>

                <ScrollArea className='flex-1 p-3'>
                  <div className='space-y-4'>
                    <div>
                      <span className='text-xs text-muted-foreground'>提示词</span>
                      <p className='mt-1 text-sm whitespace-pre-wrap break-words'>{selectedCreation.prompt}</p>
                    </div>

                    {(() => {
                      const urls = parseResultUrls(selectedCreation.resultUrls)
                      if (urls.length > 0) {
                        return (
                          <div className='grid grid-cols-2 gap-2'>
                            {urls.map((url: string, index: number) => (
                              <img
                                key={index}
                                src={url}
                                alt={`Result ${index + 1}`}
                                className='rounded-md border max-w-full h-auto'
                              />
                            ))}
                          </div>
                        )
                      }
                      return null
                    })()}

                    {selectedCreation.errorMessage && (
                      <div className='rounded-md bg-destructive/10 p-3 text-xs text-destructive break-words'>
                        {selectedCreation.errorMessage}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </>
            ) : (
              <div className='flex flex-1 items-center justify-center text-muted-foreground'>
                <div className='text-center'>
                  <ImageIcon size={64} className='mx-auto mb-4 opacity-30' />
                  <p>点击左侧创作历史查看详情</p>
                </div>
              </div>
            )}
          </div>
        </section>
      </Main>
    </>
  )
}
