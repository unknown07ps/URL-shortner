
const QRCode = require('qrcode');

class QRService {
  /**
   * Generate QR code for a URL
   * @param {string} url - The URL to encode
   * @param {object} options - QR code options
   * @returns {Promise<string>} Base64 encoded QR code
   */
  static async generateQRCode(url, options = {}) {
    try {
      const defaultOptions = {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: options.darkColor || '#000000',
          light: options.lightColor || '#FFFFFF'
        },
        width: options.width || 300
      };

      const qrCodeDataURL = await QRCode.toDataURL(url, defaultOptions);
      return qrCodeDataURL;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Generate QR code as buffer
   * @param {string} url - The URL to encode
   * @param {object} options - QR code options
   * @returns {Promise<Buffer>} QR code buffer
   */
  static async generateQRCodeBuffer(url, options = {}) {
    try {
      const defaultOptions = {
        errorCorrectionLevel: 'H',
        margin: 1,
        color: {
          dark: options.darkColor || '#000000',
          light: options.lightColor || '#FFFFFF'
        },
        width: options.width || 300
      };

      const buffer = await QRCode.toBuffer(url, defaultOptions);
      return buffer;
    } catch (error) {
      console.error('Error generating QR code buffer:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Generate SVG QR code
   * @param {string} url - The URL to encode
   * @param {object} options - QR code options
   * @returns {Promise<string>} SVG string
   */
  static async generateQRCodeSVG(url, options = {}) {
    try {
      const defaultOptions = {
        errorCorrectionLevel: 'H',
        type: 'svg',
        color: {
          dark: options.darkColor || '#000000',
          light: options.lightColor || '#FFFFFF'
        }
      };

      const svg = await QRCode.toString(url, defaultOptions);
      return svg;
    } catch (error) {
      console.error('Error generating QR code SVG:', error);
      throw new Error('Failed to generate QR code SVG');
    }
  }
}

module.exports = QRService;