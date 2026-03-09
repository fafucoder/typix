import { Link } from '@tanstack/react-router'
import useDialogState from '@/hooks/use-dialog-state'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SignOutDialog } from '@/components/sign-out-dialog'
import { useEffect, useState } from 'react'

interface AdminData {
  name?: string
  email?: string
  image?: string | null
}

export function ProfileDropdown() {
  const [open, setOpen] = useDialogState()
  const [admin, setAdmin] = useState<AdminData | null>(null)

  // 加载当前管理员信息
  useEffect(() => {
    const loadAdmin = async () => {
      try {
        const accessToken = localStorage.getItem('admin-access-token')
        if (!accessToken) return

        const response = await fetch('/api/admin/verify', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        })

        if (response.ok) {
          const result: { data?: { admin?: AdminData } } = await response.json()
          if (result.data?.admin) {
            setAdmin(result.data.admin)
          }
        }
      } catch (error) {
        console.error('加载用户信息失败', error)
      }
    }
    loadAdmin()
  }, [])

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' className='relative h-8 w-8 rounded-full'>
            <Avatar className='h-8 w-8'>
              <AvatarImage src={admin?.image || ''} alt={admin?.name || ''} />
              <AvatarFallback>{admin?.name?.charAt(0) || 'A'}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className='w-56' align='end' forceMount>
          <DropdownMenuLabel className='font-normal'>
            <div className='flex flex-col gap-1.5'>
              <p className='text-sm leading-none font-medium'>{admin?.name || '管理员'}</p>
              <p className='text-xs leading-none text-muted-foreground'>
                {admin?.email || ''}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <Link to='/settings'>
                个人资料
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to='/settings/account'>
                账户设置
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to='/settings/security'>
                安全设置
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant='destructive' onClick={() => setOpen(true)}>
            退出登录
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SignOutDialog open={!!open} onOpenChange={setOpen} />
    </>
  )
}
