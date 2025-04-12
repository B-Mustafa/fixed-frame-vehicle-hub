
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { X, ZoomIn } from "lucide-react";

interface ImagePreviewModalProps {
  imageUrl: string | null;
  alt?: string;
  trigger?: React.ReactNode;
  showCloseButton?: boolean;
  onClose?: () => void;
  showModal?: boolean; // Added this prop
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  imageUrl,
  alt = "Image preview",
  trigger,
  showCloseButton = true,
  onClose,
  showModal = false // Added this prop with default value
}) => {
  if (!imageUrl) return null;

  return (
    <Dialog open={showModal} onOpenChange={(open) => !open && onClose?.()}>
      <DialogTrigger asChild>
        {trigger || (
          <div className="cursor-pointer relative group">
            <img 
              src={imageUrl} 
              alt={alt} 
              className="w-full h-full object-contain rounded-md border border-gray-200"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
              <ZoomIn className="h-8 w-8 text-white" />
            </div>
          </div>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[95vh] p-0 overflow-hidden">
        {showCloseButton && (
          <DialogClose 
            className="absolute top-2 right-2 z-10 bg-black/50 rounded-full p-1 hover:bg-black/70 transition-colors"
            onClick={() => onClose?.()}
          >
            <X className="h-6 w-6 text-white" />
          </DialogClose>
        )}
        <div className="w-full h-[95vh] flex items-center justify-center bg-black/95 p-4">
          <img 
            src={imageUrl} 
            alt={alt} 
            className="max-w-full max-h-full object-contain"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImagePreviewModal;