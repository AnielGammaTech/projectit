import entityService from '../../services/entityService.js';

const GIPHY_API_BASE = 'https://api.giphy.com/v1/gifs';

export default async function handler(req, res) {
  try {
    const { action } = req.body;

    if (action === 'checkEnvStatus') {
      return res.json({
        success: true,
        hasApiKey: !!process.env.GIPHY_API_KEY,
      });
    }

    if (action === 'testConnection') {
      const apiKey = process.env.GIPHY_API_KEY;
      if (!apiKey) {
        return res.json({ success: false, error: 'GIPHY_API_KEY environment variable is not set' });
      }

      // Test by fetching trending (limit 1) to verify the key works
      const response = await fetch(`${GIPHY_API_BASE}/trending?api_key=${apiKey}&limit=1&rating=g`);

      if (response.ok) {
        const data = await response.json();
        return res.json({
          success: true,
          message: 'Connected to Giphy API successfully!',
          meta: data.meta,
        });
      } else {
        const err = await response.json().catch(() => ({}));
        return res.json({ success: false, error: err.message || 'Invalid API key or Giphy API error' });
      }
    }

    if (action === 'saveSettings') {
      const { rating, language, enabled } = req.body;

      const existing = await entityService.filter('IntegrationSettings', { provider: 'giphy' });
      const settingsData = {
        provider: 'giphy',
        enabled: enabled !== false,
        rating: rating || 'g',
        language: language || 'en',
      };

      if (existing[0]) {
        await entityService.update('IntegrationSettings', existing[0].id, settingsData);
      } else {
        await entityService.create('IntegrationSettings', settingsData);
      }

      return res.json({ success: true, message: 'Giphy settings saved' });
    }

    if (action === 'search') {
      const apiKey = process.env.GIPHY_API_KEY;
      if (!apiKey) {
        return res.json({ success: false, error: 'GIPHY_API_KEY not configured' });
      }

      const { query, limit = 12, offset = 0 } = req.body;
      if (!query) return res.status(400).json({ error: 'Search query is required' });

      // Get saved settings for rating filter
      const settings = await entityService.filter('IntegrationSettings', { provider: 'giphy' });
      const rating = settings[0]?.rating || 'g';
      const lang = settings[0]?.language || 'en';

      const url = `${GIPHY_API_BASE}/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}&rating=${rating}&lang=${lang}`;
      const response = await fetch(url);

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return res.json({ success: false, error: err.message || 'Search failed' });
      }

      const data = await response.json();
      return res.json({
        success: true,
        gifs: data.data.map(gif => ({
          id: gif.id,
          title: gif.title,
          url: gif.url,
          images: {
            fixed_height: gif.images.fixed_height,
            fixed_width: gif.images.fixed_width,
            preview_gif: gif.images.preview_gif,
            downsized: gif.images.downsized,
            original: gif.images.original,
          },
        })),
        pagination: data.pagination,
      });
    }

    if (action === 'trending') {
      const apiKey = process.env.GIPHY_API_KEY;
      if (!apiKey) {
        return res.json({ success: false, error: 'GIPHY_API_KEY not configured' });
      }

      const { limit = 12, offset = 0 } = req.body;
      const settings = await entityService.filter('IntegrationSettings', { provider: 'giphy' });
      const rating = settings[0]?.rating || 'g';

      const url = `${GIPHY_API_BASE}/trending?api_key=${apiKey}&limit=${limit}&offset=${offset}&rating=${rating}`;
      const response = await fetch(url);

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return res.json({ success: false, error: err.message || 'Failed to fetch trending' });
      }

      const data = await response.json();
      return res.json({
        success: true,
        gifs: data.data.map(gif => ({
          id: gif.id,
          title: gif.title,
          url: gif.url,
          images: {
            fixed_height: gif.images.fixed_height,
            fixed_width: gif.images.fixed_width,
            preview_gif: gif.images.preview_gif,
            downsized: gif.images.downsized,
            original: gif.images.original,
          },
        })),
        pagination: data.pagination,
      });
    }

    return res.status(400).json({ error: 'Invalid action. Use: checkEnvStatus, testConnection, saveSettings, search, or trending' });
  } catch (error) {
    console.error('Giphy function error:', error);
    return res.status(500).json({ error: error.message });
  }
}
