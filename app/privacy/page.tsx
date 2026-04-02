import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '隐私政策 - HotBoard',
  description: 'HotBoard 隐私政策',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">H</div>
            <span className="font-bold text-gray-900">HotBoard</span>
          </Link>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">← 返回首页</Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">隐私政策</h1>
        <p className="text-sm text-gray-500 mb-8">最后更新：2026年3月31日</p>

        <div className="bg-white rounded-2xl border border-gray-200 p-8 space-y-8">
          {[
            {
              title: '1. 信息收集',
              content: `HotBoard 严格保护用户隐私。我们收集的信息仅用于服务提供：

• 账号信息（邮箱、昵称、头像）：用于用户身份识别和账户管理
• 浏览历史：记录用户浏览的热榜节点，提供历史记录功能
• 收藏记录：用于保存用户的收藏内容
• API 使用量：用于统计配额消耗，实施限流策略

我们不会将用户信息出售、出租或提供给任何第三方。`,
            },
            {
              title: '2. 数据存储',
              content: `• 所有用户数据存储在中华人民共和国境内的服务器上
• 密码使用 bcrypt 算法加密存储，即使数据库泄露也无法还原明文密码
• API Key 仅在创建时明文显示一次，之后仅显示脱敏值
• 用户可随时联系删除账户及全部个人数据`,
            },
            {
              title: '3. Cookie 使用',
              content: `我们使用以下 Cookie：

• 认证 Cookie（httpOnly）：登录成功后设置，有效期 30 天，用于保持登录状态
• 这些 Cookie 仅用于身份验证，不会用于追踪用户行为
• 你可以在浏览器中清除 Cookie，这将退出登录状态`,
            },
            {
              title: '4. 第三方服务',
              content: `HotBoard 不会向任何第三方服务共享用户个人信息。

热榜数据来源于公开可访问的互联网内容，我们仅做聚合展示，不对原始内容负责。`,
            },
            {
              title: '5. 数据安全',
              content: `我们采取了以下安全措施：

• 全站 HTTPS 加密传输
• PostgreSQL 数据库存储，配合强密码策略
• API 请求限流，防止暴力破解
• 定期备份数据`,
            },
            {
              title: '6. 你的权利',
              content: `作为 HotBoard 用户，你有权：

• 访问你的个人数据
• 修改你的个人资料
• 删除你的账户及全部数据
• 注销后你的邮箱将被永久删除，无法恢复

如需行使上述权利，请访问「用户中心 → 设置」页面进行操作。`,
            },
            {
              title: '7. 联系我们',
              content: `如果你对 HotBoard 的隐私政策有任何疑问，请通过以下方式联系我们：

• 邮箱：admin@hotboard.com
• GitHub Issues：https://github.com/hotboard/hotboard

我们将在 7 个工作日内回复。`,
            },
          ].map(section => (
            <div key={section.title}>
              <h2 className="text-lg font-bold text-gray-900 mb-3">{section.title}</h2>
              <pre className="text-sm text-gray-600 whitespace-pre-wrap font-sans leading-relaxed">{section.content.trim()}</pre>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">← 返回首页</Link>
        </div>
      </div>
    </div>
  )
}
