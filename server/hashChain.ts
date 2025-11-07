import { createHash } from 'crypto';

export interface EventData {
  assetId: string;
  type: string;
  data?: any;
  photoUrls?: string[];
  createdBy?: string | null;
  createdAt: Date;
}

export function computeHash(prevHash: string | null, eventData: EventData): string {
  const dataString = JSON.stringify({
    assetId: eventData.assetId,
    type: eventData.type,
    data: eventData.data,
    photoUrls: eventData.photoUrls,
    createdBy: eventData.createdBy,
    createdAt: eventData.createdAt.toISOString(),
    prevHash: prevHash || 'GENESIS',
  });
  
  return createHash('sha256').update(dataString).digest('hex');
}

export async function validateHashChain(events: Array<{ prevHash: string | null; hash: string | null; assetId: string; type: string; data: any; photoUrls?: string[] | null; createdBy: string | null; createdAt: Date }>): Promise<{
  isValid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const expectedPrevHash = i === 0 ? null : events[i - 1].hash;
    
    if (event.prevHash !== expectedPrevHash) {
      errors.push(`Event ${i}: Invalid prevHash. Expected: ${expectedPrevHash}, Got: ${event.prevHash}`);
    }
    
    const expectedHash = computeHash(event.prevHash, {
      assetId: event.assetId,
      type: event.type,
      data: event.data,
      photoUrls: event.photoUrls || [],
      createdBy: event.createdBy,
      createdAt: event.createdAt,
    });
    
    if (event.hash !== expectedHash) {
      errors.push(`Event ${i}: Hash mismatch. Expected: ${expectedHash}, Got: ${event.hash}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}
