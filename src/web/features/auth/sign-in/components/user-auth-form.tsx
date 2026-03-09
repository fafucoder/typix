import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from '@tanstack/react-router'
import { Loader2, LogIn } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/password-input'

const formSchema = z.object({
  email: z.email({
    error: (iss) => (iss.input === '' ? 'emailRequired' : undefined),
  }),
  password: z
    .string()
    .min(1, 'passwordRequired')
    .min(6, 'passwordTooShort'),
})

interface UserAuthFormProps extends React.HTMLAttributes<HTMLFormElement> {
  redirectTo?: string
}

interface AdminLoginResponse {
  code: string;
  message?: string;
  data?: {
    token: string;
    admin: {
      id: string;
      userId: string;
      name: string;
      email: string;
      department?: string | null;
      permissions?: string[] | null;
      status: string;
    };
  };
}

export function UserAuthForm({
  className,
  redirectTo,
  ...props
}: UserAuthFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { auth } = useAuthStore()
  const { t } = useTranslation()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsLoading(true)

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
        credentials: 'include',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as { message?: string }
        toast.error(errorData.message || t('auth.messages.loginFailed'))
        setIsLoading(false)
        return
      }

      const result = await response.json() as { code: string; data?: { token: string; admin: { id: string; name: string; email: string; role: string } } }
      
      if (result.code !== 'ok' || !result.data) {
        toast.error(t('auth.messages.loginFailed'))
        setIsLoading(false)
        return
      }

      const { token, admin } = result.data
      const mockUser = {
        accountNo: admin.id,
        email: admin.email,
        role: [admin.role],
        exp: Date.now() + 24 * 60 * 60 * 1000,
      }

      auth.setUser(mockUser)
      auth.setAccessToken(token)
      localStorage.setItem('admin-access-token', token)

      toast.success(t('auth.messages.loginSuccess', { name: admin.name }))

      const targetPath = redirectTo || '/'
      navigate({ to: targetPath, replace: true })
    } catch (error) {
      console.error('Login error:', error)
      toast.error(t('auth.messages.loginFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-3', className)}
        {...props}
      >
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('auth.signIn.email')}</FormLabel>
              <FormControl>
                <Input placeholder={t('auth.signIn.emailPlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem className='relative'>
              <FormLabel>{t('auth.signIn.password')}</FormLabel>
              <FormControl>
                <PasswordInput placeholder={t('auth.signIn.passwordPlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
              <Link
                to='/forgot-password'
                className='absolute end-0 -top-0.5 text-sm font-medium text-muted-foreground hover:opacity-75'
              >
                {t('auth.signIn.forgotPassword')}
              </Link>
            </FormItem>
          )}
        />
        <Button className='mt-2' disabled={isLoading}>
          {isLoading ? <Loader2 className='animate-spin' /> : <LogIn />}
          {isLoading ? t('auth.signIn.signingIn') : t('auth.signIn.signInButton')}
        </Button>
      </form>
    </Form>
  )
}
