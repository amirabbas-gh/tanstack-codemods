import type { NextApiRequest, NextApiResponse } from "next";
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute("/api/send")({
  server: {
    handlers: {
      POST: async (req: NextApiRequest, res: NextApiResponse) => {
        return res.status(200).json({ ok: true });
      },
    },
  },
});

