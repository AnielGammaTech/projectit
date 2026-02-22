import Anthropic from '@anthropic-ai/sdk';
import entityService from './entityService.js';

let client = null;

function getClient() {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

// --- AI Instructions Cache ---
let instructionsCache = null;
let instructionsCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getAIInstructions(feature) {
  const now = Date.now();

  // Refresh cache if stale
  if (!instructionsCache || now - instructionsCacheTime > CACHE_TTL) {
    try {
      const settings = await entityService.filter('IntegrationSettings', { provider: 'claude_ai' });
      instructionsCache = settings[0]?.instructions || {};
      instructionsCacheTime = now;
    } catch {
      instructionsCache = {};
      instructionsCacheTime = now;
    }
  }

  // Build system message from global + feature-specific instructions
  const parts = [];

  if (instructionsCache.global?.trim()) {
    parts.push(instructionsCache.global.trim());
  }

  if (feature && instructionsCache[feature]?.trim()) {
    parts.push(instructionsCache[feature].trim());
  }

  return parts.length > 0 ? parts.join('\n\n') : null;
}

// Allow external cache invalidation (e.g., after settings save)
function clearInstructionsCache() {
  instructionsCache = null;
  instructionsCacheTime = 0;
}

const llmService = {
  clearInstructionsCache,

  /**
   * Invoke LLM via Anthropic Claude
   * @param {Object} params
   * @param {string} params.prompt - The user prompt
   * @param {Object} [params.response_json_schema] - Optional JSON schema for structured output
   * @param {string[]} [params.file_urls] - Optional file URLs to include as context
   * @param {string} [params.feature] - Feature identifier for per-feature instructions
   * @returns {Promise<string|Object>} Text response or parsed JSON if schema provided
   */
  async invoke({ prompt, response_json_schema, file_urls, feature }) {
    const anthropic = getClient();

    // Load custom AI instructions
    const systemMessage = await getAIInstructions(feature);

    const messages = [];

    // Build the user message content
    const content = [];

    // Add file URLs as context if provided
    if (file_urls && file_urls.length > 0) {
      content.push({
        type: 'text',
        text: `Referenced files:\n${file_urls.map(url => `- ${url}`).join('\n')}\n\n`,
      });
    }

    // Add the main prompt
    let finalPrompt = prompt;
    if (response_json_schema) {
      finalPrompt += `\n\nYou MUST respond with valid JSON matching this schema:\n${JSON.stringify(response_json_schema, null, 2)}\n\nRespond with ONLY the JSON, no other text.`;
    }

    content.push({ type: 'text', text: finalPrompt });

    messages.push({ role: 'user', content });

    const requestParams = {
      model: 'claude-opus-4-20250514',
      max_tokens: 8192,
      messages,
    };

    // Add system message if custom instructions exist
    if (systemMessage) {
      requestParams.system = systemMessage;
    }

    const response = await anthropic.messages.create(requestParams);

    const responseText = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('');

    // If JSON schema was requested, parse the response
    if (response_json_schema) {
      try {
        // Try to extract JSON from the response (handle markdown code blocks)
        let jsonStr = responseText;
        const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1];
        }
        return JSON.parse(jsonStr.trim());
      } catch {
        // If parsing fails, return the raw text
        return responseText;
      }
    }

    return responseText;
  },
};

export default llmService;
