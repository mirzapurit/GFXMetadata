import { Groq } from 'groq-sdk';

class GroqService {
  constructor() {
    this.apiKeys = [];
    this.currentKeyIndex = 0;
  }

  setApiKeys(keys) {
    this.apiKeys = keys.filter(k => k && k.trim() !== '');
    this.currentKeyIndex = 0;
  }

  getNextKey() {
    if (this.apiKeys.length === 0) return null;
    const key = this.apiKeys[this.currentKeyIndex];
    // Round Robin: increment for next time
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    return key;
  }

  async generateMetadata(base64Image, options) {
    const { titleLen, descLen, keywordCount, isSingleKeyword, isPng, model = "meta-llama/llama-4-scout-17b-16e-instruct" } = options;
    
    // Retry logic for fallback
    let attempts = 0;
    const maxAttempts = this.apiKeys.length;

    while (attempts < maxAttempts) {
      const apiKey = this.getNextKey();
      if (!apiKey) throw new Error("No API keys configured");

      try {
        const groq = new Groq({ apiKey, dangerouslyAllowBrowser: true });
        
        const prompt = `Analyze this image and provide metadata in JSON format with exactly three keys: "title", "description", and "keywords".
${isPng ? '\nCRITICAL: This is a PNG image with a transparent background. DO NOT describe any background, settings, or environments. Focus ONLY on the main subject.' : ''}

STRICT MANDATORY REQUIREMENTS:
1. Title: MUST be exactly ONE SINGLE, grammatically complete sentence or descriptive phrase.
   - **CRITICAL**: Do NOT end with a period (".").
   - It MUST be exactly between ${titleLen[0]} and ${titleLen[1]} characters long (including spaces). 
   - NEVER end mid-word or mid-phrase. If it's too long, write a conciser phrase. If too short, add visual details. COUNT YOUR CHARACTERS CAREFULLY.
2. Keywords: MUST be an array of EXACTLY ${keywordCount[1]} unique descriptive keywords. ${isSingleKeyword ? 'EACH keyword MUST be ONE SINGLE WORD.' : ''}
3. Description: MUST be between ${descLen[0]} and ${descLen[1]} characters long.
   - MUST be multiple complete sentences. Do not truncate.

CRITICAL CHARACTER COUNT AUDIT:
- If YOUR 'title' is < ${titleLen[0]} or > ${titleLen[1]} characters, it is a FAILURE. Minimum is ${titleLen[0]}, Maximum is ${titleLen[1]}.
- If YOUR 'title' ends with a period, it is a FAILURE.

Guidelines:
- Output: ONLY the JSON object. No markdown, no extra text.
`;

        const response = await groq.chat.completions.create({
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                {
                  type: "image_url",
                  image_url: {
                    url: base64Image,
                  },
                },
              ],
            },
          ],
          model: model,
          response_format: { type: "json_object" },
        });

        const content = JSON.parse(response.choices[0].message.content);
        return content;

      } catch (error) {
        console.error(`Attempt ${attempts + 1} failed with key ${apiKey.substring(0, 8)}...`, error);
        attempts++;
        if (attempts >= maxAttempts) {
          throw new Error("All API keys failed or were exhausted.");
        }
      }
    }
  }

  async generatePrompt(base64Image, options) {
    const { model = "meta-llama/llama-4-scout-17b-16e-instruct", promptLen = [100, 500] } = options;
    
    let attempts = 0;
    const maxAttempts = this.apiKeys.length;

    while (attempts < maxAttempts) {
      const apiKey = this.getNextKey();
      if (!apiKey) throw new Error("No API keys configured");

      try {
        const groq = new Groq({ apiKey, dangerouslyAllowBrowser: true });
        
        const prompt = `Analyze this image and provide a highly detailed, creative, and descriptive manual prompt that could be used to recreate this image. 
Focus on style, lighting, composition, and subject details. 

STRICT REQUIREMENT: The output prompt MUST be raw text only. 
DO NOT use JSON, brackets, or any structured format like [ { "prompt": "" } ].
The output MUST be between ${promptLen[0]} and ${promptLen[1]} characters long (aim for approximately 600 characters).

Output ONLY the prompt text.`;

        const response = await groq.chat.completions.create({
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                {
                  type: "image_url",
                  image_url: {
                    url: base64Image,
                  },
                },
              ],
            },
          ],
          model: model,
        });

        return response.choices[0].message.content;

      } catch (error) {
        console.error(`Attempt ${attempts + 1} failed with key ${apiKey.substring(0, 8)}...`, error);
        attempts++;
        if (attempts >= maxAttempts) {
          throw new Error("All API keys failed or were exhausted.");
        }
      }
    }
  }

  // Retry logic for fallback

  sanitizePrompt(text) {
    if (!text) return "";
    let cleaned = text.trim();
    
    try {
      if (cleaned.startsWith('[') || cleaned.startsWith('{')) {
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed) && parsed[0]?.prompt) return parsed[0].prompt;
        if (parsed.prompt) return parsed.prompt;
      }
    } catch (e) {}

    cleaned = cleaned.replace(/^\[\s*\{\s*"prompt":\s*"/i, '');
    cleaned = cleaned.replace(/"\s*\}\s*\]$/i, '');
    cleaned = cleaned.replace(/^\{\s*"prompt":\s*"/i, '');
    cleaned = cleaned.replace(/"\s*\}$/i, '');
    
    return cleaned.trim();
  }

  // Helper to convert File to Base64
  static fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  }
}

export const groqService = new GroqService();
export default GroqService;
