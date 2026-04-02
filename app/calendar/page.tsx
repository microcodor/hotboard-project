'use client'

import { useState } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface HistoryItem {
  id: string
  title: string
  source: string
  date: Date
}

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [historyItems] = useState<HistoryItem[]>([])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">热点日历</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 日历 */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>选择日期</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
              />
            </CardContent>
          </Card>

          {/* 历史热点 */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>
                {selectedDate?.toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })} 的热点
              </CardTitle>
            </CardHeader>
            <CardContent>
              {historyItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  暂无该日期的历史热点数据
                </div>
              ) : (
                <div className="space-y-4">
                  {historyItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                    >
                      <h3 className="font-medium text-gray-900">{item.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">来源: {item.source}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
