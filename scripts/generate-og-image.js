import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const WIDTH = 1200;
const HEIGHT = 630;

async function generateOGImage() {
  try {
    // Create gradient background SVG
    const gradientSvg = `
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#1e293b;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#grad)"/>
      </svg>
    `;

    // Load the vault logo
    const logoPath = path.join(process.cwd(), 'client', 'public', 'vault-logo.png');
    const logo = await sharp(logoPath)
      .resize(600, 600, { fit: 'inside' }) // Make it bigger to fill more space
      .toBuffer();

    // Create background
    const background = await sharp(Buffer.from(gradientSvg))
      .png()
      .toBuffer();

    // Composite logo onto background (centered)
    const finalImage = await sharp(background)
      .composite([{
        input: logo,
        gravity: 'center'
      }])
      .png()
      .toFile(path.join(process.cwd(), 'client', 'public', 'og-image.png'));

    console.log('✅ og-image.png created successfully!');
    console.log('Dimensions:', WIDTH, 'x', HEIGHT);
    console.log('Location: client/public/og-image.png');
  } catch (error) {
    console.error('❌ Error creating og-image.png:', error);
    process.exit(1);
  }
}

generateOGImage();