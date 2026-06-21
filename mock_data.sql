-- CityPulse Database Mock Data Script
-- Paste this script into your Supabase SQL Editor and run it to populate mock data.

-- 1. CLEANUP: Delete existing records to avoid conflicts (Optional, comment out if not needed)
TRUNCATE TABLE public.comments CASCADE;
TRUNCATE TABLE public.audit_logs CASCADE;
DELETE FROM public.incidents;

-- 2. INSERT INCIDENTS (Mumbai Coordinates)
INSERT INTO public.incidents (
  id,
  ticket_number,
  title,
  description,
  category,
  severity,
  status,
  location,
  latitude,
  longitude,
  reported_by,
  created_at,
  assigned_to,
  resolved_by,
  resolved_at,
  estimated_completion,
  images,
  tags,
  is_duplicate,
  priority,
  ml_analysis,
  ml_confidence_score,
  detection_count,
  coverage_ratio
) VALUES 
-- Incident 1: Pothole in Andheri (In Progress, Assigned, AI Assisted)
(
  'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
  'CYP-2026-001',
  'Large Pothole Group on Link Road',
  'A series of deep potholes have formed on the main southbound lane, causing traffic slowdowns and hazard for motorcyclists.',
  'pothole',
  'high',
  'in_progress',
  'Link Road, near Andheri Metro Station, Andheri West',
  19.1197,
  72.8468,
  'John Citizen',
  NOW() - INTERVAL '3 days',
  'Field Officer Sarah',
  NULL,
  NULL,
  NOW() + INTERVAL '1 day',
  ARRAY['https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&w=800&q=80'],
  ARRAY['pothole', 'traffic-hazard', 'road-damage'],
  false,
  8,
  '{"severity": "high", "risk_score": 0.82, "num_potholes": 4, "coverage_ratio": 0.15, "lane_impact_ratio": 0.40, "detection_count": 4, "confidence_scores": [0.89, 0.92, 0.78, 0.85]}',
  0.86,
  4,
  0.15
),

-- Incident 2: Flooding in Milan Subway (Critical, Open, AI Assisted)
(
  'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
  'CYP-2026-002',
  'Severe Waterlogging at Milan Subway',
  'Subway is completely flooded due to heavy rains. Water depth is around 2 feet, making it impassable for small cars.',
  'flooding',
  'critical',
  'open',
  'Milan Subway, Santacruz East',
  19.0886,
  72.8422,
  'Rahul Sharma',
  NOW() - INTERVAL '4 hours',
  NULL,
  NULL,
  NULL,
  NULL,
  ARRAY['https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80'],
  ARRAY['flooding', 'monsoon', 'road-closed'],
  false,
  10,
  '{"severity": "critical", "risk_score": 0.98, "num_potholes": 0, "coverage_ratio": 0.85, "lane_impact_ratio": 1.0, "detection_count": 1, "confidence_scores": [0.97]}',
  0.97,
  1,
  0.85
),

-- Incident 3: Broken Traffic Signal in Haji Ali (Medium, Assigned, AI Assisted)
(
  'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f',
  'CYP-2026-003',
  'Traffic Light Malfunction at Haji Ali Junction',
  'The signal lights are flickering and showing both red and green simultaneously, causing severe confusion and traffic congestion.',
  'traffic_signal',
  'medium',
  'assigned',
  'Haji Ali Junction, Worli',
  18.9774,
  72.8105,
  'Neha Patel',
  NOW() - INTERVAL '1 day',
  'Field Officer Sarah',
  NULL,
  NULL,
  NOW() + INTERVAL '12 hours',
  ARRAY[],
  ARRAY['traffic', 'signal-fault'],
  false,
  5,
  '{"severity": "medium", "risk_score": 0.55, "num_potholes": 0, "coverage_ratio": 0.05, "lane_impact_ratio": 0.20, "detection_count": 1, "confidence_scores": [0.72]}',
  0.72,
  1,
  0.05
),

-- Incident 4: Out of Order Streetlight in Marine Drive (Low, Resolved, AI Assisted)
(
  'd4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a',
  'CYP-2026-004',
  'Out of Order Streetlight pole MD-14',
  'The streetlight pole has been dark for the past week, making the pedestrian walkway dim and unsafe at night.',
  'street_light',
  'low',
  'resolved',
  'Marine Drive Promenade, near Chowpatty, Girgaon',
  18.9543,
  72.8092,
  'Amit Mehta',
  NOW() - INTERVAL '5 days',
  'Field Officer Sarah',
  'Field Officer Sarah',
  NOW() - INTERVAL '1 day',
  NULL,
  ARRAY[],
  ARRAY['lighting', 'safety', 'marine-drive'],
  false,
  3,
  '{"severity": "low", "risk_score": 0.25, "num_potholes": 0, "coverage_ratio": 0.02, "lane_impact_ratio": 0.0, "detection_count": 1, "confidence_scores": [0.65]}',
  0.65,
  1,
  0.02
),

-- Incident 5: Construction Debris in Bandra (High, Closed, AI Assisted)
(
  'e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b',
  'CYP-2026-005',
  'Construction Waste Dumped on Footpath',
  'Large pile of bricks, cement bags, and iron rods dumped on the pedestrian walkway, forcing people to walk on the busy road.',
  'debris',
  'high',
  'closed',
  'Carter Road, Bandra West',
  19.0654,
  72.8228,
  'John Citizen',
  NOW() - INTERVAL '7 days',
  'Field Officer Sarah',
  'Field Officer Sarah',
  NOW() - INTERVAL '3 days',
  NULL,
  ARRAY['https://images.unsplash.com/photo-1532601224476-15c79f2f7a51?auto=format&fit=crop&w=800&q=80'],
  ARRAY['debris', 'footpath-block', 'encroachment'],
  false,
  7,
  '{"severity": "high", "risk_score": 0.78, "num_potholes": 0, "coverage_ratio": 0.30, "lane_impact_ratio": 0.10, "detection_count": 2, "confidence_scores": [0.88, 0.90]}',
  0.89,
  2,
  0.30
),

-- Incident 6: Garbage Heap in Dharavi (Medium, Open, AI Assisted)
(
  'f6a7b8c9-d0e1-2f3a-4b5c-6d7e8f9a0b1c',
  'CYP-2026-006',
  'Overflowing Trash Bin and Garbage Pile',
  'The public community dumpster is overflowing, and residents have dumped garbage bags all around it. Bad smell and stray dogs.',
  'other',
  'medium',
  'open',
  'Near 90 Feet Road, Dharavi',
  19.0380,
  72.8538,
  'Pooja Kadam',
  NOW() - INTERVAL '12 hours',
  NULL,
  NULL,
  NULL,
  NULL,
  ARRAY[],
  ARRAY['sanitation', 'garbage', 'health-hazard'],
  false,
  4,
  '{"severity": "medium", "risk_score": 0.48, "num_potholes": 0, "coverage_ratio": 0.22, "lane_impact_ratio": 0.05, "detection_count": 1, "confidence_scores": [0.81]}',
  0.81,
  1,
  0.22
),

-- Incident 7: Open Manhole at Worli Seaface (Critical, On Hold, NOT AI Assisted)
(
  'a7b8c9d0-e1f2-3a4b-5c6d-7e8f9a0b1c2d',
  'CYP-2026-007',
  'Open Manhole on Walkway',
  'A circular concrete cover is missing from a sewer hole on the sidewalk. Extremely dangerous for children and pedestrians at night.',
  'other',
  'critical',
  'on_hold',
  'Worli Sea Face Road, Worli',
  19.0028,
  72.8152,
  'Vikram Sen',
  NOW() - INTERVAL '2 days',
  'Field Officer Sarah',
  NULL,
  NULL,
  NULL,
  ARRAY[],
  ARRAY['manhole', 'extreme-danger', 'sidewalk'],
  false,
  9,
  NULL, -- No ML analysis for this one, to verify non-AI cases and give 6/7 = 86% AI assisted rate
  NULL,
  NULL,
  NULL
);

-- 3. INSERT COMMENTS
INSERT INTO public.comments (
  id,
  incident_id,
  author,
  author_role,
  content,
  created_at
) VALUES 
-- Comments on Incident 1 (Potholes in Andheri)
(
  'c1111111-1111-1111-1111-111111111111',
  'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
  'Officer Mike Chen',
  'officer',
  'I have assigned this to Field Officer Sarah. It is a major thoroughfare and requires patching before peak weekend traffic.',
  NOW() - INTERVAL '2 days'
),
(
  'c2222222-2222-2222-2222-222222222222',
  'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
  'Field Officer Sarah',
  'field_staff',
  'Inspected the site. Potholes are deep, will need asphalt mixture and rollers. Scheduled for repair tomorrow morning.',
  NOW() - INTERVAL '1 day'
),

-- Comments on Incident 7 (Open Manhole at Worli)
(
  'c3333333-3333-3333-3333-333333333333',
  'a7b8c9d0-e1f2-3a4b-5c6d-7e8f9a0b1c2d',
  'Field Officer Sarah',
  'field_staff',
  'Placed safety cones and warning tape around the hole. The municipal corporation standard size lid is not in stock. Placed on hold until the lid is fabricated.',
  NOW() - INTERVAL '1 day'
);

-- 4. INSERT AUDIT LOGS
INSERT INTO public.audit_logs (
  id,
  incident_id,
  action,
  actor,
  actor_role,
  timestamp,
  details,
  field_changed,
  old_value,
  new_value
) VALUES 
-- Audit for Incident 1
(
  'd1111111-1111-1111-1111-111111111111',
  'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
  'created',
  'John Citizen',
  'citizen',
  NOW() - INTERVAL '3 days',
  '{"reason": "Safety hazard"}',
  NULL,
  NULL,
  NULL
),
(
  'd2222222-2222-2222-2222-222222222222',
  'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
  'assigned',
  'Officer Mike Chen',
  'officer',
  NOW() - INTERVAL '2 days',
  '{"assignedTo": "Field Officer Sarah"}',
  'assigned_to',
  NULL,
  'Field Officer Sarah'
),
(
  'd3333333-3333-3333-3333-333333333333',
  'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
  'status_changed',
  'Field Officer Sarah',
  'field_staff',
  NOW() - INTERVAL '1 day',
  '{"statusChange": "assigned -> in_progress"}',
  'status',
  'assigned',
  'in_progress'
),

-- Audit for Incident 2
(
  'd4444444-4444-4444-4444-444444444444',
  'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
  'created',
  'Rahul Sharma',
  'citizen',
  NOW() - INTERVAL '4 hours',
  '{"reason": "Monsoon flooding"}',
  NULL,
  NULL,
  NULL
);
