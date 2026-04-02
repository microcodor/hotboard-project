/**
 * 数据状态管理
 */

import { create } from 'zustand'

interface Node {
  hashid: string
  name: string
  display?: string
  logo?: string
  cid: number
}

interface DataState {
  nodes: Node[]
  selectedCid: number | null
  lastSyncTime: Date | null
  
  setNodes: (nodes: Node[]) => void
  setSelectedCid: (cid: number | null) => void
  setLastSyncTime: (time: Date) => void
  clearData: () => void
}

export const useDataStore = create<DataState>((set) => ({
  nodes: [],
  selectedCid: null,
  lastSyncTime: null,

  setNodes: (nodes) => set({ nodes, lastSyncTime: new Date() }),
  setSelectedCid: (cid) => set({ selectedCid: cid }),
  setLastSyncTime: (time) => set({ lastSyncTime: time }),
  clearData: () => set({ nodes: [], lastSyncTime: null }),
}))
