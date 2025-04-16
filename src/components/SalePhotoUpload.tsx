
import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { uploadVehicleImage } from "@/integrations/supabase/services/storageService";
import { useToast } from "@/hooks/use-toast";
import { saveToBackup } from "@/utils/backupUtils";

export interface SalePhotoUploadProps {
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
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);

      if (useSupabase) {
        // Upload to Supabase Storage
        const url = await uploadVehicleImage(file);
        setPhotoPreview(url);
        setCurrentSale({ ...currentSale, photoUrl: url });
        toast({
          title: "Photo Uploaded",
          description: "Vehicle photo uploaded successfully",
        });
      } else {
        // Direct file processing, no dialog shown
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          setPhotoPreview(dataUrl);
          setCurrentSale({ ...currentSale, photoUrl: dataUrl });
          
          // Save to the fixed location automatically
          const fileName = `vehicle_${currentSale.vehicleNo || currentSale.id || Date.now()}`;
          saveToBackup(dataUrl, fileName, "image");
          
          toast({
            title: "Photo Added",
            description: "Vehicle photo has been added and saved locally",
          });
        };
        reader.readAsDataURL(file);
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload the vehicle photo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = () => {
    // No confirmation dialog, just remove
    setPhotoPreview(null);
    setCurrentSale({ ...currentSale, photoUrl: null });
    toast({
      title: "Photo Removed",
      description: "Vehicle photo has been removed",
    });
  };

  return (
    <div className="col-span-1">
      <Card className="overflow-hidden">
        <div className="p-4 flex flex-col items-center space-y-3">
          <div className="w-full h-48 bg-gray-100 flex items-center justify-center rounded-md overflow-hidden">
            {photoPreview ? (
              <img
                src={photoPreview}
                alt="Vehicle"
                className="w-full h-full object-cover cursor-pointer"
                onClick={onViewPhoto}
              />
            ) : (
              <div className="text-gray-400 text-center p-4">
                No photo uploaded
              </div>
            )}
          </div>
          <div className="flex space-x-2 w-full">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleUploadClick}
              disabled={uploading}
            >
              {uploading ? "Uploading..." : "Upload Photo"}
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
              disabled={uploading}
            />
            {photoPreview && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onViewPhoto}
                >
                  View
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleRemovePhoto}
                >
                  Remove
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SalePhotoUpload;
