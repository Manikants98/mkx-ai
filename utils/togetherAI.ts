import {
  createParser,
  ParsedEvent,
  ReconnectInterval,
} from "eventsource-parser";

type Agent = "user" | "system";

interface Message {
  role: Agent;
  content: string;
}

export interface TogetherAIPayload {
  model: string;
  messages: Message[];
  stream: boolean;
}

/**
 * Creates a streaming response from Together AI API
 * @param {TogetherAIPayload} payload - The payload to send to Together AI API
 * @returns {ReadableStream} A transformed stream of the AI response
 */
export async function TogetherAIStream(
  payload: TogetherAIPayload
): Promise<ReadableStream> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const response = await fetch(
    "https://together.helicone.ai/v1/chat/completions",
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.TOGETHER_API_KEY ?? ""}`,
      },
      method: "POST",
      body: JSON.stringify(payload),
    }
  );

  const readableStream = new ReadableStream({
    async start(controller) {
      /**
       * Handles parsed events from the stream
       * @param {any} event - The parsed event
       */
      const handleEvent = (event: ParsedEvent | ReconnectInterval) => {
        if (event.type === "event") {
          const data = event.data;
          controller.enqueue(encoder.encode(data));
        }
      };

      if (response.status !== 200) {
        controller.close();
        return;
      }

      const parser = createParser(handleEvent);
      for await (const chunk of response.body as any) {
        parser.feed(decoder.decode(chunk));
      }
    },
  });

  let chunkCounter = 0;
  const transformStream = new TransformStream({
    async transform(chunk, controller) {
      const data = decoder.decode(chunk);
      if (data === "[DONE]") {
        controller.terminate();
        return;
      }
      try {
        const json = JSON.parse(data);
        const textContent = json.choices[0].delta?.content || "";
        if (chunkCounter < 2 && (textContent.match(/\n/) || []).length) {
          return;
        }

        const payload = { text: textContent };
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
        );
        chunkCounter++;
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return readableStream.pipeThrough(transformStream);
}
