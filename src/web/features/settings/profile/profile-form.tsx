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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useEffect, useState, useRef } from 'react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'

const profileFormSchema = z.object({
  name: z
    .string()
    .min(2, '姓名至少需要2个字符')
    .max(50, '姓名不能超过50个字符'),
  department: z
    .string()
    .max(100, '部门名称不能超过100个字符')
    .optional(),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

interface AdminData {
  name?: string
  department?: string | null
  image?: string | null
}

export function ProfileForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [admin, setAdmin] = useState<AdminData | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuthStore((state) => state.auth)

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: '',
      department: '',
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
            setPreviewImage(result.data.admin.image || null)
            form.reset({
              name: result.data.admin.name || '',
              department: result.data.admin.department || '',
            })
          }
        }
      } catch (error) {
        toast.error('加载用户信息失败')
      }
    }
    loadAdmin()
  }, [form])

  async function onSubmit(data: ProfileFormValues) {
    try {
      setIsLoading(true)
      const accessToken = localStorage.getItem('admin-access-token')
      if (!accessToken) {
        toast.error('未登录')
        return
      }

      const response = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        toast.success('个人资料已更新')
        // 刷新管理员信息
        const verifyResponse = await fetch('/api/admin/verify', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        })
        if (verifyResponse.ok) {
          const result: { data?: { admin?: AdminData } } = await verifyResponse.json()
          if (result.data?.admin) {
            setAdmin(result.data.admin)
          }
        }
      } else {
        const error: { message?: string } = await response.json()
        toast.error(error.message || '更新失败')
      }
    } catch (error) {
      toast.error('更新失败')
    } finally {
      setIsLoading(false)
    }
  }

  // 处理文件选择
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件')
      return
    }

    // 验证文件大小 (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('文件大小不能超过 2MB')
      return
    }

    // 读取文件并预览
    const reader = new FileReader()
    reader.onload = async (event) => {
      const result = event.target?.result as string
      setPreviewImage(result)
      
      // 上传头像
      await uploadAvatar(result)
    }
    reader.readAsDataURL(file)
  }

  // 上传头像
  const uploadAvatar = async (imageData: string) => {
    try {
      setIsUploadingAvatar(true)
      const accessToken = localStorage.getItem('admin-access-token')
      if (!accessToken) {
        toast.error('未登录')
        return
      }

      const response = await fetch('/api/admin/avatar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ image: imageData }),
      })

      if (response.ok) {
        const data: { data?: { image?: string } } = await response.json()
        toast.success('头像已更新')
        // 上传成功，保持当前 base64 预览（立即显示）
        // 同时更新 admin 数据中的 image 路径
        if (data.data?.image) {
          setAdmin((prev) => prev ? { ...prev, image: data.data!.image } : null)
        }
        // 刷新管理员信息
        const verifyResponse = await fetch('/api/admin/verify', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        })
        if (verifyResponse.ok) {
          const result: { data?: { admin?: AdminData } } = await verifyResponse.json()
          if (result.data?.admin) {
            setAdmin(result.data.admin)
            // 验证成功后，使用服务器路径替换 base64 预览
            setPreviewImage(result.data.admin.image || null)
          }
        }
      } else {
        const error: { message?: string } = await response.json()
        toast.error(error.message || '头像上传失败')
        // 恢复原头像
        setPreviewImage(admin?.image || null)
      }
    } catch (error) {
      toast.error('头像上传失败')
      // 恢复原头像
      setPreviewImage(admin?.image || null)
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  // 触发文件选择
  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
        {/* 头像 */}
        <div className='flex items-center gap-4'>
          <Avatar className='h-20 w-20'>
            <AvatarImage src={previewImage || ''} alt={admin?.name || ''} />
            <AvatarFallback className='text-2xl'>
              {admin?.name?.charAt(0) || 'A'}
            </AvatarFallback>
          </Avatar>
          <div>
            <input
              type='file'
              ref={fileInputRef}
              onChange={handleFileChange}
              accept='image/*'
              className='hidden'
            />
            <Button 
              type='button' 
              variant='outline' 
              size='sm' 
              onClick={triggerFileInput}
              disabled={isUploadingAvatar}
            >
              {isUploadingAvatar ? '上传中...' : '更换头像'}
            </Button>
            <p className='text-xs text-muted-foreground mt-1'>
              支持 JPG、PNG 格式，文件大小不超过 2MB
            </p>
          </div>
        </div>

        <FormField
          control={form.control}
          name='name'
          render={({ field }) => (
            <FormItem>
              <FormLabel>姓名</FormLabel>
              <FormControl>
                <Input placeholder='请输入姓名' {...field} />
              </FormControl>
              <FormDescription>
                您的真实姓名或显示名称
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='department'
          render={({ field }) => (
            <FormItem>
              <FormLabel>部门</FormLabel>
              <FormControl>
                <Input placeholder='请输入部门名称' {...field} />
              </FormControl>
              <FormDescription>
                您所属的部门或团队
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
  )
}
