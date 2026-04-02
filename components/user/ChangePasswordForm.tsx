/**
 * 修改密码表单
 */
'use client'
import { useState } from 'react'
import { Loader2, Eye, EyeOff, Lock } from 'lucide-react'

export default function ChangePasswordForm() {
  const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirm: '' })
  const [show, setShow] = useState({ old: false, new: false, confirm: false })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.newPassword !== form.confirm) {
      setMsg({ type: 'err', text: '两次输入的新密码不一致' }); return
    }
    if (form.newPassword.length < 6) {
      setMsg({ type: 'err', text: '新密码至少6位' }); return
    }
    setSaving(true); setMsg(null)
    try {
      const res = await fetch('/api/user/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword: form.oldPassword, newPassword: form.newPassword }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setMsg({ type: 'ok', text: '密码修改成功' })
      setForm({ oldPassword: '', newPassword: '', confirm: '' })
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message })
    } finally {
      setSaving(false)
    }
  }

  const Field = ({ label, field, showKey }: { label: string; field: keyof typeof form; showKey: keyof typeof show }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type={show[showKey] ? 'text' : 'password'}
          value={form[field]}
          onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 pl-10 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
        />
        <button type="button" onClick={() => setShow(prev => ({ ...prev, [showKey]: !prev[showKey] }))}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          {show[showKey] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
      <h3 className="font-semibold text-gray-900 dark:text-white">修改密码</h3>
      <Field label="当前密码" field="oldPassword" showKey="old" />
      <Field label="新密码" field="newPassword" showKey="new" />
      <Field label="确认新密码" field="confirm" showKey="confirm" />
      {msg && <p className={`text-sm ${msg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</p>}
      <button type="submit" disabled={saving}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        修改密码
      </button>
    </form>
  )
}
