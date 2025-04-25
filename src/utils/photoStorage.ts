// utils/photoStorage.ts

import { supabase } from "@/integrations/supabase/client";

export const uploadPhoto = async (file: File, purchaseId: number): Promise<string> => {
    try {
      // Validate file
      if (!file || !file.type.startsWith('image/')) {
        throw new Error('Invalid file type. Only images are allowed.');
      }
  
      const fileExt = file.name.split('.').pop();
      const fileName = `${purchaseId}-${Date.now()}.${fileExt}`;
      const filePath = `purchase-photos/${fileName}`;
  
      // Upload with error handling
      const { error: uploadError } = await supabase.storage
        .from('purchase-photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
  
      if (uploadError) {
        throw uploadError;
      }
  
      // Get public URL with error handling
      const { data: { publicUrl } } = supabase.storage
        .from('purchase-photos')
        .getPublicUrl(filePath);
  
      if (!publicUrl) {
        throw new Error('Failed to generate public URL');
      }
  
      return publicUrl;
    } catch (error) {
      console.error('Detailed upload error:', error);
      throw new Error(`Photo upload failed: ${error.message}`);
    }
  };

export const deletePhoto = async (photoUrl: string): Promise<void> => {
  try {
    const filePath = photoUrl.split('/').pop();
    if (!filePath) return;

    const { error } = await supabase.storage
      .from('purchase-photos')
      .remove([filePath]);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting photo:', error);
    throw error;
  }
};