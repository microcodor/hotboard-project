/**
 * 数据库种子数据脚本
 * 用于初始化开发环境数据
 */

import { supabase } from '@/lib/supabase'

// 示例榜单数据
const sampleNodes = [
  {
    hashid: 'baidu',
    name: '百度热搜',
    display: '百度实时热点',
    cid: 5,
    status: 'active',
    sort_order: 1
  },
  {
    hashid: 'weibo',
    name: '微博热搜',
    display: '微博热门话题',
    cid: 2,
    status: 'active',
    sort_order: 2
  },
  {
    hashid: 'zhihu',
    name: '知乎热榜',
    display: '知乎热门问答',
    cid: 3,
    status: 'active',
    sort_order: 3
  },
  {
    hashid: 'douyin',
    name: '抖音热点',
    display: '抖音热门视频',
    cid: 2,
    status: 'active',
    sort_order: 4
  },
  {
    hashid: 'bilibili',
    name: 'B站热门',
    display: 'B站综合热门',
    cid: 2,
    status: 'active',
    sort_order: 5
  },
  {
    hashid: 'github',
    name: 'GitHub Trending',
    display: 'GitHub 今日热榜',
    cid: 7,
    status: 'active',
    sort_order: 6
  },
  {
    hashid: 'v2ex',
    name: 'V2EX',
    display: 'V2EX 最新主题',
    cid: 7,
    status: 'active',
    sort_order: 7
  },
  {
    hashid: 'ithome',
    name: 'IT之家',
    display: 'IT之家热门资讯',
    cid: 1,
    status: 'active',
    sort_order: 8
  }
]

// 示例热点数据
const sampleItems = [
  {
    title: '示例热点标题 1',
    description: '这是示例热点的描述内容',
    url: 'https://example.com/1',
    thumbnail: '',
    rank: 1
  },
  {
    title: '示例热点标题 2',
    description: '这是示例热点的描述内容',
    url: 'https://example.com/2',
    thumbnail: '',
    rank: 2
  },
  {
    title: '示例热点标题 3',
    description: '这是示例热点的描述内容',
    url: 'https://example.com/3',
    thumbnail: '',
    rank: 3
  }
]

async function seedDatabase() {
  console.log('开始插入种子数据...')

  try {
    // 插入榜单
    const { error: nodesError } = await supabase
      .from('nodes')
      .upsert(sampleNodes, { onConflict: 'hashid' })

    if (nodesError) {
      console.error('插入榜单失败:', nodesError)
      return
    }

    console.log(`✓ 插入 ${sampleNodes.length} 个榜单`)

    // 为每个榜单插入示例热点
    for (const node of sampleNodes) {
      const items = sampleItems.map((item) => ({
        ...item,
        node_hashid: node.hashid
      }))

      const { error: itemsError } = await supabase
        .from('node_items')
        .insert(items)

      if (itemsError) {
        console.error(`插入 ${node.name} 热点失败:`, itemsError)
      } else {
        console.log(`✓ 插入 ${node.name} 的 ${items.length} 条热点`)
      }
    }

    console.log('\n种子数据插入完成！')
  } catch (error) {
    console.error('种子数据插入失败:', error)
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('执行失败:', error)
      process.exit(1)
    })
}

export { seedDatabase }
