import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { registerAIRoutes } from "./ai";

export async function registerRoutes(app: Express): Promise<Server> {
  registerAIRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}
