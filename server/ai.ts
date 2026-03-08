import type { Express, Request, Response } from "express";
import Anthropic from "@anthropic-ai/sdk";

function getAnthropicClient() {
  return new Anthropic({
    apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
  });
}

export function registerAIRoutes(app: Express): void {
  app.post("/api/ai/finance-coach", async (req: Request, res: Response) => {
    try {
      const { message, transactions, context } = req.body as {
        message: string;
        transactions: Array<{
          type: string;
          amount: number;
          category: string;
          date: string;
          note: string;
        }>;
        context?: {
          totalIncome: number;
          totalExpenses: number;
          balance: number;
          currentMonth: string;
        };
      };

      const txnSummary = transactions
        .slice(0, 100)
        .map(
          (t) =>
            `${t.date} | ${t.type === "income" ? "+" : "-"}₹${t.amount} | ${t.category}${t.note ? " | " + t.note : ""}`
        )
        .join("\n");

      const systemPrompt = `You are a personal finance advisor for an Indian user. You have access to their transaction data. 
Be concise, warm, and practical. Use ₹ for Indian Rupee amounts. Format numbers in Indian numbering system (e.g. ₹1,00,000).
Keep responses under 200 words unless the user asks for detailed analysis.
Do not use markdown headers. Use plain text with occasional bullet points.

User's Financial Summary:
- Total Income: ₹${context?.totalIncome?.toLocaleString("en-IN") ?? 0}
- Total Expenses: ₹${context?.totalExpenses?.toLocaleString("en-IN") ?? 0}
- Balance: ₹${context?.balance?.toLocaleString("en-IN") ?? 0}
- Current Month: ${context?.currentMonth ?? new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}

Recent Transactions (date | amount | category | note):
${txnSummary || "No transactions recorded yet."}`;

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const client = getAnthropicClient();

      const stream = await client.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 512,
        stream: true,
        system: systemPrompt,
        messages: [{ role: "user", content: message }],
      });

      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          const text = event.delta.text;
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (err: any) {
      console.error("AI route error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message });
      } else {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
      }
    }
  });
}
