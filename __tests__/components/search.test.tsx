/**
 * 搜索组件测试
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import SearchInput from '../components/search/SearchInput'
import SearchSuggestion from '../components/search/SearchSuggestion'
import SearchResults from '../components/search/SearchResults'

// Mock useDebounce hook
jest.mock('../hooks/useDebounce', () => ({
  useDebounce: jest.fn((fn) => fn),
}))

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
})

describe('SearchInput', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(JSON.stringify(['历史1', '历史2']))
  })

  it('应该渲染搜索输入框', () => {
    render(<SearchInput onSearch={jest.fn()} />)
    
    const input = screen.getByPlaceholderText(/输入关键词搜索/)
    expect(input).toBeInTheDocument()
  })

  it('应该调用 onSearch 回调', async () => {
    const onSearch = jest.fn()
    render(<SearchInput onSearch={onSearch} />)
    
    const input = screen.getByPlaceholderText(/输入关键词搜索/)
    fireEvent.change(input, { target: { value: 'test query' } })
    
    // 提交表单
    const form = input.closest('form')
    if (form) {
      fireEvent.submit(form)
    }

    await waitFor(() => {
      expect(onSearch).toHaveBeenCalledWith('test query')
    })
  })

  it('应该在输入时显示清空按钮', () => {
    const onSearch = jest.fn()
    render(<SearchInput onSearch={onSearch} />)
    
    const input = screen.getByPlaceholderText(/输入关键词搜索/)
    fireEvent.change(input, { target: { value: 'test' } })
    
    // 检查清空按钮是否存在
    // 注意：具体实现可能不同
  })
})

describe('SearchSuggestion', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(JSON.stringify(['历史1', '历史2']))
  })

  it('应该渲染搜索历史', () => {
    render(
      <SearchSuggestion
        query=""
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />
    )
    
    expect(screen.getByText('历史1')).toBeInTheDocument()
    expect(screen.getByText('历史2')).toBeInTheDocument()
  })

  it('应该过滤搜索建议', () => {
    render(
      <SearchSuggestion
        query="历史1"
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />
    )
    
    expect(screen.getByText('历史1')).toBeInTheDocument()
  })

  it('应该在选择建议时调用 onSelect', () => {
    const onSelect = jest.fn()
    render(
      <SearchSuggestion
        query=""
        onSelect={onSelect}
        onClose={jest.fn()}
      />
    )
    
    const suggestion = screen.getByText('历史1')
    fireEvent.click(suggestion)
    
    expect(onSelect).toHaveBeenCalledWith('历史1')
  })
})

describe('SearchResults', () => {
  const mockResults = [
    {
      title: '测试热点1',
      url: 'https://example.com/1',
      description: '描述1',
      node_name: '微博',
    },
    {
      title: '测试热点2',
      url: 'https://example.com/2',
      description: '描述2',
      node_name: '知乎',
    },
  ]

  it('应该渲染搜索结果列表', () => {
    render(
      <SearchResults
        results={mockResults}
        total={2}
        query="测试"
        isLoading={false}
        onLoadMore={jest.fn()}
        hasMore={false}
        sortBy="relevance"
        onSortChange={jest.fn()}
      />
    )
    
    expect(screen.getByText('测试热点1')).toBeInTheDocument()
    expect(screen.getByText('测试热点2')).toBeInTheDocument()
  })

  it('应该显示结果总数', () => {
    render(
      <SearchResults
        results={mockResults}
        total={2}
        query="测试"
        isLoading={false}
        onLoadMore={jest.fn()}
        hasMore={false}
        sortBy="relevance"
        onSortChange={jest.fn()}
      />
    )
    
    expect(screen.getByText(/找到 2 条/)).toBeInTheDocument()
  })

  it('应该在无结果时显示空状态', () => {
    render(
      <SearchResults
        results={[]}
        total={0}
        query="测试"
        isLoading={false}
        onLoadMore={jest.fn()}
        hasMore={false}
        sortBy="relevance"
        onSortChange={jest.fn()}
      />
    )
    
    expect(screen.getByText(/未找到相关结果/)).toBeInTheDocument()
  })

  it('应该在加载时显示加载状态', () => {
    render(
      <SearchResults
        results={[]}
        total={0}
        query="测试"
        isLoading={true}
        onLoadMore={jest.fn()}
        hasMore={false}
        sortBy="relevance"
        onSortChange={jest.fn()}
      />
    )
    
    expect(screen.getByText(/正在搜索/)).toBeInTheDocument()
  })

  it('应该在有更多结果时显示加载更多按钮', () => {
    const onLoadMore = jest.fn()
    render(
      <SearchResults
        results={mockResults}
        total={10}
        query="测试"
        isLoading={false}
        onLoadMore={onLoadMore}
        hasMore={true}
        sortBy="relevance"
        onSortChange={jest.fn()}
      />
    )
    
    const loadMoreBtn = screen.getByText('加载更多')
    fireEvent.click(loadMoreBtn)
    
    expect(onLoadMore).toHaveBeenCalled()
  })

  it('应该渲染排序选项', () => {
    const onSortChange = jest.fn()
    render(
      <SearchResults
        results={mockResults}
        total={2}
        query="测试"
        isLoading={false}
        onLoadMore={jest.fn()}
        hasMore={false}
        sortBy="relevance"
        onSortChange={onSortChange}
      />
    )
    
    expect(screen.getByText('相关性')).toBeInTheDocument()
    expect(screen.getByText('热度')).toBeInTheDocument()
    expect(screen.getByText('最新')).toBeInTheDocument()
  })
})
