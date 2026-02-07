import { supabase } from './supabase';
import { Severity } from './types';

export interface MLSubmissionData {
  title: string;
  description: string;
  category: string;
  location: string;
  latitude: number;
  longitude: number;
  reported_by: string;
  images: File[];
}

export interface MLAnalysisResult {
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

// Map frontend categories to ML model categories
const CATEGORY_TO_ML = {
  'pothole': 'pothole',
  'flooding': 'water_leak',
  'garbage': 'garbage',
  'debris': 'garbage',
  'fallen_tree': 'fallen_tree',
  'street_light': 'streetlight',
  'traffic_signal': 'streetlight',
  'other': null
};

export async function submitIncidentWithML(
  data: MLSubmissionData, 
  userId: string
): Promise<{ success: boolean; incidentId?: string; imageUrls?: string[]; error?: string }> {
  try {
    console.log('Starting incident submission with ML analysis...');
    console.log('Category:', data.category);
    
    // 1. Create incident record with default severity
    const { data: incident, error: incidentError } = await supabase
      .from('incidents')
      .insert([{
        title: data.title,
        description: data.description,
        category: data.category,
        severity: 'medium', // Default, will be updated by ML
        status: 'open',
        location: data.location,
        latitude: data.latitude,
        longitude: data.longitude,
        reported_by: data.reported_by,
        images: []
      }])
      .select()
      .single();

    if (incidentError) {
      console.error('Error creating incident:', incidentError);
      throw incidentError;
    }
    
    const incidentId = incident.id;
    console.log('Incident created with ID:', incidentId);
    
    const imageUrls: string[] = [];
    let mlAnalysis: MLAnalysisResult | null = null;

    // 2. Upload images and get ML analysis
    if (data.images && data.images.length > 0) {
      for (let i = 0; i < data.images.length; i++) {
        const file = data.images[i];
        const fileExt = file.name.split('.').pop() || 'jpg';
        const fileName = `${userId}/${incidentId}/${Date.now()}_${i}.${fileExt}`;
        
        console.log(`Uploading image ${i + 1}/${data.images.length}:`, fileName);
        
        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('incident-images')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('incident-images')
          .getPublicUrl(fileName);
        
        console.log('Image uploaded successfully:', publicUrl);
        imageUrls.push(publicUrl);

        // 3. Send FIRST image to ML service
        // ML works for: pothole, garbage, flooding, fallen_tree, street_light
        const mlCategory = CATEGORY_TO_ML[data.category as keyof typeof CATEGORY_TO_ML];
        const shouldAnalyze = mlCategory !== null && mlCategory !== undefined;
        
        if (i === 0 && shouldAnalyze) {
          try {
            console.log(`Sending image to ML service for ${mlCategory} analysis...`);
            
            const mlFormData = new FormData();
            mlFormData.append('file', file);

            const mlResponse = await fetch(`http://localhost:8000/analyze/${incidentId}`, {
              method: 'POST',
              body: mlFormData,
            });

            if (mlResponse.ok) {
              const mlResult = await mlResponse.json();
              console.log('ML Analysis result:', mlResult);
              
              if (mlResult.status === 'success' && mlResult.analysis) {
                mlAnalysis = mlResult.analysis;
                console.log('Detected types:', mlAnalysis?.detected_types);
                console.log('Primary issue:', mlAnalysis?.primary_issue);
              }
            } else {
              console.warn('ML service returned non-OK status:', mlResponse.status);
            }
          } catch (mlError) {
            console.warn('ML analysis failed (continuing without it):', mlError);
          }
        } else if (i === 0 && !shouldAnalyze) {
          console.log(`Category '${data.category}' does not support ML analysis`);
        }
      }
    }

    // 4. Update incident with images and ML results
    const updateData: any = {
      images: imageUrls
    };

    if (mlAnalysis) {
      console.log('Updating incident with ML analysis:', mlAnalysis);
      
      // Update severity based on ML
      updateData.severity = mlAnalysis.severity;
      
      // Store full ML analysis
      updateData.ml_analysis = {
        severity: mlAnalysis.severity,
        risk_score: mlAnalysis.risk_score,
        num_detections: mlAnalysis.num_detections,
        coverage_ratio: mlAnalysis.coverage_ratio,
        lane_impact_ratio: mlAnalysis.lane_impact_ratio || 0,
        detected_types: mlAnalysis.detected_types,
        primary_issue: mlAnalysis.primary_issue,
        confidence: mlAnalysis.confidence || 0
      };
      
      // Store key metrics at top level for easy querying
      updateData.ml_confidence_score = mlAnalysis.risk_score;
      updateData.detection_count = mlAnalysis.num_detections;
      updateData.coverage_ratio = mlAnalysis.coverage_ratio;
      
      // Store annotated image if available
      if (mlAnalysis.annotated_image) {
        updateData.annotated_image_url = mlAnalysis.annotated_image;
      }
    }

    const { error: updateError } = await supabase
      .from('incidents')
      .update(updateData)
      .eq('id', incidentId);

    if (updateError) {
      console.error('Error updating incident:', updateError);
    } else {
      console.log('Incident updated successfully');
    }

    return { 
      success: true, 
      incidentId, 
      imageUrls 
    };
    
  } catch (error) {
    console.error('Submission error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Submission failed' 
    };
  }
}

export async function analyzeImagePreview(file: File, category?: string): Promise<MLAnalysisResult | null> {
  try {
    console.log('Analyzing image preview...');
    
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('http://localhost:8000/analyze', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`ML service error: ${response.status}`);
    }

    const result = await response.json();
    console.log('Preview analysis result:', result);
    
    return result.analysis;
  } catch (error) {
    console.error('ML preview analysis failed:', error);
    return null;
  }
}
