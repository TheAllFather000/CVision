import { API_KEYS } from "../constants/config";

interface SceneDescription {
  description: string;
  dangers: string[];
  objects: string[];
  navigation: string[];
}

export const analyzeFrame = async (
  imageBase64: string,
): Promise<SceneDescription> => {
  const API_KEY = API_KEYS.OPENAI;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "system",
          content: `You are CVision, an AI assistant for visually impaired users. Analyze the image and respond in JSON format:
          {
            "description": "Brief description of the scene (1-2 sentences)",
            "dangers": ["List any potential dangers like obstacles, traffic, stairs, etc."],
            "objects": ["Key objects like doors, chairs, people"],
            "navigation": ["Navigation hints like 'door ahead', 'stairs to left', etc."]
          }
          Be concise and prioritize safety information.`,
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
      max_tokens: 300,
    }),
  });

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
};

export const describeScreen = async (
  screenshotBase64: string,
): Promise<string> => {
  const API_KEY = API_KEYS.OPENAI;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "system",
          content:
            "Describe this phone screen for a visually impaired user. Focus on text content, buttons, and interactive elements.",
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${screenshotBase64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 200,
    }),
  });

  const data = await response.json();
  return data.choices[0].message.content;
};
