'use client'

import { useState } from 'react'
import { Ticket } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { MapPin, TrendingUp } from 'lucide-react'

interface IncidentMapProps {
  incidents?: Ticket[]
  tickets?: Ticket[]
  onTicketClick?: (ticket: Ticket) => void
  height?: string
}

export default function IncidentMap({ incidents, tickets, onTicketClick, height = 'h-96' }: IncidentMapProps) {
  const data = incidents || tickets || []
  const [heatmapMode, setHeatmapMode] = useState(false)

  // Create a simple map visualization using divs instead of a full map library
  // This shows incident density and locations in a grid format

  const cityBounds = {
    minLat: 40.7,
    maxLat: 40.72,
    minLng: -74.01,
    maxLng: -73.99,
  }

  const latRange = cityBounds.maxLat - cityBounds.minLat
  const lngRange = cityBounds.maxLng - cityBounds.minLng

  // Calculate heatmap density
  const getDensityAtPoint = (lat: number, lng: number) => {
    let count = 0
    const radius = 0.02

    data.forEach((ticket) => {
      const dist = Math.sqrt(Math.pow(ticket.latitude - lat, 2) + Math.pow(ticket.longitude - lng, 2))
      if (dist < radius) count++
    })

    return Math.min(1, count / Math.max(5, data.length / 5))
  }

  const getHeatmapColor = (density: number) => {
    if (density === 0) return 'rgba(32, 185, 151, 0.1)'
    if (density < 0.2) return 'rgba(32, 185, 151, 0.3)'
    if (density < 0.4) return 'rgba(255, 193, 7, 0.4)'
    if (density < 0.6) return 'rgba(255, 152, 0, 0.5)'
    if (density < 0.8) return 'rgba(255, 87, 34, 0.6)'
    return 'rgba(244, 67, 54, 0.8)'
  }

  const criticalCount = data.filter((t) => t.severity === 'critical').length
  const highCount = data.filter((t) => t.severity === 'high').length

  return (
    <div className="w-full">
      {/* View Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setHeatmapMode(false)}
          className={`px-4 py-2 rounded font-semibold transition ${
            !heatmapMode ? 'bg-primary text-primary-foreground' : 'bg-white text-foreground border border-muted'
          }`}
        >
          Markers
        </button>
        <button
          onClick={() => setHeatmapMode(true)}
          className={`px-4 py-2 rounded font-semibold transition flex items-center gap-2 ${
            heatmapMode ? 'bg-primary text-primary-foreground' : 'bg-white text-foreground border border-muted'
          }`}
        >
          <TrendingUp className="w-4 h-4" /> Heatmap
        </button>
      </div>

      <Card className={`${height} w-full relative overflow-hidden bg-gradient-to-br from-emerald-50 to-blue-100 p-4`}>
        {/* Map Grid Background */}
        <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.1 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <line key={`v-${i}`} x1={`${(i + 1) * 20}%`} y1="0" x2={`${(i + 1) * 20}%`} y2="100%" stroke="gray" strokeWidth="1" />
          ))}
          {Array.from({ length: 5 }).map((_, i) => (
            <line key={`h-${i}`} x1="0" y1={`${(i + 1) * 20}%`} x2="100%" y2={`${(i + 1) * 20}%`} stroke="gray" strokeWidth="1" />
          ))}
        </svg>

        {/* Heatmap Layer */}
        {heatmapMode && (
          <div className="absolute inset-0">
            {Array.from({ length: 12 }).map((_, i) =>
              Array.from({ length: 12 }).map((_, j) => {
                const lat = cityBounds.minLat + (i / 12) * latRange
                const lng = cityBounds.minLng + (j / 12) * lngRange
                const density = getDensityAtPoint(lat, lng)

                return (
                  <div
                    key={`${i}-${j}`}
                    className="absolute"
                    style={{
                      left: `${(j / 12) * 100}%`,
                      top: `${(i / 12) * 100}%`,
                      width: `${100 / 12}%`,
                      height: `${100 / 12}%`,
                      backgroundColor: getHeatmapColor(density),
                      transition: 'background-color 0.3s ease',
                    }}
                  />
                )
              }),
            )}
          </div>
        )}

        {/* Incident Markers */}
        {!heatmapMode && (
          <div className="absolute inset-0 w-full h-full">
            {data.map((ticket) => {
              const x = ((ticket.longitude - cityBounds.minLng) / lngRange) * 100
              const y = ((cityBounds.maxLat - ticket.latitude) / latRange) * 100

              const sizeMap = {
                critical: 'w-5 h-5',
                high: 'w-4 h-4',
                medium: 'w-3 h-3',
                low: 'w-2 h-2',
              }

              const colorMap = {
                critical: 'bg-red-600',
                high: 'bg-orange-500',
                medium: 'bg-yellow-500',
                low: 'bg-emerald-500',
              }

              return (
                <div
                  key={ticket.id}
                  className={`absolute ${sizeMap[ticket.severity]} ${colorMap[ticket.severity]} rounded-full transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-150 shadow-lg ring-2 ring-white`}
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    zIndex: ticket.severity === 'critical' ? 10 : 5,
                  }}
                  onClick={() => onTicketClick?.(ticket)}
                  title={ticket.title}
                >
                  <div className="absolute inset-0 rounded-full bg-current opacity-20 animate-pulse"></div>
                </div>
              )
            })}
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-20 bg-white rounded-lg shadow-md p-3">
          <p className="text-xs font-semibold text-foreground mb-2">Severity Levels</p>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-600 rounded-full"></div>
              <span>Critical ({criticalCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <span>High ({highCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-yellow-500 rounded-full"></div>
              <span>Medium</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div>
              <span>Low</span>
            </div>
          </div>
        </div>

        {/* Info Card */}
        {data.length > 0 && (
          <div className="absolute top-4 right-4 z-20 bg-white rounded-lg shadow-md p-3">
            <p className="text-xs font-semibold text-foreground">Active Incidents</p>
            <p className="text-2xl font-bold text-primary">{data.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{criticalCount} critical</p>
          </div>
        )}

        {/* Empty State */}
        {data.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No incidents to display</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
