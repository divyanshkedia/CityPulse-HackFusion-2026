'use client'

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { CityAnalytics } from '@/lib/types'

interface IncidentChartsProps {
  analytics: CityAnalytics
}

export function TimeSeriesChart({ analytics }: IncidentChartsProps) {
  return (
    <div className="w-full h-80">
      <h3 className="text-lg font-semibold text-foreground mb-4">Incident Trends (7 Days)</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={analytics.timeSeriesData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="count" stroke="#FF6B3D" name="Reported" strokeWidth={2} />
          <Line type="monotone" dataKey="resolved" stroke="#20B997" name="Resolved" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function CategoryDistributionChart({ analytics }: IncidentChartsProps) {
  const data = Object.entries(analytics.categoryDistribution).map(([category, count]) => ({
    name: category.replace('_', ' '),
    value: count,
  }))

  const colors = ['#FF6B3D', '#20B997', '#FFB74D', '#64B5F6', '#81C784', '#E57373', '#9575CD']

  return (
    <div className="w-full h-80">
      <h3 className="text-lg font-semibold text-foreground mb-4">Incidents by Category</h3>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={120} fill="#8884d8" dataKey="value">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export function SeverityDistributionChart({ analytics }: IncidentChartsProps) {
  const data = Object.entries(analytics.severityDistribution)
    .map(([severity, count]) => ({
      severity: severity.charAt(0).toUpperCase() + severity.slice(1),
      count,
    }))
    .sort((a, b) => {
      const order = ['Critical', 'High', 'Medium', 'Low']
      return order.indexOf(a.severity) - order.indexOf(b.severity)
    })

  return (
    <div className="w-full h-80">
      <h3 className="text-lg font-semibold text-foreground mb-4">Severity Distribution</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="severity" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="count" fill="#FF6B3D" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ComparisonChart({ analytics }: IncidentChartsProps) {
  const data = [
    {
      name: 'Total',
      value: analytics.totalIncidents,
    },
    {
      name: 'Critical Areas',
      value: analytics.criticalAreas.length,
    },
    {
      name: 'Avg Resolution (hrs)',
      value: Math.round(analytics.averageResolutionTime),
    },
  ]

  return (
    <div className="w-full h-80">
      <h3 className="text-lg font-semibold text-foreground mb-4">Key Metrics</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis dataKey="name" type="category" width={120} />
          <Tooltip />
          <Bar dataKey="value" fill="#20B997" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
