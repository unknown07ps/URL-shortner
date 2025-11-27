
const UAParser = require('ua-parser-js');

class AnalyticsService {
  /**
   * Parse request data for analytics
   * @param {object} req - Express request object
   * @returns {object} Parsed analytics data
   */
  static parseRequestData(req) {
    const parser = new UAParser(req.headers['user-agent']);
    const result = parser.getResult();

    return {
      ipAddress: this.getClientIP(req),
      userAgent: req.headers['user-agent'] || 'Unknown',
      referer: req.headers['referer'] || req.headers['referrer'] || 'Direct',
      device: result.device.type || 'desktop',
      browser: result.browser.name || 'Unknown',
      os: result.os.name || 'Unknown',
      
      country: null,
      city: null
    };
  }

  /**
   * Get client IP address (handles proxies)
   * @param {object} req - Express request object
   * @returns {string} Client IP address
   */
  static getClientIP(req) {
    return (
      req.headers['x-forwarded-for']?.split(',')[0].trim() ||
      req.headers['x-real-ip'] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      req.ip ||
      'Unknown'
    );
  }

  /**
   * Calculate click statistics
   * @param {Array} clickDetails - Array of click records
   * @param {number} days - Number of days to analyze
   * @returns {object} Statistics object
   */
  static calculateStats(clickDetails, days = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentClicks = clickDetails.filter(
      click => new Date(click.timestamp) >= cutoffDate
    );

    // Clicks by date
    const clicksByDate = {};
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      clicksByDate[dateStr] = 0;
    }

    recentClicks.forEach(click => {
      const dateStr = new Date(click.timestamp).toISOString().split('T')[0];
      if (clicksByDate.hasOwnProperty(dateStr)) {
        clicksByDate[dateStr]++;
      }
    });

    // Top browsers
    const browsers = {};
    recentClicks.forEach(click => {
      if (click.browser) {
        browsers[click.browser] = (browsers[click.browser] || 0) + 1;
      }
    });

    // Top devices
    const devices = {};
    recentClicks.forEach(click => {
      if (click.device) {
        devices[click.device] = (devices[click.device] || 0) + 1;
      }
    });

    // Top referrers
    const referrers = {};
    recentClicks.forEach(click => {
      if (click.referer && click.referer !== 'Direct') {
        try {
          const url = new URL(click.referer);
          const domain = url.hostname;
          referrers[domain] = (referrers[domain] || 0) + 1;
        } catch (e) {
          referrers['Other'] = (referrers['Other'] || 0) + 1;
        }
      }
    });

    // Top countries
    const countries = {};
    recentClicks.forEach(click => {
      if (click.country) {
        countries[click.country] = (countries[click.country] || 0) + 1;
      }
    });

    return {
      totalClicks: recentClicks.length,
      clicksByDate: Object.entries(clicksByDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count })),
      topBrowsers: Object.entries(browsers)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, count]) => ({ name, count })),
      topDevices: Object.entries(devices)
        .sort(([, a], [, b]) => b - a)
        .map(([name, count]) => ({ name, count })),
      topReferrers: Object.entries(referrers)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, count]) => ({ name, count })),
      topCountries: Object.entries(countries)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }))
    };
  }

  /**
   * Get overview statistics for all URLs
   * @param {Array} urls - Array of URL documents
   * @returns {object} Overview statistics
   */
  static getOverviewStats(urls) {
    const totalUrls = urls.length;
    const totalClicks = urls.reduce((sum, url) => sum + url.clicks, 0);
    const activeUrls = urls.filter(url => url.isActive).length;
    
    const avgClicksPerUrl = totalUrls > 0 ? (totalClicks / totalUrls).toFixed(2) : 0;

    // Most clicked URLs
    const topUrls = urls
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10)
      .map(url => ({
        shortCode: url.shortCode,
        originalUrl: url.originalUrl,
        clicks: url.clicks,
        createdAt: url.createdAt
      }));

    // Recent URLs
    const recentUrls = urls
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)
      .map(url => ({
        shortCode: url.shortCode,
        originalUrl: url.originalUrl,
        clicks: url.clicks,
        createdAt: url.createdAt
      }));

    return {
      totalUrls,
      totalClicks,
      activeUrls,
      avgClicksPerUrl,
      topUrls,
      recentUrls
    };
  }
}

module.exports = AnalyticsService;