import { Severity } from './types';

export interface MLAnalysis {
  severity: Severity;
  risk_score: number;
  num_detections: number;
  coverage_ratio: number;
  lane_impact_ratio?: number;
  detected_types: string[];
  primary_issue: string;
  annotated_image?: string;
  confidence?: number;
  
  // Type-specific fields
  num_potholes?: number;
  road_coverage_ratio?: number;
  concentration?: number;
}

export async function analyzeIncidentImage(
  imageFile: File, 
  category?: string
): Promise<MLAnalysis> {
  const formData = new FormData();
  formData.append('file', imageFile);

  try {
    console.log(`Analyzing ${category || 'unknown'} incident image...`);
    
    const response = await fetch('http://localhost:8000/analyze', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`ML service error: ${response.status}`);
    }

    const data = await response.json();
    console.log('ML Analysis result:', data);
    
    return data.analysis;
  } catch (error) {
    console.error('ML analysis failed:', error);
    throw error;
  }
}

// Backward compatibility alias
export const analyzePotholeImage = analyzeIncidentImage;

export async function getSupportedClasses(): Promise<string[]> {
  try {
    const response = await fetch('http://localhost:8000/classes');
    if (!response.ok) {
      throw new Error(`Failed to get classes: ${response.status}`);
    }
    const data = await response.json();
    return Object.values(data.classes);
  } catch (error) {
    console.error('Failed to get supported classes:', error);
    return ['pothole', 'garbage', 'water_leak', 'fallen_tree', 'streetlight'];
  }
}

export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:8000/health');
    return response.ok;
  } catch (error) {
    console.error('ML service health check failed:', error);
    return false;
  }
}
