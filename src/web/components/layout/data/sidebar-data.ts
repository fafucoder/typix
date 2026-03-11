import {
  LayoutDashboard,
  Monitor,
  Bell,
  Package,
  Palette,
  Settings,
  Wrench,
  UserCog,
  Users,
  Sparkles,
  Ticket,
  Shield,
} from 'lucide-react'

import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: 'satnaing',
    email: 'satnaingdev@gmail.com',
    avatar: '/avatars/shadcn.jpg',
  },
  navGroups: [
    {
      title: '常规',
      items: [
        {
          title: '仪表盘',
          url: '/',
          icon: LayoutDashboard,
        },
        {
          title: '模型管理',
          url: '/ai-providers',
          icon: Sparkles,
        },
        {
          title: '订阅计划',
          url: '/subscribes',
          icon: Package,
        },
        {
          title: '优惠券管理',
          url: '/coupons',
          icon: Ticket,
        },
        {
          title: '用户管理',
          url: '/users',
          icon: Users,
        },
      ],
    },
    {
      title: '系统',
      items: [
        {
          title: '系统设置',
          url: '/settings',
          icon: Settings,
        },
      ],
    },
  ],
}
