module.exports = {
  apps: [{
    name: 'hotboard',
    script: 'npm',
    args: 'run dev',
    cwd: '/home/openclaw1/hotboard-project',
    env: {
      NEXT_PUBLIC_INTERNAL_TOKEN: 'hotboard-internal-2026-secure-token',
      INTERNAL_TOKEN: 'hotboard-internal-2026-secure-token',
    }
  }]
}
