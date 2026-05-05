import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  if (method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${method} Not Allowed`);
  }

  const { page = "1", limit = "10", search } = req.query;

  return res.status(200).json({
    page,
    limit,
    search: search ?? null,
    ok: true,
  });
}
