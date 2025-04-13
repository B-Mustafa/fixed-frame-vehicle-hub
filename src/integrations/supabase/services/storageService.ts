
import { supabase } from '../client';

// Upload a vehicle image to Supabase Storage
export const uploadVehicleImage = async (file: File): Promise<string> => {
  const fileName = `${Date.now()}-${file.name}`;
  
  const { data, error } = await supabase
    .storage
    .from('vehicle_images')
    .upload(fileName, file);
  
  if (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
  
  // Get public URL for the uploaded image
  const { data: { publicUrl } } = supabase
    .storage
    .from('vehicle_images')
    .getPublicUrl(data.path);
  
  return publicUrl;
};

// Delete a vehicle image from Supabase Storage
export const deleteVehicleImage = async (imageUrl: string): Promise<boolean> => {
  try {
    // Extract the file path from the URL
    const urlParts = imageUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];
    
    const { error } = await supabase
      .storage
      .from('vehicle_images')
      .remove([fileName]);
    
    if (error) {
      console.error('Error deleting image:', error);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Error processing image deletion:', err);
    return false;
  }
};
