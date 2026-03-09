import { useSidebar } from '@/components/ui/sidebar'
import { useLayout } from '@/context/layout-provider'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { AppTitle } from './app-title'
import { sidebarData } from './data/sidebar-data'
import { NavGroup } from './nav-group'
import { NavUser } from './nav-user'
import { useEffect, useState } from 'react'

interface AdminData {
  name?: string
  email?: string
  image?: string | null
}

export function AppSidebar() {
  const { state } = useSidebar()
  const { variant } = useLayout()
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

  const user = {
    name: admin?.name || sidebarData.user.name,
    email: admin?.email || sidebarData.user.email,
    avatar: admin?.image || sidebarData.user.avatar,
  }

  return (
    <Sidebar collapsible={state === 'collapsed' ? 'icon' : 'offcanvas'} variant={variant}>
      <SidebarHeader>
        <AppTitle />
      </SidebarHeader>
      <SidebarContent>
        {sidebarData.navGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
