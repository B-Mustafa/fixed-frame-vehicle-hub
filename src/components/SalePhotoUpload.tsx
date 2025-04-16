import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, ZoomIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { uploadVehicleImage } from "@/integrations/supabase/services/storageService";
import ImagePreviewModal from "./ImagePreviewModal"; // Make sure this path is correct

interface SalePhotoUploadProps {
  photoPreview: string | null;
  setPhotoPreview: (url: string | null) => void;
  setCurrentSale: (sale: any) => void;
  currentSale: any;
  useSupabase: boolean;
}

const SalePhotoUpload: React.FC<SalePhotoUploadProps> = ({
  photoPreview,
  setPhotoPreview,
  setCurrentSale,
  currentSale,
  useSupabase,
}) => {
  const { toast } = useToast();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [showModal, setShowModal] = useState(false);

  const handleAddPhoto = () => {
    photoInputRef.current?.click();
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let photoUrl;
      
      if (useSupabase) {
        photoUrl = await uploadVehicleImage(file);
      } else {
        // Local storage fallback
        photoUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
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
  };

  return (
    <div className="border p-4 rounded-lg flex flex-col items-center justify-center bg-gray-50 min-h-[200px]">
      <input
        type="file"
        ref={photoInputRef}
        onChange={handlePhotoChange}
        accept="image/*"
        className="hidden"
      />

      {photoPreview ? (
        <div className="relative w-full">
          <ImagePreviewModal
            imageUrl={photoPreview}
            alt="Vehicle photo"
            showModal={showModal}
            onClose={() => setShowModal(false)}
            trigger={
              <div 
                className="relative w-full h-[180px] mb-2 overflow-hidden rounded-lg bg-gray-100 cursor-pointer"
                onClick={() => setShowModal(true)}
              >
                <img
                  src={photoPreview}
                  alt="Vehicle photo"
                  className="w-full h-full object-contain"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
                  <ZoomIn className="h-8 w-8 text-white" />
                </div>
              </div>
            }
          />
          <div className="flex mt-2 justify-center gap-2">
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
          <div 
            className="bg-gray-200 w-32 h-32 flex items-center justify-center rounded-lg mb-4 cursor-pointer"
            onClick={handleAddPhoto}
          >
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
    </div>
  );
};

export default SalePhotoUpload;