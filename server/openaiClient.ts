import OpenAI from "openai";

// This is using Replit's AI Integrations service, which provides OpenAI-compatible API access without requiring your own OpenAI API key.
// Charges are billed to your Replit credits.
export const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

export interface WarrantyInfo {
  warrantyStartDate?: string;
  warrantyEndDate?: string;
  warrantyDurationMonths?: number;
  maintenanceSchedule?: Array<{
    description: string;
    intervalMonths: number;
    firstDueDate?: string;
  }>;
  brand?: string;
  model?: string;
  productName?: string;
  notes?: string;
}

export interface LogoGenerationParams {
  businessName: string;
  industry: string;
  colors?: string[];
  style?: string;
  keywords?: string;
}

export interface LogoGenerationResult {
  imageUrl: string;
  prompt: string;
}

export async function generateLogos(params: LogoGenerationParams): Promise<LogoGenerationResult[]> {
  const { businessName, industry, colors, style, keywords } = params;
  
  // Build color scheme description
  const colorDesc = colors && colors.length > 0 
    ? colors.join(' and ') 
    : 'professional complementary colors';
  
  // Intelligent style mapping with detailed design attributes
  const styleAttributes = {
    MODERN: 'sleek modern minimalist, clean lines, contemporary sans-serif',
    PROFESSIONAL: 'corporate professional trustworthy, refined classic, timeless',
    PLAYFUL: 'creative playful energetic, dynamic rounded shapes, approachable',
    ELEGANT: 'sophisticated elegant refined, graceful curves, luxury premium',
    BOLD: 'strong bold powerful, thick geometric shapes, confident impactful',
    VINTAGE: 'classic vintage retro, heritage traditional, nostalgic timeless'
  };
  
  const styleDesc = style && styleAttributes[style as keyof typeof styleAttributes] 
    ? styleAttributes[style as keyof typeof styleAttributes]
    : styleAttributes.MODERN;
  
  // Intelligent industry context - add specific visual cues
  const industryContext = keywords 
    ? `${industry} (${keywords})` 
    : industry;
  
  // Build contextual keyword hints
  const keywordHints = keywords 
    ? `, featuring ${keywords} as a visual element` 
    : '';
  
  // Expert prompts for 4 different logo variations with intelligent context
  const prompts = [
    // Icon-based logo with industry context
    `Professional ${styleDesc} icon logo for ${businessName}, ${industryContext}. Ultra-premium design with ${colorDesc}, clean geometric symbol${keywordHints}, negative space mastery, perfect symmetry, white background, vector illustration, award-winning design`,
    
    // Badge/emblem with industry personality
    `Circular ${styleDesc} badge emblem for ${businessName}, ${industryContext}. Premium quality with ${colorDesc}${keywordHints}, professional contractor branding, expert craftsmanship, white background, vector art, distinctive mark`,
    
    // Wordmark with style personality
    `${styleDesc.split(',')[0]} wordmark logo for ${businessName} (${industryContext}). Stylized custom lettering with ${colorDesc}${keywordHints}, typographic excellence, memorable identity, white background, vector design, premium brand`,
    
    // Abstract symbol with smart context
    `Abstract ${styleDesc} symbol logo for ${businessName}, ${industryContext} company. Unique geometric mark with ${colorDesc}${keywordHints}, sophisticated visual identity, scalable design, white background, vector perfect, iconic brand`,
  ];
  
  // Generate all 4 logo variations in parallel
  const results = await Promise.all(
    prompts.map(async (prompt) => {
      try {
        const response = await openai.images.generate({
          model: "gpt-image-1",
          prompt,
          n: 1,
          size: "1024x1024",
        });
        
        // gpt-image-1 returns base64 data in b64_json field, not URLs
        const base64Data = response.data?.[0]?.b64_json;
        if (!base64Data) {
          console.error("❌ No base64 data in response:", response.data);
          throw new Error("No image data returned from gpt-image-1");
        }
        
        // Convert base64 to data URL for frontend display
        const imageUrl = `data:image/png;base64,${base64Data}`;
        
        return { imageUrl, prompt };
      } catch (error) {
        console.error(`Error generating logo with prompt: ${prompt}`, error);
        throw error;
      }
    })
  );
  
  return results;
}

export async function parseWarrantyDocument(imageBase64: string): Promise<WarrantyInfo> {
  try {
    // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Using gpt-4o for vision capabilities
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this warranty or product documentation image and extract the following information in JSON format:
{
  "warrantyStartDate": "YYYY-MM-DD or null",
  "warrantyEndDate": "YYYY-MM-DD or null",
  "warrantyDurationMonths": number or null,
  "maintenanceSchedule": [
    {
      "description": "string (e.g., 'Replace air filter')",
      "intervalMonths": number (e.g., 3 for quarterly),
      "firstDueDate": "YYYY-MM-DD or null"
    }
  ],
  "brand": "string or null",
  "model": "string or null",
  "productName": "string or null",
  "notes": "any important warranty terms or conditions"
}

Instructions:
- Extract all dates in YYYY-MM-DD format
- If warranty duration is mentioned (e.g., "2 years"), convert to months
- Identify any maintenance schedules (e.g., "change filter every 3 months")
- Extract brand, model, and product name if visible
- Be thorough but only include information that's actually present in the image
- Return valid JSON only, no additional text`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1500,
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    
    return {
      warrantyStartDate: parsed.warrantyStartDate || undefined,
      warrantyEndDate: parsed.warrantyEndDate || undefined,
      warrantyDurationMonths: parsed.warrantyDurationMonths || undefined,
      maintenanceSchedule: parsed.maintenanceSchedule || [],
      brand: parsed.brand || undefined,
      model: parsed.model || undefined,
      productName: parsed.productName || undefined,
      notes: parsed.notes || undefined,
    };
  } catch (error) {
    console.error("Error parsing warranty document:", error);
    throw new Error("Failed to parse warranty document");
  }
}
