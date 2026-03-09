import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'

const accountFormSchema = z.object({
  email: z
    .string()
    .email('请输入有效的邮箱地址'),
})

type AccountFormValues = z.infer<typeof accountFormSchema>

interface AdminData {
  email?: string
  role?: string
  status?: string
  emailVerified?: boolean
}

export function AccountForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [admin, setAdmin] = useState<AdminData | null>(null)

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      email: '',
    },
  })

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
            form.reset({
              email: result.data.admin.email || '',
            })
          }
        }
      } catch (error) {
        toast.error('加载账户信息失败')
      }
    }
    loadAdmin()
  }, [form])

  async function onSubmit(data: AccountFormValues) {
    try {
      setIsLoading(true)
      // TODO: 调用 API 更新邮箱
      toast.success('邮箱已更新')
    } catch (error) {
      toast.error('更新失败')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='space-y-8'>
      {/* 账户信息展示 */}
      <div className='space-y-4'>
        <div className='flex items-center justify-between rounded-lg border p-4'>
          <div>
            <p className='text-sm font-medium'>角色</p>
            <p className='text-xs text-muted-foreground'>
              您的账户权限级别
            </p>
          </div>
          <Badge variant={admin?.role === 'super_admin' ? 'default' : 'secondary'}>
            {admin?.role === 'super_admin' ? '超级管理员' : 
             admin?.role === 'admin' ? '管理员' : '编辑'}
          </Badge>
        </div>

        <div className='flex items-center justify-between rounded-lg border p-4'>
          <div>
            <p className='text-sm font-medium'>账户状态</p>
            <p className='text-xs text-muted-foreground'>
              当前账户的状态
            </p>
          </div>
          <Badge variant={admin?.status === 'active' ? 'default' : 'destructive'}>
            {admin?.status === 'active' ? '正常' : 
             admin?.status === 'inactive' ? '未激活' : '已暂停'}
          </Badge>
        </div>

        <div className='flex items-center justify-between rounded-lg border p-4'>
          <div>
            <p className='text-sm font-medium'>邮箱验证</p>
            <p className='text-xs text-muted-foreground'>
              邮箱地址是否已验证
            </p>
          </div>
          <Badge variant={admin?.emailVerified ? 'default' : 'outline'}>
            {admin?.emailVerified ? '已验证' : '未验证'}
          </Badge>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
          <FormField
            control={form.control}
            name='email'
            render={({ field }) => (
              <FormItem>
                <FormLabel>邮箱地址</FormLabel>
                <FormControl>
                  <Input placeholder='请输入邮箱地址' {...field} />
                </FormControl>
                <FormDescription>
                  用于登录和接收通知的邮箱地址
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type='submit' disabled={isLoading}>
            {isLoading ? '保存中...' : '保存更改'}
          </Button>
        </form>
      </Form>
    </div>
  )
}
