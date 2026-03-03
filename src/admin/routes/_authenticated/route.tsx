import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { useAuthStore } from '@/stores/auth-store'

interface VerifyResponse {
  code: string;
  message?: string;
  data?: {
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

export const Route = createFileRoute('/_authenticated')({
  component: AuthenticatedLayout,
  beforeLoad: async ({ context }) => {
    const accessToken = localStorage.getItem('admin-access-token')
    
    if (!accessToken) {
      throw redirect({
        to: '/sign-in',
        search: {
          redirect: window.location.pathname,
        },
      })
    }

    const authState = useAuthStore.getState()
    if (!authState.auth.user) {
      try {
        const response = await fetch('/api/admin/verify', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        })

        if (!response.ok) {
          localStorage.removeItem('admin-access-token')
          throw redirect({
            to: '/sign-in',
            search: {
              redirect: window.location.pathname,
            },
          })
        }

        const result: VerifyResponse = await response.json()
        
        if (result.code === 'ok' && result.data?.admin) {
          const admin = result.data.admin
          const mockUser = {
            accountNo: admin.id,
            email: admin.email,
            role: ['admin'],
            exp: Date.now() + 24 * 60 * 60 * 1000,
          }
          authState.auth.setUser(mockUser)
        } else {
          localStorage.removeItem('admin-access-token')
          throw redirect({
            to: '/sign-in',
            search: {
              redirect: window.location.pathname,
            },
          })
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('redirect')) {
          throw error
        }
        localStorage.removeItem('admin-access-token')
        throw redirect({
          to: '/sign-in',
          search: {
            redirect: window.location.pathname,
          },
        })
      }
    }

    return context
  },
})
