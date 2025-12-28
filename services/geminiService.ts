import { GoogleGenAI } from "@google/genai";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key not found");
    throw new Error("API Key is missing");
  }
  return new GoogleGenAI({ apiKey });
};

// Convert base64 data to a format Gemini accepts if needed, 
// or clean up the data URL header.
const cleanBase64 = (dataUrl: string) => {
  return dataUrl.split(',')[1];
};

export const analyzeImageForPrint = async (
  imageBase64: string, 
  width: number, 
  height: number,
  dpi: number
): Promise<string> => {
  try {
    const ai = getAiClient();
    const cleanData = cleanBase64(imageBase64);

    const prompt = `
      I am a professional printer. Analyze this image for large format printing.
      Current Settings:
      - Physical Dimensions: ${width}cm x ${height}cm
      - Target DPI: ${dpi}
      
      Please provide a professional assessment in JSON format with the following keys:
      1. "qualityScore": 1-10 rating.
      2. "issues": Array of potential issues (e.g., low resolution, artifacts, lighting).
      3. "recommendations": Array of specific editing steps (e.g., "Increase contrast by 10%", "Upscale resolution").
      4. "paperRecommendation": Best paper type for this visual style (Glossy, Matte, Canvas, etc.).
      
      Return ONLY the JSON string, no markdown formatting.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: cleanData } },
          { text: prompt }
        ]
      }
    });

    return response.text || "{}";

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

export const generateImageCaption = async (imageBase64: string): Promise<string> => {
   try {
    const ai = getAiClient();
    const cleanData = cleanBase64(imageBase64);
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
           { inlineData: { mimeType: 'image/jpeg', data: cleanData } },
           { text: "Generate a short, professional caption for this image suitable for a gallery catalog." }
        ]
      }
    });

    return response.text || "";
   } catch (error) {
     console.error("Gemini Caption Error:", error);
     return "Could not generate caption.";
   }
};

export const editImageWithGemini = async (imageBase64: string, prompt: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const cleanData = cleanBase64(imageBase64);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanData, 
              mimeType: 'image/jpeg', 
            },
          },
          {
            text: prompt,
          },
        ],
      },
    });

    // Extract image from response
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const base64EncodeString: string = part.inlineData.data;
        return `data:image/png;base64,${base64EncodeString}`;
      }
    }
    throw new Error("No image generated");

  } catch (error) {
    console.error("Gemini Edit Error:", error);
    throw error;
  }
};

export const upscaleImage = async (imageBase64: string): Promise<string> => {
  try {
    // 1. Handle Key Selection (Mandatory for Gemini 3 Pro Image)
    const aiWindow = (window as any).aistudio;
    if (aiWindow) {
        const hasKey = await aiWindow.hasSelectedApiKey();
        if (!hasKey) {
            await aiWindow.openSelectKey();
        }
    }

    // Re-initialize client to pick up selected key (if any)
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const cleanData = cleanBase64(imageBase64);

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanData, 
              mimeType: 'image/jpeg', 
            },
          },
          {
            text: "Upscale this image to 4K resolution. Enhance details, sharpness, and clarity while maintaining the original artistic style and content.",
          },
        ],
      },
      config: {
        imageConfig: {
            imageSize: '4K',
        }
      }
    });

    // Extract image from response
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const base64EncodeString: string = part.inlineData.data;
        return `data:image/png;base64,${base64EncodeString}`;
      }
    }
    throw new Error("No image generated");

  } catch (error) {
    console.error("Gemini Upscale Error:", error);
    throw error;
  }
};

export const generateVeoVideo = async (imageBase64: string, prompt: string): Promise<string> => {
  try {
    // 1. Handle Key Selection (Mandatory for Veo)
    const aiWindow = (window as any).aistudio;
    if (aiWindow) {
        const hasKey = await aiWindow.hasSelectedApiKey();
        if (!hasKey) {
            await aiWindow.openSelectKey();
        }
    }

    // Re-initialize client to pick up selected key (if any)
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const cleanData = cleanBase64(imageBase64);

    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt, 
      image: {
        imageBytes: cleanData, 
        mimeType: 'image/jpeg',
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9' 
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Polling delay
      operation = await ai.operations.getVideosOperation({operation: operation});
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("Video generation failed");

    // Fetch the actual video bytes using the key
    const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const videoBlob = await videoResponse.blob();
    return URL.createObjectURL(videoBlob);

  } catch (error) {
    console.error("Veo Generation Error:", error);
    throw error;
  }
};