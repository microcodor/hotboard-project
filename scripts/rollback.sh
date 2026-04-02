#!/bin/bash

# ========================================
# HotBoard 生产环境回滚脚本
# ========================================
# 用法: ./scripts/rollback.sh [deployment-url|commit-sha]
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

# 获取最近的部署列表
list_recent_deployments() {
    log_info "Fetching recent deployments..."
    
    # 使用 Vercel CLI 列出部署
    vercel list --yes 2>&1 | head -n 20
}

# 回滚到指定部署
rollback_to_deployment() {
    local target=$1
    
    log_info "Rolling back to: $target"
    
    # 检查是否是部署 URL
    if [[ $target == *"vercel.app"* ]]; then
        # 回滚到指定部署
        local rollback_output=$(vercel rollback $target --yes 2>&1)
        echo "$rollback_output"
    else
        log_error "Invalid deployment target. Please provide a valid deployment URL."
        exit 1
    fi
}

# 回滚到上一个部署
rollback_to_previous() {
    log_info "Rolling back to previous deployment..."
    
    # 获取最近的部署
    local deployments=$(vercel list --yes 2>&1)
    local previous_deployment=$(echo "$deployments" | sed -n '3p' | awk '{print $2}')
    
    if [ -z "$previous_deployment" ]; then
        log_error "Could not find previous deployment"
        exit 1
    fi
    
    log_info "Previous deployment: $previous_deployment"
    rollback_to_deployment "$previous_deployment"
}

# 主函数
main() {
    local target=$1
    
    echo "========================================"
    echo "  HotBoard Rollback Script"
    echo "  Time: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "========================================"
    echo
    
    # 检查命令
    check_command vercel
    
    # 如果没有提供目标，显示最近的部署
    if [ -z "$target" ]; then
        log_warning "No target specified. Showing recent deployments:"
        echo
        list_recent_deployments
        echo
        log_info "Usage: $0 [deployment-url]"
        log_info "Example: $0 https://hotboard-xxx.vercel.app"
        exit 0
    fi
    
    # 确认回滚
    log_warning "You are about to rollback to: $target"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Rollback cancelled"
        exit 0
    fi
    
    # 执行回滚
    rollback_to_deployment "$target"
    
    echo
    echo "========================================"
    log_success "Rollback completed successfully!"
    echo "========================================"
}

# 运行主函数
main "$@"
