'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import AvatarUpload from '@/components/user/AvatarUpload'
import ProfileEditForm from '@/components/user/ProfileEditForm'
import ChangePasswordForm from '@/components/user/ChangePasswordForm'
import PreferencesForm from '@/components/user/PreferencesForm'
import DangerZone from '@/components/user/DangerZone'

export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">账号设置</h1>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-white">
          <TabsTrigger value="profile">个人资料</TabsTrigger>
          <TabsTrigger value="password">修改密码</TabsTrigger>
          <TabsTrigger value="preferences">API Key</TabsTrigger>
          <TabsTrigger value="danger">危险区域</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <div>
            <h2 className="text-base font-semibold text-gray-800 mb-3">头像</h2>
            <AvatarUpload />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-800 mb-3">基本信息</h2>
            <ProfileEditForm />
          </div>
        </TabsContent>

        <TabsContent value="password">
          <ChangePasswordForm />
        </TabsContent>

        <TabsContent value="preferences">
          <PreferencesForm />
        </TabsContent>

        <TabsContent value="danger">
          <DangerZone />
        </TabsContent>
      </Tabs>
    </div>
  )
}
