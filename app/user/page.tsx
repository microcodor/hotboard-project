'use client'

import { useUserProfile } from '@/hooks/useUserProfile'
import { useUserStats } from '@/hooks/useUserStats'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Star, History, Settings, TrendingUp, Calendar, User } from 'lucide-react'
import Image from 'next/image'

export default function UserPage() {
  const { profile, isLoading } = useUserProfile()
  const { stats } = useUserStats()

  if (isLoading || !profile) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    )
  }

  const statItems = [
    { icon: Star,       label: '收藏数',    value: stats?.favorites_count ?? 0 },
    { icon: TrendingUp, label: '浏览次数',    value: stats?.total_views ?? 0 },
    { icon: Calendar,    label: '加入天数',    value: stats?.joined_days ?? 0 },
  ]

  const menuItems = [
    { icon: Star,     label: '我的收藏',    href: '/user/favorites', count: stats?.favorites_count ?? 0 },
    { icon: History,   label: '浏览历史',    href: '/user/history',    count: stats?.history_count ?? 0 },
    { icon: Settings,  label: '账号设置',    href: '/user/settings',   count: null },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 用户信息卡片 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-5">
            {/* 头像 */}
            <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
              {profile.avatar_url ? (
                <Image src={profile.avatar_url} alt="头像" fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-blue-100">
                  <User className="w-8 h-8 text-blue-600" />
                </div>
              )}
            </div>

            {/* 信息 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {profile.display_name || '未设置昵称'}
                  </h1>
                  <p className="text-sm text-gray-500 mt-0.5">{profile.email}</p>
                </div>
                <Link href="/user/settings"
                  className="flex-shrink-0 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
                  编辑资料
                </Link>
              </div>

              {profile.bio && (
                <p className="text-gray-600 text-sm mt-3">{profile.bio}</p>
              )}
              <p className="text-xs text-gray-400 mt-3">
                加入于 {new Date(profile.created_at).toLocaleDateString('zh-CN')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 统计 */}
      <div className="grid grid-cols-3 gap-4">
        {statItems.map(item => (
          <Card key={item.label}>
            <CardContent className="p-5 text-center">
              <item.icon className="w-6 h-6 text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{item.value}</p>
              <p className="text-xs text-gray-500 mt-1">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 功能菜单 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {menuItems.map(item => (
          <Link key={item.href} href={item.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{item.label}</p>
                  {item.count !== null && (
                    <p className="text-sm text-gray-500">{item.count} 个</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
