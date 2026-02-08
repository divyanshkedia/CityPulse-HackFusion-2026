'use client'

import { Button } from "@/components/ui/button"
import { ArrowRight, CheckCircle, Zap, Shield, Users } from "lucide-react"

interface LandingPageProps {
  onGetStarted: () => void
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-emerald-50">
      {/* Header */}
      <header className="px-6 py-4 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-2 rounded-full">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <span className="text-xl font-bold text-gray-900">CityPulse</span>
        </div>
        <Button onClick={onGetStarted} variant="outline" className="hidden sm:flex">
          Login
        </Button>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-16 md:py-24 text-center">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-gray-900 mb-6">
          Smarter Cities, <br/>
          <span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-amber-600">
            Faster Solutions.
          </span>
        </h1>
        <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Report potholes, broken streetlights, and other civic issues in seconds. 
          CityPulse connects citizens directly with city officials for rapid resolution.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={onGetStarted} size="lg" className="h-12 px-8 text-lg shadow-lg shadow-primary/25">
            Get Started <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 text-left">
          <FeatureCard 
            icon={<Zap className="h-6 w-6 text-amber-500" />}
            title="Instant Reporting"
            desc="Snap a photo, add a location, and submit. Our AI handles the rest."
          />
          <FeatureCard 
            icon={<Shield className="h-6 w-6 text-emerald-600" />}
            title="Verified Action"
            desc="Real-time updates as officials acknowledge and resolve your reports."
          />
          <FeatureCard 
            icon={<Users className="h-6 w-6 text-blue-600" />}
            title="Community Driven"
            desc="See what's happening in your neighborhood and support local fixes."
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-gray-500 border-t border-gray-100 mt-12">
        © 2024 CityPulse. Building better cities together.
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="mb-4 bg-gray-50 w-12 h-12 rounded-lg flex items-center justify-center">
        {icon}
      </div>
      <h3 className="font-bold text-lg mb-2 text-gray-900">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{desc}</p>
    </div>
  )
}