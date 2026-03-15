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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { orderService, type Order } from '@/lib/api/order'
import { Loader2 } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/orders/')({
  component: OrdersPage,
})

function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState('all')
  const [userName, setUserName] = useState('')
  const pageSize = 10

  // Load orders
  useEffect(() => {
    loadOrders()
  }, [page, search, status, userName])

  const loadOrders = async () => {
    try {
      setIsLoading(true)
      const result = await orderService.getOrders({
        page,
        pageSize,
        search: search || undefined,
        status: status !== 'all' ? status : undefined,
        userName: userName || undefined,
      })
      setOrders(result.orders)
      setTotal(result.total)
    } catch (error) {
      toast.error('加载订单失败')
    } finally {
      setIsLoading(false)
    }
  }

  const totalPages = Math.ceil(total / pageSize)
  const formatPrice = (price: number) => {
    return `¥${(price / 100).toFixed(2)}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700'
      case 'paid':
        return 'bg-green-100 text-green-700'
      case 'cancelled':
        return 'bg-gray-100 text-gray-700'
      case 'refunded':
        return 'bg-red-100 text-red-700'
      case 'expired':
        return 'bg-orange-100 text-orange-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '待支付'
      case 'paid':
        return '已支付'
      case 'cancelled':
        return '已取消'
      case 'refunded':
        return '已退款'
      case 'expired':
        return '已过期'
      default:
        return status
    }
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
            <h2 className='text-2xl font-bold tracking-tight'>订单管理</h2>
            <p className='text-muted-foreground'>
              管理用户订单和交易
            </p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className='flex flex-wrap items-center gap-2'>
          <Input
            placeholder='搜索订单号...'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='max-w-sm'
          />
          <Input
            placeholder='用户名...'
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className='w-40'
          />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className='w-32'>
              <SelectValue placeholder='状态' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>全部状态</SelectItem>
              <SelectItem value='pending'>待支付</SelectItem>
              <SelectItem value='paid'>已支付</SelectItem>
              <SelectItem value='cancelled'>已取消</SelectItem>
              <SelectItem value='refunded'>已退款</SelectItem>
              <SelectItem value='expired'>已过期</SelectItem>
            </SelectContent>
          </Select>
          <Button variant='outline' onClick={() => setPage(1)}>
            搜索
          </Button>
        </div>

        {/* Orders Table */}
        <div className='rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>订单号</TableHead>
                <TableHead>用户</TableHead>
                <TableHead>套餐</TableHead>
                <TableHead>金额</TableHead>
                <TableHead>优惠</TableHead>
                <TableHead>实付</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>创建时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className='text-center py-8'>
                    <Loader2 className='h-6 w-6 animate-spin mx-auto' />
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className='text-center py-8 text-muted-foreground'>
                    暂无订单数据
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className='font-medium'>
                      <code className='bg-muted px-2 py-1 rounded'>{order.orderNo}</code>
                    </TableCell>
                    <TableCell>
                      <div>
                        {order.user?.name || '未知用户'}
                        <p className='text-xs text-muted-foreground'>{order.user?.email || ''}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {order.subscribe?.name || '未知套餐'}
                    </TableCell>
                    <TableCell>
                      {formatPrice(order.totalAmount)}
                    </TableCell>
                    <TableCell>
                      {formatPrice(order.discountAmount)}
                      {order.couponId && (
                        <p className='text-xs text-muted-foreground'>优惠券: {order.couponId}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className='font-medium'>{formatPrice(order.actualAmount)}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {new Date(order.createdAt).toLocaleString()}
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


    </>
  )
}