'use client'

import { useState } from 'react'
import { User } from '@/lib/types'
import CitizenPortalEnhanced from '@/components/portals/citizen-portal-enhanced'
import FieldStaffEnhanced from '@/components/portals/field-staff-enhanced'
import OfficerDashboard from '@/components/portals/officer-dashboard'
import AdminDashboardEnhanced from '@/components/portals/admin-dashboard-enhanced'
import NavigationBar from '@/components/navigation/navigation-bar'

interface DashboardProps {
  currentUser: User
  onLogout: () => void
}

export default function Dashboard({ currentUser, onLogout }: DashboardProps) {
  const [currentView, setCurrentView] = useState('home')

  const renderContent = () => {
    switch (currentUser.role) {
      case 'citizen':
        return <CitizenPortalEnhanced currentUser={currentUser} onNavigate={setCurrentView} currentView={currentView} />
      case 'field_staff':
        return <FieldStaffEnhanced currentUser={currentUser} onLogout={onLogout} />
      case 'officer':
        return <OfficerDashboard currentUser={currentUser} onNavigate={setCurrentView} currentView={currentView} />
      case 'admin':
        return <AdminDashboardEnhanced currentUser={currentUser} onLogout={onLogout} />
      default:
        return <CitizenPortalEnhanced currentUser={currentUser} onNavigate={setCurrentView} currentView={currentView} />
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <NavigationBar currentUser={currentUser} onLogout={onLogout} onNavigate={setCurrentView} />
      <main className="flex-1 overflow-hidden">{renderContent()}</main>
    </div>
  )
}
