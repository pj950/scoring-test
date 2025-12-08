import { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  const maintenanceMode = process.env.MAINTENANCE_MODE;
  
  // If MAINTENANCE_MODE is explicitly set to 'false', return 404
  // Otherwise (true, undefined, or any other value), return 200 (normal operation)
  const isMaintenance = maintenanceMode === 'false';
  
  return res.status(isMaintenance ? 404 : 200).json({
    maintenance: isMaintenance,
  });
}
