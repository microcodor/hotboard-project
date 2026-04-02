/**
 * 头像上传组件
 */
'use client'
import { useRef, useState } from 'react'
import { useUserProfile } from '@/hooks/useUserProfile'
import { User, Upload, Loader2 } from 'lucide-react'
import Image from 'next/image'

export default function AvatarUpload() {
  const { profile, uploadAvatar } = useUserProfile()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setMsg({ type: 'err', text: '图片不能超过 2MB' }); return }
    setUploading(true); setMsg(null)
    try {
      await uploadAvatar(file)
      setMsg({ type: 'ok', text: '头像更新成功' })
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message || '上传失败' })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex items-center gap-6 bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
      <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0">
        {profile?.avatar_url ? (
          <Image src={profile.avatar_url} alt="头像" fill className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <User className="w-10 h-10 text-gray-400" />
          </div>
        )}
      </div>
      <div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? '上传中...' : '更换头像'}
        </button>
        <p className="text-xs text-gray-400 mt-2">支持 JPG、PNG，最大 2MB</p>
        {msg && <p className={`text-xs mt-1 ${msg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</p>}
      </div>
    </div>
  )
}
