import singleFamilyImg from '@assets/stock_images/modern_single_family_c7496a88.jpg';
import condoImg from '@assets/stock_images/luxury_condo_apartme_eec5b9d9.jpg';
import commercialImg from '@assets/stock_images/commercial_office_bu_d0ded0cd.jpg';
import multiFamilyImg from '@assets/stock_images/multi-family_apartme_924a57e9.jpg';
import constructionImg from '@assets/stock_images/construction_equipme_fb9307d0.jpg';
import emptyStateImg from '@assets/stock_images/empty_state_illustra_73cbad0f.jpg';

export const propertyTypeImages: Record<string, string> = {
  SINGLE_FAMILY: singleFamilyImg,
  CONDO: condoImg,
  MULTI_FAMILY: multiFamilyImg,
  COMMERCIAL: commercialImg,
};

export const assetImages = {
  construction: constructionImg,
  empty: emptyStateImg,
};

/**
 * Get property type image with defensive fallback
 * @param propertyType - The property type key (SINGLE_FAMILY, CONDO, etc.)
 * @returns Image URL - defaults to single family home if type is unknown
 */
export function getPropertyTypeImage(propertyType: string | null | undefined): string {
  if (!propertyType) return singleFamilyImg; // Default to single family instead of empty state
  return propertyTypeImages[propertyType] || singleFamilyImg;
}
