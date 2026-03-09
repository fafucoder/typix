import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { Search } from '@/components/search'
import { ConfigDrawer } from '@/components/config-drawer'
import { DateTimePicker } from '@/components/date-time-picker'
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
import { couponService, type Coupon } from '@/lib/api/coupon'
import { subscribeService, type Subscribe } from '@/lib/api/subscribe'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { AlertTriangle } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'

export const Route = createFileRoute('/_authenticated/coupons/')({
  component: CouponsPage,
})

function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [subscribes, setSubscribes] = useState<Subscribe[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 10

  // Dialog states
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [couponToDelete, setCouponToDelete] = useState<Coupon | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    type: 'percentage' as 'percentage' | 'fixed_amount',
    value: 0,
    minOrderAmount: 0,
    maxDiscountAmount: 0,
    usageLimit: 0,
    perUserLimit: 1,
    subscribeIds: [] as string[],
    startAt: '',
    endAt: '',
    status: 'active' as 'active' | 'inactive',
  })

  // Load coupons and subscribes
  useEffect(() => {
    loadCoupons()
    loadSubscribes()
  }, [page, search])

  const loadCoupons = async () => {
    try {
      setIsLoading(true)
      const result = await couponService.getCoupons({
        page,
        pageSize,
        search: search || undefined,
      })
      setCoupons(result.coupons)
      setTotal(result.total)
    } catch (error) {
      toast.error('加载优惠券失败')
    } finally {
      setIsLoading(false)
    }
  }

  const loadSubscribes = async () => {
    try {
      const result = await subscribeService.getSubscribes({ pageSize: 100 })
      setSubscribes(result.subscribes.filter(s => s.status === 'active'))
    } catch (error) {
      console.error('加载套餐失败', error)
    }
  }

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      type: 'percentage',
      value: 0,
      minOrderAmount: 0,
      maxDiscountAmount: 0,
      usageLimit: 0,
      perUserLimit: 1,
      subscribeIds: [],
      startAt: '',
      endAt: '',
      status: 'active',
    })
  }

  const handleAdd = () => {
    setEditingCoupon(null)
    resetForm()
    setIsEditDialogOpen(true)
  }

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon)
    setFormData({
      code: coupon.code,
      name: coupon.name,
      description: coupon.description || '',
      type: coupon.type,
      value: coupon.type === 'fixed_amount' ? coupon.value / 100 : coupon.value,
      minOrderAmount: coupon.minOrderAmount / 100,
      maxDiscountAmount: coupon.maxDiscountAmount ? coupon.maxDiscountAmount / 100 : 0,
      usageLimit: coupon.usageLimit,
      perUserLimit: coupon.perUserLimit,
      subscribeIds: coupon.subscribeIds || [],
      startAt: coupon.startAt ? new Date(coupon.startAt).toISOString().slice(0, 16) : '',
      endAt: coupon.endAt ? new Date(coupon.endAt).toISOString().slice(0, 16) : '',
      status: coupon.status === 'deleted' || coupon.status === 'expired' ? 'inactive' : coupon.status,
    })
    setIsEditDialogOpen(true)
  }

  const handleDelete = (coupon: Coupon) => {
    setCouponToDelete(coupon)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!couponToDelete) return

    try {
      await couponService.deleteCoupon(couponToDelete.id)
      toast.success('删除成功')
      setIsDeleteDialogOpen(false)
      setCouponToDelete(null)
      loadCoupons()
    } catch (error) {
      toast.error('删除失败')
    }
  }

  const handleSubmit = async () => {
    try {
      // 将价格从元转换为分
      const baseData = {
        ...formData,
        value: formData.type === 'fixed_amount' ? Math.round(formData.value * 100) : formData.value,
        minOrderAmount: Math.round(formData.minOrderAmount * 100),
        maxDiscountAmount: formData.maxDiscountAmount ? Math.round(formData.maxDiscountAmount * 100) : 0,
        startAt: formData.startAt || undefined,
        endAt: formData.endAt || undefined,
      }
      if (editingCoupon) {
        await couponService.updateCoupon(editingCoupon.id, baseData)
        toast.success('更新成功')
      } else {
        await couponService.createCoupon(baseData)
        toast.success('创建成功')
      }
      setIsEditDialogOpen(false)
      loadCoupons()
    } catch (error) {
      toast.error(editingCoupon ? '更新失败' : '创建失败')
    }
  }

  const toggleSubscribe = (subscribeId: string) => {
    setFormData(prev => ({
      ...prev,
      subscribeIds: prev.subscribeIds.includes(subscribeId)
        ? prev.subscribeIds.filter(id => id !== subscribeId)
        : [...prev.subscribeIds, subscribeId]
    }))
  }

  const totalPages = Math.ceil(total / pageSize)
  const formatDiscount = (coupon: Coupon) => {
    if (coupon.type === 'percentage') {
      return `${coupon.value}%`
    }
    return `¥${(coupon.value / 100).toFixed(2)}`
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
            <h2 className='text-2xl font-bold tracking-tight'>优惠券管理</h2>
            <p className='text-muted-foreground'>
              管理优惠券和促销码
            </p>
          </div>
          <Button onClick={handleAdd}>
            <Plus size={16} className='mr-2' />
            新建优惠券
          </Button>
        </div>

        {/* Search */}
        <div className='flex items-center gap-2'>
          <Input
            placeholder='搜索优惠券...'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='max-w-sm'
          />
          <Button variant='outline' onClick={() => setPage(1)}>
            搜索
          </Button>
        </div>

        {/* Coupons Table */}
        <div className='rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>优惠码</TableHead>
                <TableHead>名称</TableHead>
                <TableHead>折扣</TableHead>
                <TableHead>使用限制</TableHead>
                <TableHead>有效期</TableHead>
                <TableHead>状态</TableHead>
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
              ) : coupons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className='text-center py-8 text-muted-foreground'>
                    暂无优惠券数据
                  </TableCell>
                </TableRow>
              ) : (
                coupons.map((coupon) => (
                  <TableRow key={coupon.id}>
                    <TableCell className='font-medium'>
                      <code className='bg-muted px-2 py-1 rounded'>{coupon.code}</code>
                    </TableCell>
                    <TableCell>
                      <div>
                        {coupon.name}
                        {coupon.description && (
                          <p className='text-xs text-muted-foreground'>{coupon.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className='font-medium text-green-600'>
                        {formatDiscount(coupon)}
                      </span>
                      {coupon.type === 'percentage' && coupon.maxDiscountAmount && (
                        <span className='text-xs text-muted-foreground ml-1'>
                          最高¥{(coupon.maxDiscountAmount / 100).toFixed(2)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className='text-sm'>
                        <div>已用: {coupon.usageCount}/{coupon.usageLimit || '∞'}</div>
                        <div>每人限: {coupon.perUserLimit}次</div>
                        {coupon.minOrderAmount > 0 && (
                          <div className='text-muted-foreground'>
                            满¥{(coupon.minOrderAmount / 100).toFixed(2)}可用
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className='text-sm'>
                        {coupon.startAt && (
                          <div>开始: {new Date(coupon.startAt).toLocaleDateString()}</div>
                        )}
                        {coupon.endAt && (
                          <div>结束: {new Date(coupon.endAt).toLocaleDateString()}</div>
                        )}
                        {!coupon.startAt && !coupon.endAt && (
                          <span className='text-muted-foreground'>无限制</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        coupon.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : coupon.status === 'inactive'
                          ? 'bg-gray-100 text-gray-700'
                          : coupon.status === 'expired'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {coupon.status === 'active' ? '启用' : 
                         coupon.status === 'inactive' ? '禁用' : 
                         coupon.status === 'expired' ? '已过期' : '已删除'}
                      </span>
                    </TableCell>
                    <TableCell className='text-right'>
                      <Button
                        size='icon'
                        variant='ghost'
                        onClick={() => handleEdit(coupon)}
                      >
                        <Pencil size={16} />
                      </Button>
                      <Button
                        size='icon'
                        variant='ghost'
                        onClick={() => handleDelete(coupon)}
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
        <DialogContent className='max-w-lg overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>{editingCoupon ? '编辑优惠券' : '新建优惠券'}</DialogTitle>
            <DialogDescription>
              {editingCoupon ? '修改优惠券信息' : '创建新的优惠券'}
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <div className='grid grid-cols-2 gap-4'>
              <div className='grid gap-2'>
                <Label htmlFor='code'>优惠码 {!editingCoupon && <span className='text-muted-foreground'>(留空自动生成)</span>}</Label>
                <Input
                  id='code'
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder={editingCoupon ? 'SUMMER2024' : '留空将自动生成'}
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='name'>名称 *</Label>
                <Input
                  id='name'
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder='夏季特惠'
                />
              </div>
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='description'>描述</Label>
              <Input
                id='description'
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder='优惠券描述'
              />
            </div>
            <div className='grid grid-cols-2 gap-4'>
              <div className='grid gap-2'>
                <Label htmlFor='type'>折扣类型</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: 'percentage' | 'fixed_amount') => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='percentage'>百分比折扣</SelectItem>
                    <SelectItem value='fixed_amount'>固定金额</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='value'>
                  {formData.type === 'percentage' ? '折扣百分比' : '折扣金额（元）'}
                </Label>
                <Input
                  id='value'
                  type='number'
                  value={formData.value || ''}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value === '' ? 0 : Number(e.target.value) })}
                  placeholder={formData.type === 'percentage' ? '20表示8折' : '50表示50元'}
                />
              </div>
            </div>
            {formData.type === 'percentage' && (
              <div className='grid gap-2'>
                <Label htmlFor='maxDiscountAmount'>最大折扣金额（元）</Label>
                <Input
                  id='maxDiscountAmount'
                  type='number'
                  value={formData.maxDiscountAmount || ''}
                  onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value === '' ? 0 : Number(e.target.value) })}
                  placeholder='0表示无限制'
                />
              </div>
            )}
            <div className='grid grid-cols-2 gap-4'>
              <div className='grid gap-2'>
                <Label htmlFor='minOrderAmount'>最低订单金额（元）</Label>
                <Input
                  id='minOrderAmount'
                  type='number'
                  value={formData.minOrderAmount || ''}
                  onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value === '' ? 0 : Number(e.target.value) })}
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='usageLimit'>总使用次数限制</Label>
                <Input
                  id='usageLimit'
                  type='number'
                  value={formData.usageLimit}
                  onChange={(e) => setFormData({ ...formData, usageLimit: Number(e.target.value) })}
                  placeholder='0表示无限制'
                />
              </div>
            </div>
            <div className='grid grid-cols-2 gap-4'>
              <div className='grid gap-2'>
                <Label htmlFor='perUserLimit'>每人限制次数</Label>
                <Input
                  id='perUserLimit'
                  type='number'
                  value={formData.perUserLimit}
                  onChange={(e) => setFormData({ ...formData, perUserLimit: Number(e.target.value) })}
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='status'>状态</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: 'active' | 'inactive') => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger className='w-full'>
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
                <Label>开始时间</Label>
                <DateTimePicker
                  value={formData.startAt}
                  onChange={(value) => setFormData({ ...formData, startAt: value })}
                  placeholder='选择开始时间'
                />
              </div>
              <div className='grid gap-2'>
                <Label>结束时间</Label>
                <DateTimePicker
                  value={formData.endAt}
                  onChange={(value) => setFormData({ ...formData, endAt: value })}
                  placeholder='选择结束时间'
                />
              </div>
            </div>
            <div className='grid gap-2'>
              <Label>适用套餐（不选表示所有套餐）</Label>
              <div className='border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto'>
                {subscribes.length === 0 ? (
                  <p className='text-sm text-muted-foreground'>暂无可用套餐</p>
                ) : (
                  subscribes.map((subscribe) => (
                    <div key={subscribe.id} className='flex items-center space-x-2'>
                      <Checkbox
                        id={`subscribe-${subscribe.id}`}
                        checked={formData.subscribeIds.includes(subscribe.id)}
                        onCheckedChange={() => toggleSubscribe(subscribe.id)}
                      />
                      <label
                        htmlFor={`subscribe-${subscribe.id}`}
                        className='text-sm cursor-pointer'
                      >
                        {subscribe.name}
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setIsEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit}>
              {editingCoupon ? '保存' : '创建'}
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
            删除优惠券
          </div>
        }
        desc={
          <div className='space-y-3'>
            <p>
              确定要删除优惠券 <strong>{couponToDelete?.code}</strong> 吗？
            </p>
            <p className='text-sm text-muted-foreground'>
              此操作将软删除该优惠券，已领取的用户仍可使用。
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
