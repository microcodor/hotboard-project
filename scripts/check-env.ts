/**
 * 开发环境检查脚本
 * 检查必要的环境变量和依赖
 */

interface CheckResult {
  name: string
  status: 'ok' | 'warning' | 'error'
  message: string
}

function checkEnvVar(name: string, required: boolean = true): CheckResult {
  const value = process.env[name]
  
  if (!value) {
    return {
      name,
      status: required ? 'error' : 'warning',
      message: required ? '未设置（必需）' : '未设置（可选）'
    }
  }
  
  return {
    name,
    status: 'ok',
    message: '已设置'
  }
}

async function checkDevelopmentEnvironment(): Promise<CheckResult[]> {
  const results: CheckResult[] = []

  console.log('=== HotBoard 开发环境检查 ===\n')

  // 检查 Node.js 版本
  const nodeVersion = process.version
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0])
  results.push({
    name: 'Node.js 版本',
    status: majorVersion >= 18 ? 'ok' : 'error',
    message: `${nodeVersion} ${majorVersion >= 18 ? '(满足要求)' : '(需要 18.x 或更高)'}`
  })

  // 检查必需的环境变量
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ]

  const optionalEnvVars = [
    'SUPABASE_SERVICE_ROLE_KEY',
    'TOPHUB_API_KEY',
  ]

  for (const varName of requiredEnvVars) {
    results.push(checkEnvVar(varName, true))
  }

  for (const varName of optionalEnvVars) {
    results.push(checkEnvVar(varName, false))
  }

  // 打印结果
  console.log('检查结果:')
  console.log('-'.repeat(50))
  
  for (const result of results) {
    const icon = result.status === 'ok' ? '✓' : result.status === 'warning' ? '⚠' : '✗'
    console.log(`${icon} ${result.name}: ${result.message}`)
  }
  
  console.log('-'.repeat(50))
  
  const hasError = results.some(r => r.status === 'error')
  const hasWarning = results.some(r => r.status === 'warning')
  
  if (hasError) {
    console.log('\n❌ 环境检查失败，请修复上述错误后重试')
  } else if (hasWarning) {
    console.log('\n⚠️ 环境检查通过，但有警告项')
  } else {
    console.log('\n✅ 环境检查通过！')
  }

  return results
}

// 如果直接运行此脚本
if (require.main === module) {
  checkDevelopmentEnvironment()
    .then((results) => {
      const hasError = results.some(r => r.status === 'error')
      process.exit(hasError ? 1 : 0)
    })
    .catch((error) => {
      console.error('检查失败:', error)
      process.exit(1)
    })
}

export { checkDevelopmentEnvironment }
