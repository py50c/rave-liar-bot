import { Bot, Context, webhookCallback } from "grammy";
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import * as dotenv from "dotenv";
import express from "express";
dotenv.config();

const MODEL_NAME: string = "gemini-1.5-flash";
const API_KEY: string = process.env.AI_API_KEY!;
const TELEGRAM_KEY: string = process.env.TELEGRAM_KEY!;

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: MODEL_NAME });
const bot = new Bot(TELEGRAM_KEY);
// Interfaces
interface GenerateContentConfig {
  temperature: number;
  topK: number;
  topP: number;
  maxOutputTokens: number;
}

interface SafetySetting {
  category: HarmCategory;
  threshold: HarmBlockThreshold;
}

interface ContentPart {
  text: string;
}

const generationConfig: GenerateContentConfig = {
  temperature: 1,
  topK: 64,
  topP: 0.95,
  maxOutputTokens: 8192,
};

const safetySettings: SafetySetting[] = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

// TODO: Replace the following with your app's Firebase project configuration
// See: https://support.google.com/firebase/answer/7015592
const firebaseConfig = {
  apiKey: process.env.FIREBASE_KEY,
  authDomain: "harmonie-ai.firebaseapp.com",
  databaseURL: "https://harmonie-ai-default-rtdb.firebaseio.com",
  projectId: "harmonie-ai",
  storageBucket: "harmonie-ai.appspot.com",
  messagingSenderId: "684226874538",
  appId: "1:684226874538:web:6f5d6adc110ca0da3014d3",
  measurementId: "G-S7S4W85DB6",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

async function harmony(
  prompt: string | undefined,
  text_parts: ContentPart[]
): Promise<{ responseText: string; text_parts: ContentPart[] }> {
  const defaultParts: ContentPart[] = [
    {
      text: "You are Rave the Liar,\n\nyou job is to give a funny lie about any conversation or question asked\nwhen /start is entered as input your output should be ask me any question \nthen continue your funny lying conversations fromm there \nmake it very relatable for Aficans especially Nigerians\nDont talk too much ",
    },
  ];
  text_parts.push({ text: `input: ${prompt}` });
  text_parts.push({ text: "output: " });
  const parts: ContentPart[] = defaultParts.concat(text_parts);
  const result = await model.generateContent({
    contents: [{ role: "user", parts }],
    generationConfig,
    safetySettings,
  });

  const response = result.response;
  const responseText = response.text();
  // Modify the output to the text output from the model
  text_parts[text_parts.length - 1] = { text: `output: ${responseText}` };
  return { responseText: responseText, text_parts: text_parts };
}

const replyToMessage = (ctx: any, messageId: number, text: string) =>
  ctx.reply(text, {
    reply_to_message_id: messageId,
  });

const reply = async (ctx: Context) => {
  const messageId = ctx.message?.message_id;
  if (messageId) {
    const userName = `${ctx.message?.from.first_name}`;
    const text = ctx.message?.text;
    const userId = ctx.from?.id.toString()!;
    const userDocRef = doc(db, "prep", userId);
    getDoc(userDocRef)
      .then(async (doc) => {
        let harmonyResponse;
        let docData;
        let harmonyOutput: { responseText: string; text_parts: ContentPart[] };
        if (doc.exists()) {
          // If there is an already existing chat. Build upon the chat
          docData = doc.data();
          if (text == "/reset") {
            setDoc(userDocRef, { id: userId, text_parts: [] });
            await replyToMessage(ctx, messageId, `Chat reset.`);
            return;
          }
          harmonyOutput = await harmony(text, docData.text_parts);
          harmonyResponse = harmonyOutput.responseText;
        } else {
          // No chat was found. Create new empty chat
          harmonyOutput = await harmony(text, []);
          harmonyResponse = harmonyOutput.responseText;
        }
        let new_text_parts = harmonyOutput.text_parts;
        setDoc(userDocRef, { id: userId, text_parts: new_text_parts });
        console.log(`Replied to Telegram user: ${userId} ${userName}`);
        await replyToMessage(ctx, messageId, `${harmonyResponse}`);
      })
      .catch((error) => {
        console.log("Error getting document:", error);
      });
  }
};
bot.on("message", reply);
console.log("Bot started");

const expressApp = express();
const port = process.env.PORT || 10000;

expressApp.get("/",async (req: express.Request, res: express.Response) => {
  res.status(200).send("OK");
});

expressApp.use(express.json());
expressApp.use(webhookCallback(bot, "express"));
expressApp.listen(port, () => {
  console.log(`Bot server running on port ${port}`);
});

