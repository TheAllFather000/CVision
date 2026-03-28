import { API_KEYS } from "../constants/config";

export interface SceneDescription {
  description: string;
  dangers: string[];
  objects: string[];
  navigation: string[];
}

export interface AIServiceError {
  type: "api_error" | "parse_error" | "network_error";
  message: string;
}

export const analyzeScene = async (
  imageBase64: string,
): Promise<SceneDescription | AIServiceError> => {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEYS.OPENAI}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are CVision, an AI assistant for visually impaired users. Analyze the image and respond ONLY with valid JSON in this exact format:
{
  "description": "Brief description of what you see (1-2 sentences)",
  "dangers": ["any immediate dangers", "like stairs", "potholes", "traffic"],
  "objects": ["key objects nearby", "like doors", "benches", "people"],
  "navigation": ["useful navigation hints", "like clear path ahead", "exit to the right"]
}
Prioritize safety. If nothing dangerous, say "Path looks clear".`,
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 400,
      }),
    });

    if (!response.ok) {
      return {
        type: "api_error",
        message: `OpenAI API error: ${response.status}`,
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return { type: "parse_error", message: "Empty response from AI" };
    }

    const cleaned = content.replace(/```json\n?|```\n?/g, "").trim();
    return JSON.parse(cleaned) as SceneDescription;
  } catch (error: any) {
    return {
      type: "network_error",
      message: error.message || "Network error",
    };
  }
};

export const describeEnvironment = async (
  imageBase64: string,
): Promise<string | AIServiceError> => {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEYS.OPENAI}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are CVision, a voice assistant for visually impaired users. Describe the scene in natural, conversational language as if you're guiding them. Focus on:
- What's directly ahead
- What to watch out for
- Where exits or paths are
- Anything unusual or noteworthy

Keep it under 3 sentences. Be warm and helpful.`,
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      return {
        type: "api_error",
        message: `OpenAI API error: ${response.status}`,
      };
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "I couldn't analyze the scene.";
  } catch (error: any) {
    return {
      type: "network_error",
      message: error.message || "Network error",
    };
  }
};
