import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
dotenv.config();

const key = process.env.GEMINI_API_KEY;
if (!key) {
  console.error("No API Key found in .env");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: key });

async function checkModels() {
  try {
    console.log("Checking models with default version...");
    const models = await ai.models.list();
    console.log("Available Models:", JSON.stringify(models, null, 2));
  } catch (error) {
    console.error("Failed to list models:", error);
  }
}

checkModels();
