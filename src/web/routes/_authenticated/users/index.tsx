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
import { toast } from 'sonner'
import { userService, type User } from '@/lib/api/user'
import { Trash2, Loader2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { AlertTriangle } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/users/')({
  component: UsersPage,
})

function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 10

  // Delete dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)

  // Load users
  useEffect(() => {
    loadUsers()
  }, [page, search])

  const loadUsers = async () => {
    try {
      setIsLoading(true)
      const result = await userService.getUsers({
        page,
        pageSize,
        search: search || undefined,
      })
      setUsers(result.users)
      setTotal(result.total)
    } catch (error) {
      toast.error('加载用户失败')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = (user: User) => {
    setUserToDelete(user)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!userToDelete) return

    try {
      await userService.deleteUser(userToDelete.id)
      toast.success('删除成功')
      setIsDeleteDialogOpen(false)
      setUserToDelete(null)
      loadUsers()
    } catch (error) {
      toast.error('删除失败')
    }
  }

  const totalPages = Math.ceil(total / pageSize)

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
            <h2 className='text-2xl font-bold tracking-tight'>用户列表</h2>
            <p className='text-muted-foreground'>
              管理系统用户
            </p>
          </div>
        </div>

        {/* Search */}
        <div className='flex items-center gap-2'>
          <Input
            placeholder='搜索用户...'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='max-w-sm'
          />
          <Button variant='outline' onClick={() => setPage(1)}>
            搜索
          </Button>
        </div>

        {/* Users Table */}
        <div className='rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>用户名</TableHead>
                <TableHead>邮箱</TableHead>
                <TableHead>邮箱验证</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className='text-right'>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className='text-center py-8'>
                    <Loader2 className='h-6 w-6 animate-spin mx-auto' />
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className='text-center py-8 text-muted-foreground'>
                    暂无用户数据
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className='font-medium'>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.emailVerified ? (
                        <span className='text-green-600'>已验证</span>
                      ) : (
                        <span className='text-yellow-600'>未验证</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className='text-right'>
                      <Button
                        size='icon'
                        variant='ghost'
                        onClick={() => handleDelete(user)}
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

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title={
          <div className='flex items-center gap-2 text-destructive'>
            <AlertTriangle size={20} />
            删除用户
          </div>
        }
        desc={
          <div className='space-y-3'>
            <p>
              确定要删除用户 <strong>{userToDelete?.name}</strong> 吗？
            </p>
            <p className='text-sm text-muted-foreground'>
              此操作将永久删除该用户，无法撤销。
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
