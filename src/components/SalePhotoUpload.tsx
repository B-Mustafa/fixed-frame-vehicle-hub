
import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, ZoomIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { uploadVehicleImage } from "@/integrations/supabase/service";

interface SalePhotoUploadProps {
  photoPreview: string | null;
  setPhotoPreview: (url: string | null) => void;
  setCurrentSale: (sale: any) => void;
  currentSale: any;
  useSupabase: boolean;
  onViewPhoto: () => void;
}

const SalePhotoUpload: React.FC<SalePhotoUploadProps> = ({
  photoPreview,
  setPhotoPreview,
  setCurrentSale,
  currentSale,
  useSupabase,
  onViewPhoto,
}) => {
  const { toast } = useToast();
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handleAddPhoto = () => {
    photoInputRef.current?.click();
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        let photoUrl;
        
        if (useSupabase) {
          // Upload to Supabase Storage
          photoUrl = await uploadVehicleImage(file);
        } else {
          // Use local storage (base64)
          const reader = new FileReader();
          photoUrl = await new Promise<string>((resolve) => {
            reader.onload = (event) => {
              resolve(event.target?.result as string);
            };
            reader.readAsDataURL(file);
          });
        }
        
        setPhotoPreview(photoUrl);
        setCurrentSale({
          ...currentSale,
          photoUrl,
        });
        
        toast({
          title: "Success",
          description: "Photo uploaded successfully",
        });
      } catch (error) {
        console.error("Error uploading photo:", error);
        toast({
          title: "Error",
          description: "Failed to upload photo",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="border p-4 rounded-lg flex flex-col items-center justify-center bg-gray-50 min-h-[200px]">
      {photoPreview ? (
        <div className="relative">
          <img
            src={photoPreview}
            alt="Vehicle"
            className="max-w-full max-h-[180px] object-contain mb-2"
          />
          <div className="flex mt-2 justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onViewPhoto}
            >
              <ZoomIn className="h-4 w-4 mr-2" /> View
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddPhoto}
            >
              <Camera className="h-4 w-4 mr-2" /> Change
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <div className="bg-gray-200 w-32 h-32 flex items-center justify-center rounded-lg mb-4">
            <Camera className="h-12 w-12 text-gray-400" />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddPhoto}
          >
            <Camera className="h-4 w-4 mr-2" /> Add Photo
          </Button>
        </div>
      )}
      <input
        type="file"
        accept="image/*"
        onChange={handlePhotoChange}
        ref={photoInputRef}
        style={{ display: "none" }}
      />
    </div>
  );
};

export default SalePhotoUpload;
