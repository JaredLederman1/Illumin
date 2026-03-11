import { query } from "@anthropic-ai/claude-agent-sdk";
import { NextRequest } from "next/server";

export const maxDuration = 60; // Vercel Pro: 60s; Hobby: 10s

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const prompt = body.prompt;
    const allowedTools = body.allowedTools ?? ["Read", "Edit", "Glob", "Grep"];
    const permissionMode = body.permissionMode ?? "acceptEdits";

    if (!prompt || typeof prompt !== "string") {
      return Response.json(
        { error: "Missing or invalid prompt" },
        { status: 400 }
      );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const message of query({
            prompt,
            options: {
              allowedTools,
              permissionMode,
              persistSession: false,
              cwd: process.cwd(),
            },
          })) {
            const output: Record<string, unknown> = { type: message.type };

            if (message.type === "assistant" && message.message?.content) {
              const parts: string[] = [];
              for (const block of message.message.content) {
                if ("text" in block && block.text) {
                  parts.push(block.text);
                } else if ("name" in block) {
                  parts.push(`[Tool: ${block.name}]`);
                }
              }
              output.text = parts.join("");
            } else if (message.type === "result") {
              output.subtype = (message as { subtype?: string }).subtype;
            }

            controller.enqueue(
              encoder.encode(JSON.stringify(output) + "\n")
            );
          }
        } catch (err) {
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: "error",
                error: err instanceof Error ? err.message : String(err),
              }) + "\n"
            )
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    return Response.json(
      {
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
