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
import { Plus, Pencil, Trash2, Loader2, Settings, Plus as PlusIcon, Trash2 as TrashIcon, Image as ImageIcon, Video, Check, X } from 'lucide-react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { AlertTriangle } from 'lucide-react'
import { subscribeModelService, type SubscribeModel } from '@/lib/api/subscribe-model'

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
  const [selectedModelId, setSelectedModelId] = useState('')
  const [modelForm, setModelForm] = useState({
    maxUsage: 0,
    enabled: '1' as '1' | '0',
    sortOrder: 0,
  })
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
        <DialogContent className='max-w-lg' >
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
        <DialogContent className='max-w-3xl'>
          <DialogHeader>
            <DialogTitle>模型配置 - {currentSubscribe?.name}</DialogTitle>
            <DialogDescription>
              为套餐配置可用的AI模型及使用额度
            </DialogDescription>
          </DialogHeader>
          
          {/* Add Model Section */}
          <div className='border-b pb-4 mb-4'>
            <h4 className='font-medium mb-3'>添加模型</h4>
            <div className='grid grid-cols-2 gap-4'>
              <div className='grid gap-2'>
                <Label htmlFor='model-select'>选择模型</Label>
                <Select
                  value={selectedModelId}
                  onValueChange={setSelectedModelId}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='选择模型' />
                  </SelectTrigger>
                  <SelectContent>
                    {(() => {
                      // Group models by provider
                      const grouped = availableModels.reduce<Record<string, typeof availableModels>>((acc, item) => {
                        const providerName = item.provider.name || '未知提供商'
                        if (!acc[providerName]) {
                          acc[providerName] = []
                        }
                        acc[providerName].push(item)
                        return acc
                      }, {})
                      
                      return Object.entries(grouped).map(([providerName, providerModels]) => (
                        <div key={providerName}>
                          <div className='px-2 py-1.5 text-sm font-semibold text-muted-foreground bg-muted/50'>
                            {providerName}
                          </div>
                          {providerModels.map((item: typeof availableModels[0]) => (
                            <SelectItem key={item.model.id} value={item.model.id}>
                              {item.model.name}
                            </SelectItem>
                          ))}
                        </div>
                      ))
                    })()}
                  </SelectContent>
                </Select>
              </div>
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
            </div>
            <div className='grid grid-cols-2 gap-4 mt-4'>
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
              <div className='grid gap-2'>
                <Label htmlFor='sort-order'>排序</Label>
                <Input
                  id='sort-order'
                  type='number'
                  value={modelForm.sortOrder}
                  onChange={(e) => setModelForm({ ...modelForm, sortOrder: Number(e.target.value) })}
                  className='w-full'
                />
              </div>
            </div>
            <div className='mt-4'>
              <Button onClick={handleAddModel} disabled={isAddingModel || !selectedModelId}>
                {isAddingModel ? (
                  <Loader2 size={16} className='mr-2 animate-spin' />
                ) : (
                  <PlusIcon size={16} className='mr-2' />
                )}
                添加模型
              </Button>
            </div>
          </div>
          
          {/* Models List */}
          <div>
            <h4 className='font-medium mb-3'>已配置模型</h4>
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
                {models.map((model) => (
                  <div key={model.id} className='border rounded-md p-4 flex items-center justify-between'>
                    <div className='flex-1 min-w-0 mr-4 flex items-center gap-2'>
                      {model.model?.type === 'text2image' ? (
                        <ImageIcon size={16} className='text-blue-500 shrink-0' />
                      ) : model.model?.type === 'text2video' ? (
                        <Video size={16} className='text-purple-500 shrink-0' />
                      ) : null}
                      <h5 className='font-medium truncate'>
                        {model.model?.provider?.name || '未知提供商'}/{model.model?.name}
                      </h5>
                      <span className='text-sm text-muted-foreground shrink-0'>
                        (限制次数：{model.maxUsage === 0 ? '无限制' : model.maxUsage})
                      </span>
                    </div>
                    <div className='flex items-center gap-2 shrink-0'>
                      <span className={`px-2 py-1 rounded-full text-xs ${model.enabled === 1 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {model.enabled === 1 ? '启用' : '禁用'}
                      </span>
                      <Button
                        size='icon'
                        variant='ghost'
                        onClick={() => handleDeleteModel(model)}
                      >
                        <TrashIcon size={16} className='text-destructive' />
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
