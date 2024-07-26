import { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';

const apiKeyMiddleware = (handler: NextApiHandler) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const apiKey = req.headers['x-api-key'];
    const validApiKey = process.env.NEXT_PUBLIC_API_KEY;

    if (apiKey !== validApiKey) {
      return res.status(403).json({ error: 'Forbidden: Invalid API Key' });
    }

    return handler(req, res);
  };
};

export default apiKeyMiddleware;
