#!/bin/bash

# ========================================
# HotBoard 生产环境部署脚本
# ========================================
# 用法: ./scripts/deploy.sh [production|preview]
# 要求: Vercel CLI 已安装并登录

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查命令是否存在
check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "$1 is not installed. Please install it first."
        exit 1
    fi
}

# 检查环境变量
check_env_vars() {
    local missing_vars=()
    
    # 必需的环境变量
    local required_vars=(
        "NEXT_PUBLIC_SUPABASE_URL"
        "NEXT_PUBLIC_SUPABASE_ANON_KEY"
        "SUPABASE_SERVICE_ROLE_KEY"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        log_error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        log_info "Please set these variables in .env.production or Vercel Dashboard"
        exit 1
    fi
}

# 部署前检查
pre_deploy_checks() {
    log_info "Running pre-deployment checks..."
    
    # 检查 Node.js
    check_command node
    local node_version=$(node -v)
    log_info "Node.js version: $node_version"
    
    # 检查 npm
    check_command npm
    local npm_version=$(npm -v)
    log_info "npm version: $npm_version"
    
    # 检查 Vercel CLI
    check_command vercel
    local vercel_version=$(vercel --version 2>&1 | head -n1)
    log_info "Vercel CLI version: $vercel_version"
    
    # 检查 git
    check_command git
    local git_branch=$(git branch --show-current)
    log_info "Current git branch: $git_branch"
    
    # 检查是否有未提交的更改
    if ! git diff-index --quiet HEAD --; then
        log_warning "You have uncommitted changes. Please commit or stash them first."
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    # 检查环境变量
    check_env_vars
    
    log_success "Pre-deployment checks passed"
}

# 运行测试
run_tests() {
    log_info "Running tests..."
    
    npm run lint
    npm run type-check
    
    if [ -f "jest.config.js" ] || [ -f "jest.config.ts" ]; then
        npm run test
    fi
    
    log_success "Tests passed"
}

# 构建项目
build_project() {
    log_info "Building project..."
    
    npm ci
    npm run build
    
    log_success "Build completed"
}

# 部署到 Vercel
deploy_to_vercel() {
    local environment=$1
    local deploy_args=""
    
    log_info "Deploying to Vercel ($environment)..."
    
    if [ "$environment" = "production" ]; then
        deploy_args="--prod"
    fi
    
    # 部署
    local deploy_output=$(vercel $deploy_args --yes 2>&1)
    local deploy_url=$(echo "$deploy_output" | grep -oE 'https://[^ ]+\.vercel\.app' | tail -n1)
    
    if [ -z "$deploy_url" ]; then
        log_error "Deployment failed or URL not found"
        log_error "$deploy_output"
        exit 1
    fi
    
    log_success "Deployment completed!"
    log_info "URL: $deploy_url"
    
    # 输出到环境变量供后续步骤使用
    echo "DEPLOY_URL=$deploy_url" >> $GITHUB_ENV 2>/dev/null || true
}

# 部署后验证
post_deploy_validation() {
    local deploy_url=$1
    
    log_info "Running post-deployment validation..."
    
    # 等待部署完成
    sleep 10
    
    # 检查网站是否可访问
    local http_status=$(curl -s -o /dev/null -w "%{http_code}" "$deploy_url" || echo "000")
    
    if [ "$http_status" = "200" ] || [ "$http_status" = "302" ]; then
        log_success "Website is accessible (HTTP $http_status)"
    else
        log_warning "Website returned HTTP $http_status"
    fi
    
    # 检查 API 健康端点
    local health_status=$(curl -s -o /dev/null -w "%{http_code}" "$deploy_url/api/health" || echo "000")
    
    if [ "$health_status" = "200" ]; then
        log_success "API health check passed"
    else
        log_warning "API health check returned HTTP $health_status"
    fi
}

# 主函数
main() {
    local environment=${1:-preview}
    
    echo "========================================"
    echo "  HotBoard Deployment Script"
    echo "  Environment: $environment"
    echo "  Time: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "========================================"
    echo
    
    # 检查环境参数
    if [ "$environment" != "production" ] && [ "$environment" != "preview" ]; then
        log_error "Invalid environment: $environment"
        log_info "Usage: $0 [production|preview]"
        exit 1
    fi
    
    # 生产环境额外确认
    if [ "$environment" = "production" ]; then
        log_warning "You are about to deploy to PRODUCTION!"
        read -p "Are you sure? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Deployment cancelled"
            exit 0
        fi
    fi
    
    # 执行部署流程
    pre_deploy_checks
    run_tests
    build_project
    
    local deploy_url=$(deploy_to_vercel "$environment")
    post_deploy_validation "$deploy_url"
    
    echo
    echo "========================================"
    log_success "Deployment completed successfully!"
    echo "========================================"
}

# 运行主函数
main "$@"
