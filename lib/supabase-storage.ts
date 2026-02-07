import { supabase } from './supabase';

export interface ImageUploadResult {
  url: string;
  path: string;
  error?: string;
}

export async function uploadIncidentImage(
  file: File, 
  incidentId: string, 
  userId: string
): Promise<ImageUploadResult> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${incidentId}/${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('incident-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('incident-images')
      .getPublicUrl(data.path);

    return {
      url: publicUrl,
      path: data.path
    };
  } catch (error) {
    console.error('Upload error:', error);
    return { 
      url: '', 
      path: '', 
      error: error instanceof Error ? error.message : 'Upload failed' 
    };
  }
}

export async function uploadMultipleImages(
  files: File[], 
  incidentId: string, 
  userId: string
): Promise<string[]> {
  const uploadPromises = files.map(file => 
    uploadIncidentImage(file, incidentId, userId)
  );
  
  const results = await Promise.all(uploadPromises);
  return results
    .filter(result => result.url)
    .map(result => result.url);
}