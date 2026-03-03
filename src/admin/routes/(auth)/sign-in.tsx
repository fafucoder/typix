import { z } from 'zod'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { SignIn } from '@/features/auth/sign-in'
import { useAuthStore } from '@/stores/auth-store'

const searchSchema = z.object({
  redirect: z.string().optional(),
})

export const Route = createFileRoute('/(auth)/sign-in')({
  component: SignIn,
  validateSearch: searchSchema,
  beforeLoad: async ({ search }) => {
    const accessToken = localStorage.getItem('admin-access-token')
    
    if (accessToken) {
      const authState = useAuthStore.getState()
      
      if (authState.auth.user) {
        throw redirect({
          to: search.redirect || '/',
          replace: true,
        })
      }

      try {
        const response = await fetch('/api/admin/verify', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        })

        if (response.ok) {
          throw redirect({
            to: search.redirect || '/',
            replace: true,
          })
        } else {
          localStorage.removeItem('admin-access-token')
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('redirect')) {
          throw error
        }
        localStorage.removeItem('admin-access-token')
      }
    }
  },
})
