import Anthropic from '@anthropic-ai/sdk';

let client = null;

function getClient() {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

const llmService = {
  /**
   * Invoke LLM via Anthropic Claude
   * @param {Object} params
   * @param {string} params.prompt - The user prompt
   * @param {Object} [params.response_json_schema] - Optional JSON schema for structured output
   * @param {string[]} [params.file_urls] - Optional file URLs to include as context
   * @returns {Promise<string|Object>} Text response or parsed JSON if schema provided
   */
  async invoke({ prompt, response_json_schema, file_urls }) {
    const anthropic = getClient();

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

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages,
    });

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
