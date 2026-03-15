import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { Search } from '@/components/search'
import { ConfigDrawer } from '@/components/config-drawer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { subscribeService, type Subscribe } from '@/lib/api/subscribe'
import { Plus, Pencil, Trash2, Loader2, Settings, Plus as PlusIcon, Trash2 as TrashIcon, Image, Video, Check, X, GripVertical } from 'lucide-react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { AlertTriangle } from 'lucide-react'
import { subscribeModelService, type SubscribeModel } from '@/lib/api/subscribe-model'
import { Transfer } from '@/components/ui/transfer'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_authenticated/subscribes/')({
  component: SubscribesPage,
})

function SubscribesPage() {
  const [subscribes, setSubscribes] = useState<Subscribe[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 10

  // Dialog states
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isModelConfigOpen, setIsModelConfigOpen] = useState(false)
  const [editingSubscribe, setEditingSubscribe] = useState<Subscribe | null>(null)
  const [subscribeToDelete, setSubscribeToDelete] = useState<Subscribe | null>(null)
  const [currentSubscribe, setCurrentSubscribe] = useState<Subscribe | null>(null)

  // Model config states
  const [models, setModels] = useState<SubscribeModel[]>([])
  const [availableModels, setAvailableModels] = useState<any[]>([])
  const [isModelLoading, setIsModelLoading] = useState(false)
  const [isAddingModel, setIsAddingModel] = useState(false)
  const [isUpdatingModel, setIsUpdatingModel] = useState(false)
  const [selectedModelId, setSelectedModelId] = useState('')
  const [modelForm, setModelForm] = useState({
    maxUsage: 0,
    enabled: '1' as '1' | '0',
    sortOrder: 0,
  })
  const [transferSelectedModels, setTransferSelectedModels] = useState<string[]>([])
  const [editingModel, setEditingModel] = useState<SubscribeModel | null>(null)
  const [editingMaxUsage, setEditingMaxUsage] = useState<number>(0)
  
  // Drag and drop states for models
  const [draggedModelItem, setDraggedModelItem] = useState<string | null>(null)
  const [dragOverModelItem, setDragOverModelItem] = useState<string | null>(null)
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'subscription' as 'subscription' | 'credits',
    price: null as number | null,
    originalPrice: null as number | null,
    credits: null as number | null,
    duration: null as number | null,
    sortOrder: null as number | null,
    isPopular: 0 as number,
    status: 'active' as 'active' | 'inactive',
  })

  // Load subscribes
  useEffect(() => {
    loadSubscribes()
  }, [page, search])

  const loadSubscribes = async () => {
    try {
      setIsLoading(true)
      const result = await subscribeService.getSubscribes({
        page,
        pageSize,
        search: search || undefined,
      })
      setSubscribes(result.subscribes || [])
      setTotal(result.total || 0)
    } catch (error) {
      toast.error('加载套餐失败')
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'subscription',
      price: null,
      originalPrice: null,
      credits: null,
      duration: null,
      sortOrder: null,
      isPopular: 0,
      status: 'active',
    })
  }

  const handleAdd = () => {
    setEditingSubscribe(null)
    resetForm()
    setIsEditDialogOpen(true)
  }

  const handleEdit = (subscribe: Subscribe) => {
    setEditingSubscribe(subscribe)
    setFormData({
      name: subscribe.name,
      description: subscribe.description || '',
      type: subscribe.type,
      price: subscribe.price ? subscribe.price / 100 : null,
      originalPrice: subscribe.originalPrice ? subscribe.originalPrice / 100 : null,
      credits: subscribe.credits,
      duration: subscribe.duration,
      sortOrder: subscribe.sortOrder,
      isPopular: subscribe.isPopular || 0,
      status: subscribe.status === 'deleted' ? 'inactive' : subscribe.status,
    })
    setIsEditDialogOpen(true)
  }

  const handleDelete = (subscribe: Subscribe) => {
    setSubscribeToDelete(subscribe)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!subscribeToDelete) return

    try {
      await subscribeService.deleteSubscribe(subscribeToDelete.id)
      toast.success('删除成功')
      setIsDeleteDialogOpen(false)
      setSubscribeToDelete(null)
      loadSubscribes()
    } catch (error) {
      toast.error('删除失败')
    }
  }

  const handleSubmit = async () => {
    try {
      // 将价格从元转换为分
      const baseData = {
        ...formData,
        price: formData.price === null ? 0 : Math.round(formData.price * 100),
        originalPrice: formData.originalPrice === null ? null : Math.round(formData.originalPrice * 100),
        credits: formData.credits === null ? 0 : formData.credits,
        duration: formData.duration === null ? 0 : formData.duration,
      }
      
      if (editingSubscribe) {
        // 对于更新，将 null 值转换为 undefined
        const updateData = {
          ...baseData,
          originalPrice: baseData.originalPrice === null ? undefined : baseData.originalPrice,
          sortOrder: baseData.sortOrder === null ? undefined : baseData.sortOrder,
        }
        await subscribeService.updateSubscribe(editingSubscribe.id, updateData)
        toast.success('更新成功')
      } else {
        // 对于创建，将 null 值转换为 undefined
        const createData = {
          ...baseData,
          originalPrice: baseData.originalPrice === null ? undefined : baseData.originalPrice,
          sortOrder: baseData.sortOrder === null ? undefined : baseData.sortOrder,
        }
        await subscribeService.createSubscribe(createData)
        toast.success('创建成功')
      }
      setIsEditDialogOpen(false)
      loadSubscribes()
    } catch (error) {
      toast.error(editingSubscribe ? '更新失败' : '创建失败')
    }
  }

  // Model config functions
  const openModelConfig = async (subscribe: Subscribe) => {
    setCurrentSubscribe(subscribe)
    setIsModelConfigOpen(true)
    await loadModels(subscribe.id)
    await loadAvailableModels(subscribe.id)
    // 初始化已选模型
    const currentModelIds = models.map(m => m.modelId)
    setTransferSelectedModels(currentModelIds)
  }

  const loadModels = async (subscribeId: string) => {
    try {
      setIsModelLoading(true)
      const result = await subscribeModelService.getSubscribeModels(subscribeId)
      setModels(result.models || [])
    } catch (error) {
      toast.error('加载模型配置失败')
    } finally {
      setIsModelLoading(false)
    }
  }

  const loadAvailableModels = async (subscribeId: string) => {
    try {
      const result = await subscribeModelService.getAvailableModels(subscribeId)
      console.log('Available models:', result.models)
      setAvailableModels(result.models || [])
    } catch (error) {
      console.error('加载可用模型失败:', error)
      toast.error('加载可用模型失败')
    }
  }

  const handleAddModel = async () => {
    if (!currentSubscribe || !selectedModelId) return

    try {
      setIsAddingModel(true)
      await subscribeModelService.createSubscribeModel({
        subscribeId: currentSubscribe.id,
        modelId: selectedModelId,
        ...modelForm,
        enabled: Number(modelForm.enabled),
      })
      toast.success('添加模型成功')
      await loadModels(currentSubscribe.id)
      await loadAvailableModels(currentSubscribe.id)
      setSelectedModelId('')
      setModelForm({
        maxUsage: 0,
        enabled: '1',
        sortOrder: 0,
      })
    } catch (error) {
      toast.error('添加模型失败')
    } finally {
      setIsAddingModel(false)
    }
  }

  const handleBatchAddModels = async () => {
    if (!currentSubscribe || transferSelectedModels.length === 0) return

    try {
      setIsAddingModel(true)
      
      // 批量添加模型
      const promises = transferSelectedModels.map(modelId => 
        subscribeModelService.createSubscribeModel({
          subscribeId: currentSubscribe.id,
          modelId,
          maxUsage: modelForm.maxUsage,
          enabled: Number(modelForm.enabled),
          sortOrder: 0, // 默认排序值，后续可通过拖拽调整
        })
      )
      
      await Promise.all(promises)
      toast.success(`成功添加 ${transferSelectedModels.length} 个模型`)
      
      // 刷新数据
      await loadModels(currentSubscribe.id)
      await loadAvailableModels(currentSubscribe.id)
      
      // 重置状态
      setTransferSelectedModels([])
      setModelForm({
        maxUsage: 0,
        enabled: '1' as '1' | '0',
        sortOrder: 0,
      })
    } catch (error) {
      toast.error('批量添加模型失败')
    } finally {
      setIsAddingModel(false)
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
    
    if (!draggedModelItem || draggedModelItem === targetModelId || !currentSubscribe) {
      setDraggedModelItem(null)
      return
    }

    try {
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
        sortOrder: totalCount - index - 1
      }))
      
      // Update all models' sort on server
      await Promise.all(
        updatedModels.map(model => 
          subscribeModelService.updateSubscribeModel(model.id, { sortOrder: model.sortOrder })
        )
      )
      
      // Refresh models
      await loadModels(currentSubscribe.id)
      toast.success('模型排序已更新')
    } catch (error) {
      toast.error('模型排序更新失败')
      // Refresh models to reset state
      await loadModels(currentSubscribe.id)
    } finally {
      setDraggedModelItem(null)
    }
  }

  const handleUpdateModel = async (model: SubscribeModel) => {
    try {
      await subscribeModelService.updateSubscribeModel(model.id, {
        ...modelForm,
        enabled: Number(modelForm.enabled),
      })
      toast.success('更新模型成功')
      await loadModels(model.subscribeId)
    } catch (error) {
      toast.error('更新模型失败')
    }
  }

  const handleDeleteModel = async (model: SubscribeModel) => {
    try {
      await subscribeModelService.deleteSubscribeModel(model.id)
      toast.success('删除模型成功')
      await loadModels(model.subscribeId)
      await loadAvailableModels(model.subscribeId)
    } catch (error) {
      toast.error('删除模型失败')
    }
  }

  const handleUpdateMaxUsage = async (model: SubscribeModel) => {
    if (!editingModel || editingModel.id !== model.id) return

    try {
      setIsUpdatingModel(true)
      await subscribeModelService.updateSubscribeModel(model.id, {
        maxUsage: editingMaxUsage
      })
      toast.success('最大使用次数更新成功')
      await loadModels(model.subscribeId)
    } catch (error) {
      console.error('Update max usage error:', error)
      toast.error('更新最大使用次数失败')
    } finally {
      setIsUpdatingModel(false)
      setEditingModel(null)
      setEditingMaxUsage(0)
    }
  }

  const cancelEditMaxUsage = () => {
    setEditingModel(null)
    setEditingMaxUsage(0)
  }

  const totalPages = Math.ceil(total / pageSize)

  const formatPrice = (price: number | null) => {
    if (price === null) return '¥0.00'
    return `¥${(price / 100).toFixed(2)}`
  }

  return (
    <>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>套餐管理</h2>
            <p className='text-muted-foreground'>
              管理订阅套餐和积分包
            </p>
          </div>
          <Button onClick={handleAdd}>
            <Plus size={16} className='mr-2' />
            新建套餐
          </Button>
        </div>

        {/* Search */}
        <div className='flex items-center gap-2'>
          <Input
            placeholder='搜索套餐...'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='max-w-sm'
          />
          <Button variant='outline' onClick={() => setPage(1)}>
            搜索
          </Button>
        </div>

        {/* Subscribes Table */}
        <div className='rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>价格</TableHead>
                <TableHead>积分/时长</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>排序</TableHead>
                <TableHead>最受欢迎</TableHead>
                <TableHead className='text-right'>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className='text-center py-8'>
                    <Loader2 className='h-6 w-6 animate-spin mx-auto' />
                  </TableCell>
                </TableRow>
              ) : subscribes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className='text-center py-8 text-muted-foreground'>
                    暂无套餐数据
                  </TableCell>
                </TableRow>
              ) : (
                subscribes.map((subscribe) => (
                  <TableRow key={subscribe.id}>
                    <TableCell className='font-medium'>
                      <div>
                        {subscribe.name}
                        {subscribe.description && (
                          <p className='text-xs text-muted-foreground'>{subscribe.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {subscribe.type === 'subscription' ? '订阅套餐' : '积分包'}
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className='font-medium'>{formatPrice(subscribe.price)}</span>
                        {subscribe.originalPrice && subscribe.originalPrice > subscribe.price && (
                          <span className='ml-2 text-sm text-muted-foreground line-through'>
                            {formatPrice(subscribe.originalPrice)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {subscribe.type === 'subscription'
                        ? `${subscribe.duration || 0}天`
                        : `${subscribe.credits || 0}积分`}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        subscribe.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : subscribe.status === 'inactive'
                          ? 'bg-gray-100 text-gray-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {subscribe.status === 'active' ? '启用' : subscribe.status === 'inactive' ? '禁用' : '已删除'}
                      </span>
                    </TableCell>
                    <TableCell>{subscribe.sortOrder || 0}</TableCell>
                    <TableCell>
                      {subscribe.isPopular === 1 ? (
                        <span className='px-2 py-1 rounded-full text-xs bg-primary text-white'>
                          是
                        </span>
                      ) : (
                        <span className='px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700'>
                          否
                        </span>
                      )}
                    </TableCell>
                    <TableCell className='text-right'>
                      <Button
                        size='icon'
                        variant='ghost'
                        onClick={() => handleEdit(subscribe)}
                      >
                        <Pencil size={16} />
                      </Button>
                      <Button
                        size='icon'
                        variant='ghost'
                        onClick={() => openModelConfig(subscribe)}
                      >
                        <Settings size={16} />
                      </Button>
                      <Button
                        size='icon'
                        variant='ghost'
                        onClick={() => handleDelete(subscribe)}
                      >
                        <Trash2 size={16} className='text-destructive' />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className='flex items-center justify-between'>
          <div className='text-sm text-muted-foreground'>
            共 {total} 条记录
          </div>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
            >
              上一页
            </Button>
            <span className='text-sm'>
              第 {page} / {totalPages || 1} 页
            </span>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isLoading}
            >
              下一页
            </Button>
          </div>
        </div>
      </Main>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className='max-w-7xl' >
          <DialogHeader>
            <DialogTitle>{editingSubscribe ? '编辑套餐' : '新建套餐'}</DialogTitle>
            <DialogDescription>
              {editingSubscribe ? '修改套餐信息' : '创建新的订阅套餐或积分包'}
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <div className='grid gap-2'>
              <Label htmlFor='name'>名称</Label>
              <Input
                id='name'
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder='套餐名称'
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='description'>描述</Label>
              <Input
                id='description'
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder='套餐描述'
              />
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='grid gap-2'>
                <Label htmlFor='type'>类型</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: 'subscription' | 'credits') => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='subscription'>订阅套餐</SelectItem>
                    <SelectItem value='credits'>积分包</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='status'>状态</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: 'active' | 'inactive') => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='active'>启用</SelectItem>
                    <SelectItem value='inactive'>禁用</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className='grid grid-cols-2 gap-4'>
              <div className='grid gap-2'>
                <Label htmlFor='price'>价格（元）</Label>
                <Input
                  id='price'
                  type='number'
                  value={formData.price || ''}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value === '' ? null : Number(e.target.value) })}
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='originalPrice'>原价（元）</Label>
                <Input
                  id='originalPrice'
                  type='number'
                  value={formData.originalPrice || ''}
                  onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value === '' ? null : Number(e.target.value) })}
                />
              </div>
            </div>
            {formData.type === 'subscription' ? (
              <div className='grid gap-2'>
                <Label htmlFor='duration'>订阅时长（天）</Label>
                <Input
                  id='duration'
                  type='number'
                  value={formData.duration || ''}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value === '' ? null : Number(e.target.value) })}
                  placeholder='0表示永久'
                />
              </div>
            ) : (
              <div className='grid gap-2'>
                <Label htmlFor='credits'>积分数量</Label>
                <Input
                  id='credits'
                  type='number'
                  value={formData.credits || ''}
                  onChange={(e) => setFormData({ ...formData, credits: e.target.value === '' ? null : Number(e.target.value) })}
                />
              </div>
            )}
            <div className='grid grid-cols-2 gap-4'>
              <div className='grid gap-2'>
                <Label htmlFor='sortOrder'>排序</Label>
                <Input
                  id='sortOrder'
                  type='number'
                  value={formData.sortOrder || ''}
                  onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value === '' ? null : Number(e.target.value) })}
                  placeholder='数字越大越靠前'
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='isPopular'>最受欢迎</Label>
                <Select
                  value={formData.isPopular === 1 ? '1' : '0'}
                  onValueChange={(value) => setFormData({ ...formData, isPopular: value === '1' ? 1 : 0 })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='0'>否</SelectItem>
                    <SelectItem value='1'>是</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setIsEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit}>
              {editingSubscribe ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title={
          <div className='flex items-center gap-2 text-destructive'>
            <AlertTriangle size={20} />
            删除套餐
          </div>
        }
        desc={
          <div className='space-y-3'>
            <p>
              确定要删除套餐 <strong>{subscribeToDelete?.name}</strong> 吗？
            </p>
            <p className='text-sm text-muted-foreground'>
              此操作将软删除该套餐，数据不会真正丢失，但用户将无法购买。
            </p>
          </div>
        }
        cancelBtnText='取消'
        confirmText='删除'
        destructive
        handleConfirm={confirmDelete}
      />

      {/* Model Config Dialog */}
      <Dialog open={isModelConfigOpen} onOpenChange={setIsModelConfigOpen}>
        <DialogContent className='sm:max-w-[39rem] max-h-[90vh] overflow-y-auto'>
          <DialogHeader className='mb-2'>
            <DialogTitle>模型配置 - {currentSubscribe?.name}</DialogTitle>
            <DialogDescription>
              为套餐配置可用的AI模型及使用额度
            </DialogDescription>
          </DialogHeader>
          
          {/* Model Transfer Section */}
          <div className='border-b pb-2 mb-2'>
            <div className='mb-4 space-y-2'>
              <div className='grid grid-cols-2 gap-4'>
                <div className='grid gap-2'>
                  <Label htmlFor='max-usage'>最大使用次数</Label>
                  <Input
                    id='max-usage'
                    type='number'
                    value={modelForm.maxUsage}
                    onChange={(e) => setModelForm({ ...modelForm, maxUsage: Number(e.target.value) })}
                    placeholder='0表示无限制'
                    className='w-full'
                  />
                </div>
                <div className='grid gap-2'>
                  <Label htmlFor='enabled'>状态</Label>
                  <Select
                    value={modelForm.enabled.toString()}
                    onValueChange={(value: '1' | '0') => setModelForm({ ...modelForm, enabled: value })}
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='1'>启用</SelectItem>
                      <SelectItem value='0'>禁用</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <Transfer
              data={availableModels.map(item => ({
                id: item.model.id,
                name: item.model.name,
                provider: item.provider.name || '未知提供商',
                type: item.model.type
              }))}
              value={transferSelectedModels}
              onChange={setTransferSelectedModels}
              renderItem={(item) => (
                <div className='flex items-center'>
                  {item.type === 'text2image' && (
                    <Image size={14} className='text-blue-500 mr-2' />
                  )}
                  {item.type === 'text2video' && (
                    <Video size={14} className='text-purple-500 mr-2' />
                  )}
                  <span className='text-sm'>{item.name}</span>
                  <span className='text-xs text-muted-foreground ml-2'>- {item.provider}</span>
                </div>
              )}
              searchable={false}
            />
            
          </div>
          
          {/* Models List */}
          <div className='mt-1'>
            <div className='flex items-center justify-between mb-3'>
              <h4 className='font-medium'>已配置模型</h4>
              <Button 
                size='sm'
                onClick={handleBatchAddModels} 
                disabled={isAddingModel || transferSelectedModels.length === 0}
              >
                {isAddingModel ? (
                  <Loader2 size={14} className='mr-2 animate-spin' />
                ) : (
                  <PlusIcon size={14} className='mr-2' />
                )}
                批量添加 {transferSelectedModels.length} 个模型
              </Button>
            </div>
            {isModelLoading ? (
              <div className='text-center py-8'>
                <Loader2 className='h-6 w-6 animate-spin mx-auto' />
              </div>
            ) : models.length === 0 ? (
              <div className='text-center py-8 text-muted-foreground'>
                暂无模型配置
              </div>
            ) : (
              <div className='space-y-3 max-h-[210px] overflow-y-auto pr-2'>
                {models.sort((a, b) => (b.sortOrder || 0) - (a.sortOrder || 0)).map((model) => (
                  <div
                    key={model.id}
                    draggable
                    onDragStart={(e) => handleModelDragStart(e, model.id)}
                    onDragOver={(e) => handleModelDragOver(e, model.id)}
                    onDragLeave={handleModelDragLeave}
                    onDrop={(e) => handleModelDrop(e, model.id)}
                    className={cn(
                      'border rounded-md p-2.5 flex items-center justify-between cursor-move',
                      dragOverModelItem === model.id && 'border-t-2 border-primary',
                      draggedModelItem === model.id && 'opacity-50'
                    )}
                  >
                    <div className='flex-1 min-w-0 mr-3 flex items-center gap-1.5'>
                      <GripVertical size={14} className='text-muted-foreground cursor-grab active:cursor-grabbing' />
                      {model.model?.type === 'text2image' ? (
                        <Image size={14} className='text-blue-500 shrink-0' />
                      ) : model.model?.type === 'text2video' ? (
                        <Video size={14} className='text-purple-500 shrink-0' />
                      ) : null}
                      <h5 className='font-medium text-sm truncate'>
                        {model.model?.provider?.name || '未知提供商'}/{model.model?.name}
                      </h5>
                      {editingModel?.id === model.id ? (
                        <div className='flex items-center gap-1'>
                          <Input
                            type='number'
                            value={editingMaxUsage}
                            onChange={(e) => setEditingMaxUsage(Number(e.target.value))}
                            className='w-20 text-xs'
                            placeholder='0'
                          />
                          <Button
                            size='icon'
                            variant='ghost'
                            onClick={() => handleUpdateMaxUsage(model)}
                            disabled={isUpdatingModel}
                            className='h-6 w-6'
                          >
                            <Check size={12} className='text-green-600' />
                          </Button>
                          <Button
                            size='icon'
                            variant='ghost'
                            onClick={cancelEditMaxUsage}
                            className='h-6 w-6'
                          >
                            <X size={12} className='text-muted-foreground' />
                          </Button>
                        </div>
                      ) : (
                        <span className='text-xs text-muted-foreground shrink-0'>
                          (限制次数：{model.maxUsage === 0 ? '无限制' : model.maxUsage})
                        </span>
                      )}
                    </div>
                    <div className='flex items-center gap-1.5 shrink-0'>
                      <span className={`px-1.5 py-0.5 rounded-full text-xs ${model.enabled === 1 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {model.enabled === 1 ? '启用' : '禁用'}
                      </span>
                      <Button
                        size='icon'
                        variant='ghost'
                        onClick={() => {
                          setEditingModel(model)
                          setEditingMaxUsage(model.maxUsage)
                        }}
                        className='h-8 w-8'
                      >
                        <Pencil size={14} className='text-muted-foreground' />
                      </Button>
                      <Button
                        size='icon'
                        variant='ghost'
                        onClick={() => handleDeleteModel(model)}
                        className='h-8 w-8'
                      >
                        <TrashIcon size={14} className='text-destructive' />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant='outline' onClick={() => setIsModelConfigOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
