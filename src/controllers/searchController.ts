import { Request, Response } from "express";
import r2rClient from "../config/r2r";

export const search = async (req: Request, res: Response) => {
  try {
    const { query, searchMode = "advanced", ...options } = req.body;
    if (!query) return;
    res.status(400).json({ error: "Query required" });
    const r2rRes = await r2rClient.post("/v3/retrieval/search", {
      query,
      search_mode: searchMode,
      ...options,
    });
    res.json(r2rRes.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Search failed" });
  }
};
