import { TogetherAIPayload, TogetherAIStream } from "@/utils/togetherAI";
import { cleanedText, fetchWithTimeout, getSystemPrompt } from "@/utils/utils";
import { Readability } from "@mozilla/readability";
import {
  createParser,
  ParsedEvent,
  ReconnectInterval,
} from "eventsource-parser";
import fs from "fs";
import jsdom, { JSDOM } from "jsdom";
import { NextResponse } from "next/server";
import path from "path";
import { z } from "zod";
import os from "os";

const defaultSafeSearch = "active";

/**
 * Generates a unique filename using current date and random number
 * @returns {string} Formatted filename string
 */
const generateUniqueFileName = (): string => {
  const currentDate = new Date();
  const formattedDateTime = currentDate
    .toISOString()
    .replace(/[-T:.Z]/g, "")
    .slice(0, 14);
  const randomSuffix = Math.floor(Math.random() * 1000);
  return `${formattedDateTime}${randomSuffix}`;
};

/**
 * Writes data to a JSON file
 * @param {string} filePath - Path where the file will be saved
 * @param {any} data - Data to be written to the file
 */
const writeJsonFile = (filePath: string, data: any): void => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    // Handle read-only filesystem errors silently
    // This allows the function to fail gracefully in serverless environments
  }
};

/**
 * Reads and parses a JSON file
 * @param {string} filePath - Path of the file to read
 * @returns {Promise<any>} Parsed JSON data or empty array if file doesn't exist
 */
const readJsonFile = async (filePath: string): Promise<any> => {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    return [];
  }
};

/**
 * Handles POST requests for AI-powered search and conversation
 * @param {Request} request - Incoming request object
 * @returns {Promise<NextResponse>} JSON response with AI-generated answer
 */
export async function POST(request: Request): Promise<NextResponse> {
  let {
    query,
    level,
    responseId,
    interaction,
    safesearch,
    location,
    language,
  } = await request.json();
  if (!query && !responseId) {
    return NextResponse.json({
      responseId: "",
      response: "",
      message: "A search query is required to process your request.",
      status: 400,
    });
  }

  const SERPER_API_KEY = process.env["SERPER_API_KEY"];
  if (!SERPER_API_KEY) {
    throw new Error("SERPER_API_KEY is required");
  }

  let aiResponseText = "";

  const onParseEvent = (event: ParsedEvent | ReconnectInterval) => {
    if (event.type === "event") {
      const eventData = event.data;
      try {
        const parsedText = JSON.parse(eventData).text ?? "";
        aiResponseText += parsedText;
      } catch (error) {
        // Error handling without console.log
      }
    }
  };

  // Use temp directory for serverless environments
  const storageDirectory =
    process.env.NODE_ENV === "production"
      ? path.join(os.tmpdir(), "storage")
      : path.join(process.cwd(), "storage");

  try {
    if (!fs.existsSync(storageDirectory)) {
      fs.mkdirSync(storageDirectory, { recursive: true });
    }
  } catch (error) {
    // If we can't create the directory, we'll continue without persistent storage
  }

  const sessionId = responseId ? responseId : generateUniqueFileName();

  if (!responseId) {
    const searchResponse = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": SERPER_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: query,
        num: 9,
        safe: safesearch ? defaultSafeSearch : "off",
        gl: location || "us",
        hl: language || "en-US",
      }),
    });

    const searchResults = await searchResponse.json();

    const SerperJSONSchema = z.object({
      organic: z.array(z.object({ title: z.string(), link: z.string() })),
    });

    const validatedData = SerperJSONSchema.parse(searchResults);

    let searchResultItems = validatedData.organic.map((result) => ({
      name: result.title,
      url: result.link,
    }));

    const enrichedSourceResults = await getParsedSources(searchResultItems);
    const levels = level || "high-school";
    const content = enrichedSourceResults.map((result) => result.fullContent);

    let initialConversation = [
      {
        role: "system",
        content: getSystemPrompt(content, levels, interaction),
      },
      { role: "user", content: query },
    ];

    const requestFileName = `${sessionId}.json`;
    const requestFilePath = path.join(storageDirectory, requestFileName);
    writeJsonFile(requestFilePath, initialConversation);

    const aiResponse = await getChat(initialConversation);
    if (!aiResponse.ok) {
      throw new Error(aiResponse.statusText);
    }

    const aiResponseStream = aiResponse.body;
    if (!aiResponseStream) {
      return NextResponse.json({
        responseId: "",
        response: "",
        message: "Unable to retrieve AI response data. Please try again later.",
        status: 500,
      });
    }

    const streamReader = aiResponseStream.getReader();
    const textDecoder = new TextDecoder();
    const eventParser = createParser(onParseEvent);
    let streamComplete = false;

    while (!streamComplete) {
      const { value, done: readingComplete } = await streamReader.read();
      streamComplete = readingComplete;
      const decodedChunk = textDecoder.decode(value);
      eventParser.feed(decodedChunk);
    }

    const responseFileName = `${sessionId}_response.json`;
    const responseFilePath = path.join(storageDirectory, responseFileName);
    writeJsonFile(responseFilePath, aiResponseText);
  } else {
    const conversationFileName = `${responseId}.json`;
    const responseFileName = `${responseId}_response.json`;
    const conversationFilePath = path.join(
      storageDirectory,
      conversationFileName
    );
    const responseFilePath = path.join(storageDirectory, responseFileName);

    const existingConversation = await readJsonFile(conversationFilePath);
    const previousResponse = await readJsonFile(responseFilePath);

    if (existingConversation.length === 0) {
      return NextResponse.json({
        responseId: "",
        response: "",
        message:
          "Invalid conversation reference. Please provide a valid response ID.",
        status: 400,
      });
    }

    existingConversation.push(
      {
        role: "assistant",
        content: previousResponse,
      },
      { role: "user", content: query }
    );

    if (previousResponse) {
      writeJsonFile(conversationFilePath, existingConversation);
    }

    const aiResponse = await getChat(existingConversation);
    if (!aiResponse.ok) {
      throw new Error(aiResponse.statusText);
    }

    const aiResponseStream = aiResponse.body;
    if (!aiResponseStream) {
      return NextResponse.json({
        responseId: "",
        response: "",
        message: "Unable to retrieve AI response data. Please try again later.",
        status: 500,
      });
    }

    const streamReader = aiResponseStream.getReader();
    const textDecoder = new TextDecoder();
    const eventParser = createParser(onParseEvent);
    let streamComplete = false;

    while (!streamComplete) {
      const { value, done: readingComplete } = await streamReader.read();
      streamComplete = readingComplete;
      const decodedChunk = textDecoder.decode(value);
      eventParser.feed(decodedChunk);
    }

    if (aiResponseText) {
      const updatedConversationHistory = `${previousResponse}\n\n${aiResponseText}`;
      writeJsonFile(responseFilePath, updatedConversationHistory);
    }
  }

  return NextResponse.json({
    responseId: sessionId,
    response: aiResponseText,
    message: "",
    status: 200,
  });
}

/**
 * Fetches and parses content from source URLs
 * @param {any[]} sources - Array of source objects with URLs to fetch
 * @returns {Promise<any[]>} Array of sources with parsed content
 */
const getParsedSources = async (sources: any): Promise<any[]> => {
  let enrichedResults = await Promise.all(
    sources.map(async (sourceItem: any) => {
      try {
        const response = await fetchWithTimeout(sourceItem.url);
        const htmlContent = await response.text();
        const virtualConsole = new jsdom.VirtualConsole();
        const domInstance = new JSDOM(htmlContent, { virtualConsole });
        const documentObj = domInstance.window.document;
        const readabilityResult = new Readability(documentObj).parse();
        let extractedContent = readabilityResult
          ? cleanedText(readabilityResult.textContent || "")
          : "Nothing found";
        return {
          ...sourceItem,
          fullContent: extractedContent,
        };
      } catch (error) {
        return {
          ...sourceItem,
          fullContent: "not available",
        };
      }
    })
  );
  return enrichedResults;
};

/**
 * Sends messages to the Together AI API and returns a streaming response
 * @param {any} messages - Array of message objects to send to the AI
 * @returns {Promise<Response>} Streaming response from the AI
 */
const getChat = async (messages: any): Promise<Response> => {
  try {
    const payload: TogetherAIPayload = {
      model: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
      messages,
      stream: true,
    };
    const responseStream = await TogetherAIStream(payload);
    return new Response(responseStream, {
      headers: new Headers({ "Cache-Control": "no-cache" }),
    });
  } catch (error) {
    return new Response("Error. Answer stream failed.", { status: 202 });
  }
};
