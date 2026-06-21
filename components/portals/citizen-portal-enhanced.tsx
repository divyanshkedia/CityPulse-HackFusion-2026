'use client'

import React, { useState, useEffect, useRef } from 'react'
import { User, Ticket, IncidentCategory, Severity, CATEGORY_LABELS } from '@/lib/types'
import { getSupabase } from '@/lib/supabase'
import { createTicket, fetchTickets } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import TicketCard from '@/components/tickets/ticket-card'
import IncidentMap from '@/components/map/incident-map'
import { detectDuplicates } from '@/lib/duplicate-detection'
import { calculateCityAnalytics } from '@/lib/analytics'
import { analyzePotholeImage } from '@/lib/ml-api'
import { submitIncidentWithML } from '@/lib/ml-integration';
import { TimeSeriesChart, CategoryDistributionChart, SeverityDistributionChart } from '@/components/charts/incident-charts'
import { 
  MapPin, 
  Send, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  RefreshCw, 
  LogOut, 
  Camera, 
  X, 
  Brain,
  Loader2,
  Sparkles,
  AlertTriangle,
  BarChart3,
  Zap,
  UploadCloud,
  Home,
  FileText,
  ChevronLeft,
  Navigation,
  Map,
  AlertOctagon
} from 'lucide-react'
import AuditTimeline from '@/components/tickets/audit-timeline'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { calculateDistance } from '@/lib/utils/geoUtils'
const supabase = getSupabase()
interface CitizenPortalEnhancedProps {
  currentUser: User
  onNavigate: (view: string) => void
  currentView: string
  onLogout: () => void
}

export default function CitizenPortalEnhanced({ currentUser, onNavigate, currentView, onLogout }: CitizenPortalEnhancedProps) {
  // 1. STATE: Live data from Supabase
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [duplicateMatches, setDuplicateMatches] = useState<any[]>([])
  
  // Camera & Image State
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [isCameraOpen, setIsCameraOpen] = useState(false)

  // ML Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [mlAnalysis, setMlAnalysis] = useState<{
    severity: Severity;
    risk_score: number;
    num_potholes: number;
    coverage_ratio: number;
    lane_impact_ratio: number;
    annotated_image?: string;
  } | null>(null)
  const [showMlAnalysis, setShowMlAnalysis] = useState(false)

  // Geographic Duplicate Detection State
  const [nearbyIncidents, setNearbyIncidents] = useState<Ticket[]>([])
  const [showNearbyDialog, setShowNearbyDialog] = useState(false)
  const [duplicateRadius, setDuplicateRadius] = useState<number>(100) // meters

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'pothole' as IncidentCategory,
    severity: 'medium' as Severity,
    location: '',
    latitude: 19.0760, // Mumbai coordinates
    longitude: 72.8777,
  })

  // 2. DATA FETCHING & REALTIME
  const loadData = async () => {
    setLoading(true)
    const data = await fetchTickets()
    setTickets(data)
    setLoading(false)
  }

  useEffect(() => {
    loadData()

    const channel = supabase
      .channel('citizen-portal-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => {
        fetchTickets().then(setTickets)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const myReports = tickets.filter((t) => t.reportedBy === currentUser.name)
  const analytics = calculateCityAnalytics(tickets)

  // --- GEOLOCATION LOGIC ---
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser")
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setFormData(prev => ({
          ...prev,
          latitude,
          longitude,
          location: prev.location || `📍 GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
        }))
        
        // Check for nearby incidents when location is obtained
        checkForNearbyIncidents(latitude, longitude)
      },
      (err) => {
        console.error("Location error:", err)
        alert("Unable to retrieve location. Please allow location access.")
      }
    )
  }

  // Function to check for nearby incidents
  const checkForNearbyIncidents = (lat: number, lng: number) => {
    const nearby: Ticket[] = []
    
    tickets.forEach(ticket => {
      if (ticket.latitude && ticket.longitude) {
        const distance = calculateDistance(
          lat, lng,
          ticket.latitude, ticket.longitude
        )
        
        // Check if within radius (default 100 meters)
        if (distance <= duplicateRadius && ticket.category === formData.category) {
          nearby.push(ticket)
        }
      }
    })
    
    if (nearby.length > 0) {
      setNearbyIncidents(nearby)
      setShowNearbyDialog(true)
    }
  }

  // Function to check duplicates when category changes
  const checkCategoryDuplicates = () => {
    if (formData.latitude && formData.longitude) {
      checkForNearbyIncidents(formData.latitude, formData.longitude)
    }
  }

  // ML ANALYSIS LOGIC
  const analyzeImageWithML = async (imageData: string) => {
    setIsAnalyzing(true);
    setShowMlAnalysis(true);
    
    try {
      // Convert base64 to blob
      const base64Response = await fetch(imageData);
      const blob = await base64Response.blob();
      
      // Create File object
      const file = new File([blob], 'captured_image.jpg', { type: 'image/jpeg' });
      
      // Call ML service
      const analysis = await analyzePotholeImage(file);
      
      // Update form with ML-determined severity
      setFormData(prev => ({
        ...prev,
        severity: analysis.severity,
        title: prev.title || `Pothole detected: ${analysis.num_potholes} holes`
      }));
      
      setMlAnalysis(analysis);
      
    } catch (error) {
      console.error('ML Analysis failed:', error);
      alert('AI analysis failed. You can still submit manually.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // --- CAMERA LOGIC ---
  const startCamera = async () => {
    try {
      setIsCameraOpen(true)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      }, 100)
    } catch (err) {
      console.error("Camera error:", err)
      alert("Unable to access camera. Please verify permissions.")
      setIsCameraOpen(false)
    }
  }

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
    setIsCameraOpen(false)
  }

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current

    // Set canvas dimensions
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.drawImage(video, 0, 0)
      const imageData = canvas.toDataURL("image/jpeg")
      
      setUploadedImages(prev => [...prev, imageData])
      getCurrentLocation()
      stopCamera()
      
      // Automatically analyze with ML for potholes
      if (formData.category === 'pothole') {
        await analyzeImageWithML(imageData)
      }
    }
  }

  // Handle image upload for ML analysis
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      const imageData = reader.result as string
      setUploadedImages(prev => [...prev, imageData])
      
      // Automatically analyze with ML for potholes
      if (formData.category === 'pothole') {
        analyzeImageWithML(imageData)
      }
    }
    reader.readAsDataURL(file)
  }

  // SUBMIT REPORT WITH DUPLICATE CHECK
  const handleSubmitReport = async () => {
    if (!formData.title || !formData.description || !formData.location) {
      alert('Please fill in all required fields');
      return;
    }

    // Validate that we have images if ML analysis was performed
    if (uploadedImages.length === 0 && formData.category === 'pothole') {
      alert('Please upload at least one image for pothole detection');
      return;
    }

    try {
      console.log('Submitting report with data:', formData);
      console.log('Number of images:', uploadedImages.length);
      
      // Convert base64 images to File objects
      const imageFiles: File[] = [];
      for (let i = 0; i < uploadedImages.length; i++) {
        const img = uploadedImages[i];
        if (img.startsWith('data:')) {
          const base64Response = await fetch(img);
          const blob = await base64Response.blob();
          const file = new File([blob], `image_${i}.jpg`, { type: 'image/jpeg' });
          imageFiles.push(file);
        }
      }

      console.log('Converted to File objects:', imageFiles.length);

      // Use the ML integration function
      const result = await submitIncidentWithML(
        {
          title: formData.title,
          description: formData.description,
          category: formData.category,
          location: formData.location,
          latitude: formData.latitude,
          longitude: formData.longitude,
          reported_by: currentUser.name,
          images: imageFiles
        },
        currentUser.id || 'anonymous'
      );

      if (result.success) {
        console.log('Report submitted successfully:', result);
        
        // Reset form
        setFormData({
          title: '',
          description: '',
          category: 'pothole',
          severity: 'medium',
          location: '',
          latitude: 19.0760,
          longitude: 72.8777,
        });
        setUploadedImages([]);
        setDuplicateMatches([]);
        setMlAnalysis(null);
        setShowMlAnalysis(false);
        setNearbyIncidents([]);
        setShowNearbyDialog(false);
        
        alert('✅ Report submitted successfully! Admin will review the AI analysis.');
        onNavigate('my-reports');
      } else {
        throw new Error(result.error || 'Submission failed');
      }
      
    } catch (err) {
      console.error('Error creating ticket:', err);
      alert('❌ Failed to submit report. Please try again.');
    }
  };

  // --- NEARBY INCIDENTS DIALOG ---
  const NearbyIncidentsDialog = () => (
    <Dialog open={showNearbyDialog} onOpenChange={setShowNearbyDialog}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertOctagon className="h-5 w-5 text-amber-600" />
            Similar Report Already Exists Nearby
          </DialogTitle>
          <DialogDescription>
            We found {nearbyIncidents.length} existing incident(s) within {duplicateRadius}m of your location.
            Please review to avoid duplicate reporting.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 py-4">
          {nearbyIncidents.slice(0, 3).map((incident, index) => (
            <Card key={incident.id} className="p-4 border-amber-200 bg-amber-50">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={
                      incident.status === 'resolved' ? 'bg-green-100 text-green-800' :
                      incident.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-amber-100 text-amber-800'
                    }>
                      {incident.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className={
                      incident.severity === 'critical' ? 'bg-red-100 text-red-800' :
                      incident.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                      incident.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }>
                      {incident.severity.toUpperCase()}
                    </Badge>
                  </div>
                  <h4 className="font-semibold text-gray-900">{incident.title}</h4>
                  <p className="text-sm text-gray-600">{incident.description?.substring(0, 100)}...</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <MapPin className="h-3 w-3" />
                    {calculateDistance(
                      formData.latitude, formData.longitude,
                      incident.latitude, incident.longitude
                    ).toFixed(0)}m away
                  </div>
                  <p className="text-xs text-gray-500">
                    Reported: {new Date(incident.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => {
                    setSelectedTicket(incident)
                    setShowNearbyDialog(false)
                  }}
                >
                  View Details
                </Button>
              </div>
            </Card>
          ))}
          
          {nearbyIncidents.length > 3 && (
            <div className="text-center text-sm text-gray-500">
              + {nearbyIncidents.length - 3} more incident(s) nearby
            </div>
          )}
        </div>
        
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => setShowNearbyDialog(false)}
            className="flex-1"
          >
            Cancel Report
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setDuplicateRadius(duplicateRadius * 2) // Double the radius
              checkForNearbyIncidents(formData.latitude, formData.longitude)
            }}
            className="flex-1"
          >
            Search Wider Area
          </Button>
          <Button
            onClick={() => {
              setShowNearbyDialog(false)
              handleSubmitReport()
            }}
            className="flex-1 bg-amber-600 hover:bg-amber-700"
          >
            Continue Anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  // --- VIEW: CITY WIDE ---
  if (currentView === 'city-wide') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-8 h-8" />
                City-Wide Analytics
                {loading && <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />}
              </h1>
              <p className="text-gray-600 mt-2">Real-time view of all reported incidents across Mumbai</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => onNavigate('report')}
                className="bg-blue-600 hover:bg-blue-700 text-white transition"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Report Incident
              </Button>
              <Button onClick={onLogout} variant="outline">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>

          {/* Key Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Incidents</p>
                  <p className="text-3xl font-bold text-gray-900">{analytics.totalIncidents}</p>
                </div>
                <AlertCircle className="w-12 h-12 text-blue-600" />
              </div>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Avg Resolution</p>
                  <p className="text-3xl font-bold text-gray-900">{Math.round(analytics.averageResolutionTime)}h</p>
                </div>
                <Clock className="w-12 h-12 text-emerald-600" />
              </div>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Critical Areas</p>
                  <p className="text-3xl font-bold text-gray-900">{analytics.criticalAreas.length}</p>
                </div>
                <TrendingUp className="w-12 h-12 text-red-600" />
              </div>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">AI Assisted</p>
                  <p className="text-3xl font-bold text-gray-900">
                     {tickets.length > 0 
                       ? `${Math.round((tickets.filter(t => t.ml_analysis || t.ml_confidence_score || t.annotated_image_url).length / tickets.length) * 100)}%`
                       : '0%'}
                   </p>
                </div>
                <Brain className="w-12 h-12 text-purple-600" />
              </div>
            </Card>
          </div>

          {/* Map Section */}
          <Card className="mb-8 p-6 hover:shadow-lg transition-shadow">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Incident Distribution Map
            </h2>
            <IncidentMap incidents={tickets.filter((t) => t.status !== 'closed')} />
          </Card>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <TimeSeriesChart analytics={analytics} />
            </Card>
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <CategoryDistributionChart analytics={analytics} />
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // --- VIEW: REPORT FORM ---
  if (currentView === 'report') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <button 
              onClick={() => onNavigate('dashboard')}
              className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-4 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 flex items-center gap-2">
                  <Sparkles className="w-8 h-8" />
                  Report an Incident
                </h1>
                <p className="text-gray-600 mt-2">Help us improve Mumbai with AI-powered reporting</p>
              </div>
              <Badge variant="outline" className="flex items-center gap-2">
                <Brain className="w-4 h-4" />
                AI Assisted
              </Badge>
            </div>
          </div>

          {/* ML Analysis Panel */}
          {showMlAnalysis && mlAnalysis && (
            <Card className="mb-6 border-blue-200 bg-blue-50 hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <Brain className="w-5 h-5" /> 
                    AI Analysis Results
                  </h3>
                  <Badge className={
                    mlAnalysis.severity === 'critical' ? 'bg-red-600' :
                    mlAnalysis.severity === 'high' ? 'bg-orange-600' :
                    mlAnalysis.severity === 'medium' ? 'bg-yellow-600' : 'bg-green-600'
                  }>
                    {mlAnalysis.severity.toUpperCase()}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Annotated Image */}
                  {mlAnalysis.annotated_image && (
                    <div className="space-y-2">
                      <Label>AI Detection Preview</Label>
                      <img 
                        src={mlAnalysis.annotated_image} 
                        alt="AI Analysis" 
                        className="w-full h-48 object-cover rounded-lg border border-gray-300"
                      />
                    </div>
                  )}
                  
                  {/* Analysis Details */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-sm">Potholes Detected</Label>
                        <div className="text-2xl font-bold text-gray-900">{mlAnalysis.num_potholes}</div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-sm">Risk Score</Label>
                        <div className="text-2xl font-bold text-gray-900">{mlAnalysis.risk_score * 100}%</div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <Label>Coverage Ratio</Label>
                        <span className="font-medium">{mlAnalysis.coverage_ratio}</span>
                      </div>
                      <Progress value={mlAnalysis.coverage_ratio * 100} className="h-2" />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <Label>Lane Impact</Label>
                        <span className="font-medium">{mlAnalysis.lane_impact_ratio}</span>
                      </div>
                      <Progress value={mlAnalysis.lane_impact_ratio * 100} className="h-2" />
                    </div>
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  onClick={() => setShowMlAnalysis(false)}
                  className="mt-4 w-full"
                >
                  Hide Analysis
                </Button>
              </div>
            </Card>
          )}

          {/* Nearby Incidents Warning */}
          {nearbyIncidents.length > 0 && !showNearbyDialog && (
            <Card className="mb-6 border-amber-200 bg-amber-50 hover:shadow-lg transition-shadow">
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <AlertOctagon className="h-5 w-5 text-amber-600" />
                  <div className="flex-1">
                    <h4 className="font-medium text-amber-800">Similar report exists nearby</h4>
                    <p className="text-sm text-amber-700">
                      {nearbyIncidents.length} incident(s) found within {duplicateRadius}m. Check if yours is a duplicate.
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setShowNearbyDialog(true)}
                    className="border-amber-300 text-amber-700"
                  >
                    Review
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Duplicate Warning */}
          {duplicateMatches.length > 0 && (
            <Card className="p-6 mb-6 border-yellow-200 bg-yellow-50">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" /> Similar Incidents Found
              </h3>
              <p className="text-sm text-gray-700 mb-4">We found {duplicateMatches.length} similar incident(s). Please review before submitting:</p>
              <div className="space-y-2">
                {duplicateMatches.map((match) => {
                  const matchTicket = tickets.find((t) => t.id === match.ticketId)
                  return (
                    <div key={match.ticketId} className="p-3 bg-white rounded border border-yellow-200 hover:bg-yellow-50 transition-colors">
                      <p className="font-semibold text-gray-900">{matchTicket?.title}</p>
                      <p className="text-sm text-gray-600">{match.reason}</p>
                      <p className="text-sm font-bold text-yellow-700">{match.similarity}% similar</p>
                    </div>
                  )
                })}
              </div>
              <Button 
                type="button"
                onClick={() => {
                  setDuplicateMatches([])
                  handleSubmitReport()
                }} 
                className="mt-4 w-full bg-yellow-600 hover:bg-yellow-700"
              >
                Continue Anyway
              </Button>
            </Card>
          )}

          <Card className="p-8 hover:shadow-xl transition-shadow">
            <div className="space-y-6">
              {/* Title */}
              <div>
                <Label htmlFor="title-input" className="text-gray-900 font-medium mb-2">Incident Title *</Label>
                <Input
                  id="title-input"
                  placeholder="Brief description of the issue"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full h-12"
                />
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="desc-input" className="text-gray-900 font-medium mb-2">Detailed Description *</Label>
                <Textarea
                  id="desc-input"
                  placeholder="Provide details about the incident..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full h-32"
                />
              </div>

              {/* Category and Severity */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category-select" className="text-gray-900 font-medium mb-2">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => {
                      setFormData({ ...formData, category: value as IncidentCategory })
                      setMlAnalysis(null)
                      setShowMlAnalysis(false)
                      // Check for duplicates when category changes
                      setTimeout(checkCategoryDuplicates, 100)
                    }}
                  >
                    <SelectTrigger id="category-select" className="h-12">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_LABELS).map(([key, { label, emoji }]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <span>{emoji}</span>
                            <span>{label}</span>
                            {key === 'pothole' && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                AI Enabled
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="severity-select" className="text-gray-900 font-medium mb-2">Severity Level *</Label>
                  <Select 
                    value={formData.severity}
                    onValueChange={(value) => setFormData({ ...formData, severity: value as Severity })}
                  >
                    <SelectTrigger id="severity-select" className="h-12">
                      <SelectValue placeholder="Select severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          Low Priority
                        </div>
                      </SelectItem>
                      <SelectItem value="medium">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                          Medium Priority
                        </div>
                      </SelectItem>
                      <SelectItem value="high">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                          High Priority
                        </div>
                      </SelectItem>
                      <SelectItem value="critical">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500"></div>
                          Critical Emergency
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Location */}
              <div>
                <Label htmlFor="location-input" className="text-gray-900 font-medium mb-2">Location *</Label>
                <div className="flex gap-2">
                  <Input 
                    id="location-input"
                    placeholder="Street address or landmark" 
                    value={formData.location} 
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })} 
                    className="w-full h-12"
                  />
                  <Button 
                    type="button"
                    onClick={getCurrentLocation} 
                    variant="outline" 
                    className="h-12 w-12"
                    title="Get current location"
                  >
                    <Navigation className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-2 text-xs text-gray-500 flex items-center gap-2">
                  <MapPin className="h-3 w-3" />
                  {formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}
                  {nearbyIncidents.length > 0 && (
                    <Badge variant="outline" size="sm" className="ml-2 text-amber-600 border-amber-300">
                      {nearbyIncidents.length} nearby reports
                    </Badge>
                  )}
                </div>
              </div>

              {/* Camera Photo Capture */}
              <div>
                <Label className="text-gray-900 font-medium mb-2">Evidence Photos</Label>
                
                {formData.category === 'pothole' && (
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">AI Pothole Detection Available</span>
                    </div>
                    <p className="text-sm text-blue-700">
                      Upload/Take a photo of potholes for automatic severity analysis
                    </p>
                  </div>
                )}
                
                {isCameraOpen ? (
                  <div className="mb-4 bg-black rounded-lg overflow-hidden border border-gray-700">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-64 object-cover" />
                    <div className="p-4 flex justify-center gap-4 bg-gray-800">
                      <Button 
                        type="button"
                        onClick={capturePhoto} 
                        className="bg-white text-black hover:bg-gray-200"
                        disabled={isAnalyzing}
                      >
                        {isAnalyzing ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Camera className="w-4 h-4 mr-2" />
                        )}
                        {isAnalyzing ? 'Analyzing...' : 'Capture & Analyze'}
                      </Button>
                      <Button 
                        type="button"
                        onClick={stopCamera} 
                        variant="outline" 
                        className="text-white border-white"
                      >
                        Cancel
                      </Button>
                    </div>
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      type="button"
                      onClick={startCamera}
                      variant="outline"
                      className="h-24 border-dashed border-2 flex flex-col gap-2 hover:bg-gray-50 flex-1"
                    >
                      <Camera className="w-8 h-8 text-gray-400" />
                      <span className="text-gray-600">Take Photo</span>
                    </Button>
                    
                    <div className="relative flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="file-upload"
                      />
                      <label
                        htmlFor="file-upload"
                        className="h-24 border-dashed border-2 rounded-md flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <UploadCloud className="w-8 h-8 text-gray-400" />
                        <span className="text-gray-600">Upload Photo</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Preview Captured Images */}
                {uploadedImages.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-900">
                        {uploadedImages.length} photo(s) captured
                      </p>
                      {formData.category === 'pothole' && !mlAnalysis && uploadedImages.length > 0 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => analyzeImageWithML(uploadedImages[0])}
                          disabled={isAnalyzing}
                          className="gap-2"
                        >
                          {isAnalyzing ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Brain className="h-3 w-3" />
                          )}
                          {isAnalyzing ? 'Analyzing...' : 'Run AI Analysis'}
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {uploadedImages.map((img, idx) => (
                        <div key={idx} className="relative group">
                          <img 
                            src={img} 
                            alt={`Capture ${idx + 1}`} 
                            className="w-full h-24 object-cover rounded-lg border border-gray-200 hover:border-blue-400 transition-colors"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setUploadedImages(prev => prev.filter((_, i) => i !== idx))
                              if (uploadedImages.length === 1) {
                                setMlAnalysis(null)
                                setShowMlAnalysis(false)
                              }
                            }}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-sm hover:bg-red-600 transition-colors"
                            aria-label="Remove photo"
                            title="Remove photo"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <Button 
                type="button"
                onClick={() => {
                  if (nearbyIncidents.length > 0) {
                    setShowNearbyDialog(true)
                  } else {
                    handleSubmitReport()
                  }
                }} 
                className="w-full py-6 text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all"
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Send className="w-5 h-5 mr-2" />
                )}
                {isAnalyzing ? 'Processing...' : 'Submit Report'}
              </Button>
            </div>
          </Card>
        </div>
        
        {/* Nearby Incidents Dialog */}
        <NearbyIncidentsDialog />
      </div>
    )
  }

  // --- VIEW: MY REPORTS ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-8 h-8" />
              My Reports
            </h1>
            <p className="text-gray-600 mt-2">Track your submitted incidents and their status</p>
          </div>
          <div className="flex gap-3">
            <Button 
              type="button"
              onClick={() => onNavigate('city-wide')} 
              variant="outline"
              className="border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              View City-Wide
            </Button>
            <Button 
              type="button"
              onClick={() => onNavigate('report')} 
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Zap className="w-4 h-4 mr-2" />
              New Report
            </Button>
            <Button 
              type="button"
              onClick={onLogout} 
              variant="outline"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {myReports.length === 0 ? (
          <Card className="p-12 text-center hover:shadow-lg transition-shadow">
            <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-2">No incidents reported yet</p>
            <p className="text-gray-400 text-sm mb-6">Be the first to help improve our city!</p>
            <Button 
              type="button"
              onClick={() => onNavigate('report')} 
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              Report Your First Incident
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {myReports.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                onClick={() => setSelectedTicket(ticket)}
                clickable
              />
            ))}
          </div>
        )}

        {/* Ticket Detail Modal */}
        {selectedTicket && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8">
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="mb-4 text-gray-600 hover:text-gray-900 transition-colors"
                aria-label="Close details"
              >
                ← Close
              </button>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedTicket.title}</h2>
              <p className="text-gray-600 mb-6">{selectedTicket.ticketNumber}</p>
              <AuditTimeline auditLogs={selectedTicket.audit || []} />
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}