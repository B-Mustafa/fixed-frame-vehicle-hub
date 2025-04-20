
// Re-export all services from their respective modules
export {
  getSupabaseSales,
  addSupabaseSale,
  updateSupabaseSale,
  deleteSupabaseSale
} from './services/salesService';

export {
  uploadVehicleImage,
  deleteVehicleImage
} from './services/storageService';

export type { SupabaseSale } from './types/sale';

// Also export the utility functions
export {
  vehicleSaleToSupabase,
  supabaseSaleToVehicleSale,
  snakeToCamel,
  camelToSnake,
  transformKeys
} from './utils/transforms';

