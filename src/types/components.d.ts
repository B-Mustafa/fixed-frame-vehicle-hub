
export interface SalePhotoUploadProps {
  photoPreview: string | null;
  setPhotoPreview: (url: string | null) => void;
  setCurrentSale: (sale: any) => void;
  currentSale: any;
  useSupabase: boolean;
  onViewPhoto?: () => void;
}

export interface ImagePreviewModalProps {
  imageUrl: string;
  showCloseButton?: boolean;
  onClose: () => void;
  alt?: string;
  showModal: boolean;
}
