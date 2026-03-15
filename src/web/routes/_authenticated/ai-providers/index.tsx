import { createFileRoute } from '@tanstack/react-router'
import { useState, Fragment } from 'react'
import {
  ArrowLeft,
  Plus,
  Edit,
  Search as SearchIcon,
  Eye,
  EyeOff,
  MoreVertical,
  Check,
  X,
  Image as ImageIcon,
  Video,
  Home,
  AlertTriangle,
  GripVertical,
  Pencil,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { toast } from 'sonner'
import { useRouter } from '@tanstack/react-router'
import { aiService, type AiProvider, type AiModel } from '@/lib/api/ai'
import ProviderIcon from '@/components/icon/ProviderIcon'

function AIProvidersPage() {
  const router = useRouter()
  const [selectedProvider, setSelectedProvider] = useState<AiProvider | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isCreateModelDialogOpen, setIsCreateModelDialogOpen] = useState(false)
  const [isEditModelDialogOpen, setIsEditModelDialogOpen] = useState(false)
  const [isDeleteModelDialogOpen, setIsDeleteModelDialogOpen] = useState(false)
  const [modelToDelete, setModelToDelete] = useState<AiModel | null>(null)
  const [modelToEdit, setModelToEdit] = useState<AiModel | null>(null)
  const [providers, setProviders] = useState<AiProvider[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [mobileSelectedProvider, setMobileSelectedProvider] = useState<AiProvider | null>(null)
  
  // Inline editing states for model names and descriptions
  const [editingModelId, setEditingModelId] = useState<string | null>(null)
  const [editingModelName, setEditingModelName] = useState('')
  const [editingDescModelId, setEditingDescModelId] = useState<string | null>(null)
  const [editingModelDesc, setEditingModelDesc] = useState('')
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    providerId: '',
    endpoints: '',
    secretKey: '',
    settings: '',
  })
  
  const [modelFormData, setModelFormData] = useState({
    modelId: '',
    name: '',
    type: 'text2image' as 'text2image' | 'text2video',
    description: '',
    settings: '',
    ability: 't2i' as 't2i' | 'i2i' | 't2v',
    supportedAspectRatios: '["1:1"]',
    sort: 0,
    maxInputImages: 0,
    videoDurations: '',
  })
  
  const [showSecretKey, setShowSecretKey] = useState(false)
  
  // Drag and drop states for providers
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [dragOverItem, setDragOverItem] = useState<string | null>(null)
  
  // Drag and drop states for models
  const [draggedModelItem, setDraggedModelItem] = useState<string | null>(null)
  const [dragOverModelItem, setDragOverModelItem] = useState<string | null>(null)

  // Load providers
  useState(() => {
    const loadProviders = async () => {
      try {
        setIsLoading(true)
        const data = await aiService.getProviders()
        setProviders(data)
        if (data.length > 0) {
          const firstProvider = data[0]!
          setSelectedProvider(firstProvider)
          setFormData({
            name: firstProvider.name,
            providerId: firstProvider.providerId,
            endpoints: firstProvider.endpoints || '',
            secretKey: firstProvider.secretKey || '',
            settings: firstProvider.settings || '',
          })
        }
      } catch (error) {
        toast.error('加载提供商失败')
      } finally {
        setIsLoading(false)
      }
    }
    loadProviders()
  })

  const handleCreateProvider = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const result = await aiService.createProvider(formData)
      toast.success('提供商创建成功')
      
      // Refresh providers
      const data = await aiService.getProviders()
      setProviders(data)
      const newProvider = data.find(p => p.id === result.id) || data[0]
      setSelectedProvider(newProvider || null)
      setIsCreateDialogOpen(false)
      setFormData({ name: '', providerId: '', endpoints: '', secretKey: '', settings: '' })
    } catch (error) {
      toast.error('创建失败，请稍后重试')
    }
  }

  const handleUpdateProvider = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProvider) return
    
    try {
      await aiService.updateProvider(selectedProvider.id, formData)
      toast.success('提供商更新成功')
      
      // Refresh providers
      const data = await aiService.getProviders()
      setProviders(data)
      const updatedProvider = data.find(p => p.id === selectedProvider.id)
      setSelectedProvider(updatedProvider || null)
      setIsEditDialogOpen(false)
    } catch (error) {
      toast.error('更新失败，请稍后重试')
    }
  }

  const handleDeleteProvider = async (id: string) => {
    if (!confirm('确定要删除这个提供商吗？')) return
    
    try {
      await aiService.deleteProvider(id)
      toast.success('提供商删除成功')
      
      // Refresh providers
      const data = await aiService.getProviders()
      setProviders(data)
      setSelectedProvider(data.length > 0 ? data[0]! : null)
    } catch (error) {
      toast.error('删除失败，请稍后重试')
    }
  }

  const handleToggleProvider = async (id: string) => {
    try {
      const result = await aiService.toggleProvider(id)
      toast.success(result.enabled ? '已启用' : '已禁用')
      
      // Refresh providers
      const data = await aiService.getProviders()
      setProviders(data)
      const foundProvider = data.find(p => p.id === selectedProvider?.id)
      setSelectedProvider(foundProvider || null)
    } catch (error) {
      toast.error('操作失败，请稍后重试')
    }
  }

  const handleCreateModel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProvider) return
    
    try {
      await aiService.createModel({
        providerId: selectedProvider.id,
        modelId: modelFormData.modelId,
        name: modelFormData.name || undefined,
        type: modelFormData.type,
        description: modelFormData.description || undefined,
        settings: modelFormData.settings || undefined,
        ability: modelFormData.ability,
        supportedAspectRatios: modelFormData.supportedAspectRatios,
        sort: modelFormData.sort,
        maxInputImages: modelFormData.maxInputImages || undefined,
        videoDurations: modelFormData.videoDurations || undefined,
      })
      toast.success('模型创建成功')
      
      // Refresh providers
      const data = await aiService.getProviders()
      setProviders(data)
      const updatedProvider = data.find(p => p.id === selectedProvider.id)
      setSelectedProvider(updatedProvider || null)
      setIsCreateModelDialogOpen(false)
      setModelFormData({ 
        modelId: '', 
        name: '', 
        type: 'text2image', 
        description: '', 
        settings: '',
        ability: 't2i',
        supportedAspectRatios: '["1:1"]',
        sort: 0,
        maxInputImages: 0,
        videoDurations: '',
      })
    } catch (error) {
      toast.error('创建失败，请稍后重试')
    }
  }

  const handleDeleteModel = (model: AiModel) => {
    setModelToDelete(model)
    setIsDeleteModelDialogOpen(true)
  }

  const handleEditModel = (model: AiModel) => {
    setModelToEdit(model)
    setModelFormData({
      modelId: model.modelId,
      name: model.name || '',
      type: model.type as 'text2image' | 'text2video',
      description: model.description || '',
      settings: model.settings || '',
      ability: model.ability as 't2i' | 'i2i' | 't2v',
      supportedAspectRatios: model.supportedAspectRatios || '["1:1"]',
      sort: model.sort || 0,
      maxInputImages: model.maxInputImages || 0,
      videoDurations: model.videoDurations || '',
    })
    setIsEditModelDialogOpen(true)
  }

  const handleUpdateModel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!modelToEdit) return

    try {
      const updateData: {
        modelId?: string
        name?: string
        type?: 'text2image' | 'text2video'
        description?: string
        settings?: string
        ability?: 't2i' | 'i2i' | 't2v'
        supportedAspectRatios?: string
        maxInputImages?: number
        videoDurations?: string
      } = {}

      if (modelFormData.modelId.trim()) updateData.modelId = modelFormData.modelId.trim()
      if (modelFormData.name.trim()) updateData.name = modelFormData.name.trim()
      updateData.type = modelFormData.type
      if (modelFormData.description.trim()) updateData.description = modelFormData.description.trim()
      if (modelFormData.settings.trim()) updateData.settings = modelFormData.settings.trim()
      updateData.ability = modelFormData.ability
      if (modelFormData.supportedAspectRatios.trim()) updateData.supportedAspectRatios = modelFormData.supportedAspectRatios.trim()
      if (modelFormData.type === 'text2image') {
        updateData.maxInputImages = modelFormData.maxInputImages
      }
      if (modelFormData.type === 'text2video') {
        updateData.videoDurations = modelFormData.videoDurations.trim()
      }

      await aiService.updateModel(modelToEdit.id, updateData)
      toast.success('模型更新成功')
      setIsEditModelDialogOpen(false)
      setModelToEdit(null)

      // Refresh providers
      const data = await aiService.getProviders()
      setProviders(data)
      const foundProvider = data.find(p => p.id === selectedProvider?.id)
      setSelectedProvider(foundProvider || null)
    } catch (error) {
      toast.error('更新失败，请稍后重试')
    }
  }

  const confirmDeleteModel = async () => {
    if (!modelToDelete) return
    
    try {
      await aiService.deleteModel(modelToDelete.id)
      toast.success('模型删除成功')
      setIsDeleteModelDialogOpen(false)
      setModelToDelete(null)
      
      // Refresh providers
      const data = await aiService.getProviders()
      setProviders(data)
      const foundProvider = data.find(p => p.id === selectedProvider?.id)
      setSelectedProvider(foundProvider || null)
    } catch (error) {
      toast.error('删除失败，请稍后重试')
    }
  }

  const handleToggleModel = async (id: string) => {
    try {
      const result = await aiService.toggleModel(id)
      toast.success(result.enabled ? '已启用' : '已禁用')
      
      // Refresh providers
      const data = await aiService.getProviders()
      setProviders(data)
      const foundProvider = data.find(p => p.id === selectedProvider?.id)
      setSelectedProvider(foundProvider || null)
    } catch (error) {
      toast.error('操作失败，请稍后重试')
    }
  }

  // Handle inline model name editing
  const handleStartEditModel = (model: AiModel) => {
    setEditingModelId(model.id)
    setEditingModelName(model.name || model.modelId)
  }

  const handleCancelEditModel = () => {
    setEditingModelId(null)
    setEditingModelName('')
  }

  const handleSaveModelName = async (model: AiModel) => {
    if (!editingModelName.trim()) {
      toast.error('模型名称不能为空')
      return
    }
    try {
      await aiService.updateModel(model.id, { name: editingModelName.trim() })
      toast.success('模型名称已更新')
      setEditingModelId(null)
      setEditingModelName('')
      
      // Refresh providers
      const data = await aiService.getProviders()
      setProviders(data)
      const foundProvider = data.find(p => p.id === selectedProvider?.id)
      setSelectedProvider(foundProvider || null)
    } catch (error) {
      toast.error('更新模型名称失败')
    }
  }

  // Handle inline model description editing
  const handleStartEditDesc = (model: AiModel) => {
    setEditingDescModelId(model.id)
    setEditingModelDesc(model.description ?? '')
  }

  const handleCancelEditDesc = () => {
    setEditingDescModelId(null)
    setEditingModelDesc('')
  }

  const handleSaveModelDesc = async (model: AiModel) => {
    try {
      const desc = editingModelDesc.trim()
      const updateData: { description?: string } = desc ? { description: desc } : {}
      await aiService.updateModel(model.id, updateData)
      toast.success('模型描述已更新')
      setEditingDescModelId(null)
      setEditingModelDesc('')
      
      // Refresh providers
      const data = await aiService.getProviders()
      setProviders(data)
      const foundProvider = data.find(p => p.id === selectedProvider?.id)
      setSelectedProvider(foundProvider || null)
    } catch (error) {
      toast.error('更新模型描述失败')
    }
  }

  const filteredProviders = providers.filter(provider =>
    provider.name.toLowerCase().includes(search.toLowerCase()) ||
    provider.providerId.toLowerCase().includes(search.toLowerCase())
  )
  
  // Sort providers by sort field
  const sortedProviders = [...filteredProviders].sort((a, b) => (b.sort || 0) - (a.sort || 0))

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, providerId: string) => {
    setDraggedItem(providerId)
    e.dataTransfer.effectAllowed = 'move'
  }

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, providerId: string) => {
    e.preventDefault()
    if (draggedItem !== providerId) {
      setDragOverItem(providerId)
    }
  }

  // Handle drag leave
  const handleDragLeave = () => {
    setDragOverItem(null)
  }

  // Handle drop
  const handleDrop = async (e: React.DragEvent, targetProviderId: string) => {
    e.preventDefault()
    setDragOverItem(null)
    
    if (!draggedItem || draggedItem === targetProviderId) {
      setDraggedItem(null)
      return
    }

    try {
      // Reorder providers locally
      const newProviders = [...providers]
      const draggedIndex = newProviders.findIndex(p => p.id === draggedItem)
      const targetIndex = newProviders.findIndex(p => p.id === targetProviderId)
      
      if (draggedIndex === -1 || targetIndex === -1) return
      
      const removed = newProviders[draggedIndex]
      if (!removed) return
      
      newProviders.splice(draggedIndex, 1)
      newProviders.splice(targetIndex, 0, removed)
      
      // Update sort values for all providers (larger sort value = higher position)
      const totalCount = newProviders.length
      const updatedProviders = newProviders.map((provider, index) => ({
        ...provider,
        sort: totalCount - index - 1
      }))
      
      setProviders(updatedProviders)
      
      // Update all providers' sort on server
      await Promise.all(
        updatedProviders.map(provider => 
          aiService.updateProviderSort(provider.id, provider.sort)
        )
      )
      toast.success('排序已更新')
    } catch (error) {
      toast.error('排序更新失败')
      // Refresh providers to reset state
      const data = await aiService.getProviders()
      setProviders(data)
    } finally {
      setDraggedItem(null)
    }
  }

  // Model drag and drop handlers
  const handleModelDragStart = (e: React.DragEvent, modelId: string) => {
    setDraggedModelItem(modelId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleModelDragOver = (e: React.DragEvent, modelId: string) => {
    e.preventDefault()
    if (draggedModelItem !== modelId) {
      setDragOverModelItem(modelId)
    }
  }

  const handleModelDragLeave = () => {
    setDragOverModelItem(null)
  }

  const handleModelDrop = async (e: React.DragEvent, targetModelId: string) => {
    e.preventDefault()
    setDragOverModelItem(null)
    
    if (!draggedModelItem || draggedModelItem === targetModelId || !selectedProvider) {
      setDraggedModelItem(null)
      return
    }

    try {
      const models = selectedProvider.models || []
      const newModels = [...models]
      const draggedIndex = newModels.findIndex(m => m.id === draggedModelItem)
      const targetIndex = newModels.findIndex(m => m.id === targetModelId)
      
      if (draggedIndex === -1 || targetIndex === -1) return
      
      const removed = newModels[draggedIndex]
      if (!removed) return
      
      newModels.splice(draggedIndex, 1)
      newModels.splice(targetIndex, 0, removed)
      
      // Update sort values for all models (larger sort value = higher position)
      const totalCount = newModels.length
      const updatedModels = newModels.map((model, index) => ({
        ...model,
        sort: totalCount - index - 1
      }))
      
      // Update local state
      const updatedProvider = { ...selectedProvider, models: updatedModels }
      setSelectedProvider(updatedProvider)
      setProviders(providers.map(p => p.id === updatedProvider.id ? updatedProvider : p))
      
      // Update all models' sort on server
      await Promise.all(
        updatedModels.map(model => 
          aiService.updateModel(model.id, { sort: model.sort })
        )
      )
      toast.success('模型排序已更新')
    } catch (error) {
      toast.error('模型排序更新失败')
      // Refresh providers to reset state
      const data = await aiService.getProviders()
      setProviders(data)
      const foundProvider = data.find(p => p.id === selectedProvider?.id)
      setSelectedProvider(foundProvider || null)
    } finally {
      setDraggedModelItem(null)
    }
  }

  return (
    <>
      {/* ===== Top Heading ===== */}
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
          {/* Left Side - Providers List */}
          <div className='flex w-full flex-col gap-2 sm:w-56 lg:w-72 2xl:w-80'>
            <div className='sticky top-0 z-10 -mx-4 bg-background px-4 pb-3 shadow-md sm:static sm:z-auto sm:mx-0 sm:p-0 sm:shadow-none'>
              <div className='flex items-center justify-between py-2'>
                <div className='flex gap-2'>
                  <h1 className='text-2xl font-bold'>AI 提供商</h1>
                </div>

                <Button
                  size='icon'
                  variant='ghost'
                  onClick={() => {
                    setFormData({ name: '', providerId: '', endpoints: '', secretKey: '', settings: '' })
                    setIsCreateDialogOpen(true)
                  }}
                  className='rounded-lg'
                >
                  <Plus size={24} className='stroke-muted-foreground' />
                </Button>
              </div>

              <label
                className={cn(
                  'focus-within:ring-1 focus-within:ring-ring focus-within:outline-hidden',
                  'flex h-10 w-full items-center space-x-0 rounded-md border border-border ps-2'
                )}
              >
                <SearchIcon size={15} className='me-2 stroke-slate-500' />
                <span className='sr-only'>Search</span>
                <input
                  type='text'
                  className='w-full flex-1 bg-inherit text-sm focus-visible:outline-hidden'
                  placeholder='搜索提供商...'
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
            </div>

            <ScrollArea className='-mx-3 h-full overflow-scroll p-3'>
              {providers.length === 0 ? (
                <div className='flex flex-col items-center justify-center gap-4 p-8 text-center'>
                  <div className='text-muted-foreground mb-2'>
                    暂无 AI 提供商
                  </div>
                  <Button
                    onClick={() => setIsCreateDialogOpen(true)}
                    className='gap-2'
                  >
                    <Plus size={16} />
                    添加提供商
                  </Button>
                </div>
              ) : filteredProviders.length === 0 ? (
                <div className='flex items-center justify-center p-8 text-center text-muted-foreground'>
                  没有找到匹配的提供商
                </div>
              ) : (
                sortedProviders.map((provider) => (
                  <Fragment key={provider.id}>
                    <div
                      draggable
                      onDragStart={(e) => handleDragStart(e, provider.id)}
                      onDragOver={(e) => handleDragOver(e, provider.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, provider.id)}
                      className={cn(
                        'group cursor-move',
                        dragOverItem === provider.id && 'border-t-2 border-primary',
                        draggedItem === provider.id && 'opacity-50'
                      )}
                    >
                      <button
                        type='button'
                        className={cn(
                          'hover:bg-accent hover:text-accent-foreground',
                          `flex w-full rounded-md px-2 py-2 text-start text-sm`,
                          selectedProvider?.id === provider.id && 'sm:bg-muted'
                        )}
                        onClick={() => {
                          setSelectedProvider(provider)
                          setMobileSelectedProvider(provider)
                          setFormData({
                          name: provider.name,
                          providerId: provider.providerId,
                          endpoints: provider.endpoints || '',
                          secretKey: provider.secretKey || '',
                          settings: provider.settings || '',
                        })
                        }}
                      >
                        <div className='flex items-center justify-between w-full'>
                          <div className='flex items-center gap-3'>
                            <div className='flex items-center gap-2'>
                              <GripVertical size={16} className='text-muted-foreground cursor-grab active:cursor-grabbing' />
                              <div className='flex h-10 w-10 items-center justify-center rounded-full bg-muted'>
                                <ProviderIcon provider={provider.providerId} size={24} />
                              </div>
                            </div>
                            <div className='flex-1 min-w-0'>
                              <span className='block font-medium truncate'>{provider.name}</span>
                              <span className='block text-xs text-muted-foreground truncate'>{provider.providerId}</span>
                            </div>
                          </div>
                          <Switch
                            checked={Boolean(provider.enabled)}
                            onCheckedChange={() => handleToggleProvider(provider.id)}
                            className='data-[state=checked]:bg-primary'
                          />
                        </div>
                      </button>
                    </div>
                    <Separator className='my-1' />
                  </Fragment>
                ))
              )}
            </ScrollArea>
          </div>

          {/* Right Side - Provider Details */}
          {providers.length === 0 ? (
            <div className='flex flex-1 items-center justify-center gap-4'>
              <div className='text-center'>
                <div className='text-muted-foreground mb-4'>
                  暂无 AI 提供商
                </div>
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className='gap-2'
                >
                  <Plus size={16} />
                  添加提供商
                </Button>
              </div>
            </div>
          ) : selectedProvider ? (
            <div
              className={cn(
                'absolute inset-0 start-full z-50 hidden w-full flex-1 flex-col border bg-background shadow-xs sm:static sm:z-auto sm:flex sm:rounded-md',
                mobileSelectedProvider && 'start-0 flex'
              )}
            >
              {/* Top Part */}
              <div className='mb-1 flex flex-none justify-between bg-card p-4 shadow-lg sm:rounded-t-md'>
                {/* Left */}
                <div className='flex gap-3'>
                  <Button
                    size='icon'
                    variant='ghost'
                    className='-ms-2 h-full sm:hidden'
                    onClick={() => setMobileSelectedProvider(null)}
                  >
                    <ArrowLeft className='rtl:rotate-180' />
                  </Button>
                  <div className='flex items-center gap-2 lg:gap-4'>
                    <div className='flex h-10 w-10 items-center justify-center rounded-full bg-muted'>
                      <ProviderIcon provider={selectedProvider.providerId} size={24} />
                    </div>
                    <div>
                      <span className='col-start-2 row-span-2 text-sm font-medium lg:text-base'>
                        {selectedProvider.name}
                      </span>
                      <span className='col-start-2 row-span-2 row-start-2 line-clamp-1 block max-w-32 text-xs text-nowrap text-ellipsis text-muted-foreground lg:max-w-none lg:text-sm'>
                        {selectedProvider.providerId}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right */}
                <div className='-me-1 flex items-center gap-1 lg:gap-2'>
                  <Button
                    size='icon'
                    variant='ghost'
                    className='h-10 rounded-md sm:h-8 sm:w-4 lg:h-10 lg:w-6'
                    onClick={() => setIsEditDialogOpen(true)}
                  >
                    <Edit size={20} className='stroke-muted-foreground' />
                  </Button>
                  <Button
                    size='icon'
                    variant='ghost'
                    className='h-10 rounded-md sm:h-8 sm:w-4 lg:h-10 lg:w-6'
                    onClick={() => handleDeleteProvider(selectedProvider.id)}
                  >
                    <X size={20} className='stroke-muted-foreground' />
                  </Button>
                </div>
              </div>

              {/* Provider Configuration */}
              <div className='flex flex-1 flex-col gap-6 p-6'>
                {/* API Configuration */}
                <div className='space-y-4'>
                  <h2 className='text-lg font-semibold'>API 配置</h2>
                  
                  <div className='space-y-2'>
                    <div className='space-y-2'>
                      <Label htmlFor='endpoints'>API 端点</Label>
                      <Input
                        id='endpoints'
                        value={selectedProvider.endpoints || ''}
                        readOnly
                        className='bg-muted'
                      />
                    </div>
                    
                    <div className='space-y-2'>
                      <Label htmlFor='secretKey'>API 密钥</Label>
                      <div className='relative'>
                        <Input
                          id='secretKey'
                          type={showSecretKey ? 'text' : 'password'}
                          value={selectedProvider.secretKey || ''}
                          readOnly
                          className='bg-muted pr-10'
                        />
                        <Button
                          size='icon'
                          variant='ghost'
                          className='absolute right-0 top-0 h-full w-10 rounded-e-md'
                          onClick={() => setShowSecretKey(!showSecretKey)}
                        >
                          {showSecretKey ? <EyeOff size={16} /> : <Eye size={16} />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Models */}
                <div className='flex-1 space-y-4'>
                  <div className='flex items-center justify-between'>
                    <h2 className='text-lg font-semibold'>模型</h2>
                    <Button
                      size='sm'
                      onClick={() => setIsCreateModelDialogOpen(true)}
                      className='gap-1'
                    >
                      <Plus size={16} />
                      添加模型
                    </Button>
                  </div>
                  
                  <ScrollArea className='h-[300px] rounded-md border'>
                    {selectedProvider.models?.length === 0 ? (
                      <div className='flex h-[300px] flex-col items-center justify-center gap-3 text-muted-foreground'>
                        <div className='flex h-12 w-12 items-center justify-center rounded-full bg-muted'>
                          <Home size={24} />
                        </div>
                        <span>暂无模型</span>
                      </div>
                    ) : (
                      <div className='space-y-2 p-4'>
                        {selectedProvider.models?.sort((a, b) => (b.sort || 0) - (a.sort || 0)).map((model) => (
                          <div
                            key={model.id}
                            draggable
                            onDragStart={(e) => handleModelDragStart(e, model.id)}
                            onDragOver={(e) => handleModelDragOver(e, model.id)}
                            onDragLeave={handleModelDragLeave}
                            onDrop={(e) => handleModelDrop(e, model.id)}
                            className={cn(
                              'flex items-center justify-between rounded-md border p-3 cursor-move',
                              dragOverModelItem === model.id && 'border-t-2 border-primary',
                              draggedModelItem === model.id && 'opacity-50'
                            )}
                          >
                            <div className='flex items-center gap-3'>
                              <GripVertical size={16} className='text-muted-foreground cursor-grab active:cursor-grabbing' />
                              <div className='flex h-8 w-8 items-center justify-center rounded-full bg-muted'>
                                {model.type === 'text2image' ? (
                                  <ImageIcon size={16} />
                                ) : (
                                  <Video size={16} />
                                )}
                              </div>
                              <div className='flex-1 min-w-0'>
                                {editingModelId === model.id ? (
                                  <div className='flex items-center gap-2'>
                                    <Input
                                      value={editingModelName}
                                      onChange={(e) => setEditingModelName(e.target.value)}
                                      className='h-8 flex-1'
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleSaveModelName(model)
                                        } else if (e.key === 'Escape') {
                                          handleCancelEditModel()
                                        }
                                      }}
                                    />
                                    <Button
                                      size='icon'
                                      variant='ghost'
                                      className='h-8 w-8'
                                      onClick={() => handleSaveModelName(model)}
                                    >
                                      <Check size={16} className='text-green-600' />
                                    </Button>
                                    <Button
                                      size='icon'
                                      variant='ghost'
                                      className='h-8 w-8'
                                      onClick={handleCancelEditModel}
                                    >
                                      <X size={16} className='text-destructive' />
                                    </Button>
                                  </div>
                                ) : (
                                  <>
                                    {editingDescModelId === model.id ? (
                                      <div className='flex items-center gap-2'>
                                        <div 
                                          className='font-medium cursor-pointer hover:text-primary'
                                          onClick={() => handleStartEditModel(model)}
                                          title='点击编辑名称'
                                        >
                                          {model.name || model.modelId}
                                        </div>
                                        <span className='text-muted-foreground'>·</span>
                                        <Input
                                          value={editingModelDesc}
                                          onChange={(e) => setEditingModelDesc(e.target.value)}
                                          className='h-7 w-48 text-xs'
                                          autoFocus
                                          placeholder='输入描述...'
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              handleSaveModelDesc(model)
                                            } else if (e.key === 'Escape') {
                                              handleCancelEditDesc()
                                            }
                                          }}
                                        />
                                        <Button
                                          size='icon'
                                          variant='ghost'
                                          className='h-7 w-7'
                                          onClick={() => handleSaveModelDesc(model)}
                                        >
                                          <Check size={14} className='text-green-600' />
                                        </Button>
                                        <Button
                                          size='icon'
                                          variant='ghost'
                                          className='h-7 w-7'
                                          onClick={handleCancelEditDesc}
                                        >
                                          <X size={14} className='text-destructive' />
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className='flex items-center gap-1'>
                                        <div 
                                          className='font-medium cursor-pointer hover:text-primary'
                                          onClick={() => handleStartEditModel(model)}
                                          title='点击编辑名称'
                                        >
                                          {model.name || model.modelId}
                                        </div>
                                        <span className='text-muted-foreground'>·</span>
                                        <div 
                                          className='text-xs text-muted-foreground truncate cursor-pointer hover:text-primary'
                                          onClick={() => handleStartEditDesc(model)}
                                          title='点击编辑描述'
                                        >
                                          {model.description || (model.type === 'text2image' ? '文生图' : '文生视频')}
                                        </div>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                            <div className='flex items-center gap-2'>
                              <Button
                                size='icon'
                                variant='ghost'
                                className='h-8 w-8 rounded-md'
                                onClick={() => handleEditModel(model)}
                              >
                                <Pencil size={16} className='stroke-muted-foreground' />
                              </Button>
                              <Switch
                                checked={Boolean(model.enabled)}
                                onCheckedChange={() => handleToggleModel(model.id)}
                                className='data-[state=checked]:bg-primary'
                              />
                              <Button
                                size='icon'
                                variant='ghost'
                                className='h-8 w-8 rounded-md'
                                onClick={() => handleDeleteModel(model)}
                              >
                                <X size={16} className='stroke-muted-foreground' />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </div>
            </div>
          ) : (
            <div className='flex flex-1 items-center justify-center text-muted-foreground'>
              请选择一个提供商
            </div>
          )}

          {/* Create Provider Dialog */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogContent className='sm:max-w-md'>
              <DialogHeader>
                <DialogTitle>添加提供商</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateProvider} className='space-y-4 py-4'>
                <div className='space-y-2'>
                  <Label htmlFor='name'>名称</Label>
                  <Input
                    id='name'
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='providerId'>提供商 ID</Label>
                  <Input
                    id='providerId'
                    value={formData.providerId}
                    onChange={(e) => setFormData({ ...formData, providerId: e.target.value })}
                    required
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='endpoints'>API 端点</Label>
                  <Input
                    id='endpoints'
                    value={formData.endpoints}
                    onChange={(e) => setFormData({ ...formData, endpoints: e.target.value })}
                    required
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='secretKey'>API 密钥</Label>
                  <Input
                    id='secretKey'
                    type='password'
                    value={formData.secretKey}
                    onChange={(e) => setFormData({ ...formData, secretKey: e.target.value })}
                    required
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='settings'>Settings 配置</Label>
                  <Textarea
                    id='settings'
                    value={formData.settings}
                    onChange={(e) => setFormData({ ...formData, settings: e.target.value })}
                    placeholder='请输入 JSON 格式的配置'
                    rows={4}
                    className='resize-none overflow-hidden whitespace-pre-wrap break-all'
                  />
                </div>
                <div className='flex justify-end gap-2'>
                  <Button type='button' variant='ghost' onClick={() => setIsCreateDialogOpen(false)}>
                    取消
                  </Button>
                  <Button type='submit'>创建</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Edit Provider Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className='sm:max-w-md'>
              <DialogHeader>
                <DialogTitle>编辑提供商</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUpdateProvider} className='space-y-4 py-4'>
                <div className='space-y-2'>
                  <Label htmlFor='edit-name'>名称</Label>
                  <Input
                    id='edit-name'
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='edit-providerId'>提供商 ID</Label>
                  <Input
                    id='edit-providerId'
                    value={formData.providerId}
                    onChange={(e) => setFormData({ ...formData, providerId: e.target.value })}
                    required
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='edit-endpoints'>API 端点</Label>
                  <Input
                    id='edit-endpoints'
                    value={formData.endpoints}
                    onChange={(e) => setFormData({ ...formData, endpoints: e.target.value })}
                    required
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='edit-secretKey'>API 密钥</Label>
                  <Input
                    id='edit-secretKey'
                    type='password'
                    value={formData.secretKey}
                    onChange={(e) => setFormData({ ...formData, secretKey: e.target.value })}
                    required
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='edit-settings'>Settings 配置</Label>
                  <Textarea
                    id='edit-settings'
                    value={formData.settings}
                    onChange={(e) => setFormData({ ...formData, settings: e.target.value })}
                    placeholder='请输入 JSON 格式的配置'
                    rows={4}
                    className='resize-none overflow-hidden whitespace-pre-wrap break-all'
                  />
                </div>
                <div className='flex justify-end gap-2'>
                  <Button type='button' variant='ghost' onClick={() => setIsEditDialogOpen(false)}>
                    取消
                  </Button>
                  <Button type='submit'>保存</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Create Model Dialog */}
          <Dialog open={isCreateModelDialogOpen} onOpenChange={setIsCreateModelDialogOpen}>
            <DialogContent className='sm:max-w-3xl max-h-[90vh] overflow-y-auto'>
              <DialogHeader>
                <DialogTitle>添加模型</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateModel} className='space-y-4 py-4'>
                <div className='space-y-2'>
                  <Label htmlFor='name'>模型名称</Label>
                  <Input
                    id='name'
                    value={modelFormData.name}
                    onChange={(e) => setModelFormData({ ...modelFormData, name: e.target.value })}
                    placeholder='请输入模型名称'
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='modelId'>模型 ID</Label>
                  <Input
                    id='modelId'
                    value={modelFormData.modelId}
                    placeholder='请输入模型ID'
                    onChange={(e) => setModelFormData({ ...modelFormData, modelId: e.target.value })}
                    required
                  />
                </div>
                <div className='space-y-2'>
                  <Label>模型类型</Label>
                  <div className='flex gap-4'>
                    <label className='flex items-center gap-2'>
                      <input
                        type='radio'
                        name='modelType'
                        value='text2image'
                        checked={modelFormData.type === 'text2image'}
                        onChange={() => setModelFormData({ ...modelFormData, type: 'text2image', ability: 't2i' })}
                        className='h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary'
                      />
                      文生图
                    </label>
                    <label className='flex items-center gap-2'>
                      <input
                        type='radio'
                        name='modelType'
                        value='text2video'
                        checked={modelFormData.type === 'text2video'}
                        onChange={() => setModelFormData({ ...modelFormData, type: 'text2video', ability: 't2v' })}
                        className='h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary'
                      />
                      文生视频
                    </label>
                  </div>
                </div>
                {modelFormData.type === 'text2image' && (
                  <div className='space-y-2'>
                    <Label>模型能力</Label>
                    <div className='flex gap-4'>
                      <label className='flex items-center gap-2'>
                        <input
                          type='radio'
                          name='ability'
                          value='t2i'
                          checked={modelFormData.ability === 't2i'}
                          onChange={() => setModelFormData({ ...modelFormData, ability: 't2i' })}
                          className='h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary'
                        />
                        文生图 (T2I)
                      </label>
                      <label className='flex items-center gap-2'>
                        <input
                          type='radio'
                          name='ability'
                          value='i2i'
                          checked={modelFormData.ability === 'i2i'}
                          onChange={() => setModelFormData({ ...modelFormData, ability: 'i2i' })}
                          className='h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary'
                        />
                        图生图 (I2I)
                      </label>
                    </div>
                  </div>
                )}
                <div className='space-y-2'>
                  <Label htmlFor='supportedAspectRatios'>支持的宽高比 (JSON 数组)</Label>
                  <Input
                    id='supportedAspectRatios'
                    value={modelFormData.supportedAspectRatios}
                    onChange={(e) => setModelFormData({ ...modelFormData, supportedAspectRatios: e.target.value })}
                    placeholder='["1:1", "16:9", "9:16"]'
                  />
                </div>
                {modelFormData.type === 'text2image' && (
                  <div className='space-y-2'>
                    <Label htmlFor='maxInputImages'>最大图片输出数</Label>
                    <Input
                      id='maxInputImages'
                      type='number'
                      value={modelFormData.maxInputImages}
                      onChange={(e) => setModelFormData({ ...modelFormData, maxInputImages: parseInt(e.target.value) || 0 })}
                      placeholder='0 表示不限制'
                    />
                  </div>
                )}
                {modelFormData.type === 'text2video' && (
                  <div className='space-y-2'>
                    <Label htmlFor='videoDurations'>视频时长 (T2V 模型，JSON 数组)</Label>
                    <Input
                      id='videoDurations'
                      value={modelFormData.videoDurations}
                      onChange={(e) => setModelFormData({ ...modelFormData, videoDurations: e.target.value })}
                      placeholder='["3s", "5s", "10s"]'
                    />
                  </div>
                )}
                <div className='space-y-2'>
                  <Label htmlFor='description'>模型说明</Label>
                  <textarea
                    id='description'
                    value={modelFormData.description}
                    onChange={(e) => setModelFormData({ ...modelFormData, description: e.target.value })}
                    placeholder='请输入模型说明'
                    rows={2}
                    className='w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='settings'>模型配置 (JSON)</Label>
                  <textarea
                    id='settings'
                    value={modelFormData.settings}
                    onChange={(e) => setModelFormData({ ...modelFormData, settings: e.target.value })}
                    placeholder='{"maxInputImages": 0, "supportedAspectRatios": ["1:1", "16:9"]}'
                    className='w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
                  />
                </div>
                <div className='flex justify-end gap-2'>
                  <Button type='button' variant='ghost' onClick={() => setIsCreateModelDialogOpen(false)}>
                    取消
                  </Button>
                  <Button type='submit'>创建</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Edit Model Dialog */}
          <Dialog open={isEditModelDialogOpen} onOpenChange={setIsEditModelDialogOpen}>
            <DialogContent className='sm:max-w-3xl max-h-[90vh] overflow-y-auto'>
              <DialogHeader>
                <DialogTitle>编辑模型</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUpdateModel} className='space-y-4 py-4'>
                <div className='space-y-2'>
                  <Label htmlFor='edit-name'>模型名称</Label>
                  <Input
                    id='edit-name'
                    value={modelFormData.name}
                    onChange={(e) => setModelFormData({ ...modelFormData, name: e.target.value })}
                    placeholder='请输入模型名称'
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='edit-modelId'>模型 ID</Label>
                  <Input
                    id='edit-modelId'
                    value={modelFormData.modelId}
                    placeholder='请输入模型ID'
                    onChange={(e) => setModelFormData({ ...modelFormData, modelId: e.target.value })}
                    required
                  />
                </div>
                <div className='space-y-2'>
                  <Label>模型类型</Label>
                  <div className='flex gap-4'>
                    <label className='flex items-center gap-2'>
                      <input
                        type='radio'
                        name='editModelType'
                        value='text2image'
                        checked={modelFormData.type === 'text2image'}
                        onChange={() => setModelFormData({ ...modelFormData, type: 'text2image', ability: 't2i' })}
                        className='h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary'
                      />
                      文生图
                    </label>
                    <label className='flex items-center gap-2'>
                      <input
                        type='radio'
                        name='editModelType'
                        value='text2video'
                        checked={modelFormData.type === 'text2video'}
                        onChange={() => setModelFormData({ ...modelFormData, type: 'text2video', ability: 't2v' })}
                        className='h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary'
                      />
                      文生视频
                    </label>
                  </div>
                </div>
                {modelFormData.type === 'text2image' && (
                  <div className='space-y-2'>
                    <Label>模型能力</Label>
                    <div className='flex gap-4'>
                      <label className='flex items-center gap-2'>
                        <input
                          type='radio'
                          name='editAbility'
                          value='t2i'
                          checked={modelFormData.ability === 't2i'}
                          onChange={() => setModelFormData({ ...modelFormData, ability: 't2i' })}
                          className='h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary'
                        />
                        文生图 (T2I)
                      </label>
                      <label className='flex items-center gap-2'>
                        <input
                          type='radio'
                          name='editAbility'
                          value='i2i'
                          checked={modelFormData.ability === 'i2i'}
                          onChange={() => setModelFormData({ ...modelFormData, ability: 'i2i' })}
                          className='h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary'
                        />
                        图生图 (I2I)
                      </label>
                    </div>
                  </div>
                )}
                <div className='space-y-2'>
                  <Label htmlFor='edit-supportedAspectRatios'>支持的宽高比 (JSON 数组)</Label>
                  <Input
                    id='edit-supportedAspectRatios'
                    value={modelFormData.supportedAspectRatios}
                    onChange={(e) => setModelFormData({ ...modelFormData, supportedAspectRatios: e.target.value })}
                    placeholder='["1:1", "16:9", "9:16"]'
                  />
                </div>
                {modelFormData.type === 'text2image' && (
                  <div className='space-y-2'>
                    <Label htmlFor='edit-maxInputImages'>最大图片输出数</Label>
                    <Input
                      id='edit-maxInputImages'
                      type='number'
                      value={modelFormData.maxInputImages}
                      onChange={(e) => setModelFormData({ ...modelFormData, maxInputImages: parseInt(e.target.value) || 0 })}
                      placeholder='0 表示不限制'
                    />
                  </div>
                )}
                {modelFormData.type === 'text2video' && (
                  <div className='space-y-2'>
                    <Label htmlFor='edit-videoDurations'>视频时长 (T2V 模型，JSON 数组)</Label>
                    <Input
                      id='edit-videoDurations'
                      value={modelFormData.videoDurations}
                      onChange={(e) => setModelFormData({ ...modelFormData, videoDurations: e.target.value })}
                      placeholder='["3s", "5s", "10s"]'
                    />
                  </div>
                )}
                <div className='space-y-2'>
                  <Label htmlFor='edit-description'>模型说明</Label>
                  <textarea
                    id='edit-description'
                    value={modelFormData.description}
                    onChange={(e) => setModelFormData({ ...modelFormData, description: e.target.value })}
                    placeholder='请输入模型说明'
                    rows={2}
                    className='w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='edit-settings'>模型配置 (JSON)</Label>
                  <textarea
                    id='edit-settings'
                    value={modelFormData.settings}
                    onChange={(e) => setModelFormData({ ...modelFormData, settings: e.target.value })}
                    placeholder='{"maxInputImages": 0, "supportedAspectRatios": ["1:1", "16:9"]}'
                    className='w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
                  />
                </div>
                <div className='flex justify-end gap-2'>
                  <Button type='button' variant='ghost' onClick={() => setIsEditModelDialogOpen(false)}>
                    取消
                  </Button>
                  <Button type='submit'>保存</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Delete Model Confirm Dialog */}
          <ConfirmDialog
            open={isDeleteModelDialogOpen}
            onOpenChange={setIsDeleteModelDialogOpen}
            title={
              <div className='flex items-center gap-2 text-destructive'>
                <AlertTriangle size={20} />
                删除模型
              </div>
            }
            desc={
              <div className='space-y-3'>
                <p>
                  确定要删除模型 <strong>{modelToDelete?.name || modelToDelete?.modelId}</strong> 吗？
                </p>
                <p className='text-sm text-muted-foreground'>
                  此操作将永久删除该模型，无法撤销。
                </p>
                <div className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>
                  <strong>警告！</strong> 请谨慎操作，此操作不可恢复。
                </div>
              </div>
            }
            cancelBtnText='取消'
            confirmText='删除'
            destructive
            handleConfirm={confirmDeleteModel}
          />
        </section>
      </Main>
    </>
  )
}

export const Route = createFileRoute('/_authenticated/ai-providers/')({
  component: AIProvidersPage,
})
