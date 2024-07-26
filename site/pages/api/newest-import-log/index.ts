// pages/api/importLogs.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '../../../models/db';
import apiKeyMiddleware from '../../../middleware/apiKeyMiddleware'; // Adjust the path if necessary
import { format } from 'date-fns';

/**
 * @swagger
 * tags:
 *   name: ImportLogs
 *   description: API for managing import logs
 * 
 * /api/importLogs:
 *   get:
 *     summary: Retrieve the most recent import log
 *     tags: [ImportLogs]
 *     responses:
 *       200:
 *         description: Successfully retrieved the most recent import log
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 log:
 *                   type: object
 *                   description: The most recent import log
 *                   example:
 *                     startTime: "2024-07-21T10:00:00Z"
 *                     endTime: "2024-07-21T12:00:00Z"
 *                 lastUpdated:
 *                   type: string
 *                   description: Formatted date of the last import log
 *                   example: "7/21/2024"
 *                 lastUpdatedRange:
 *                   type: string
 *                   description: Range of the last 15 days ending on the formatted date
 *                   example: "Last 15 days ending on 7/21/2024"
 *       404:
 *         description: No import logs found
 *       500:
 *         description: An error occurred while fetching the newest import log
 *     security:
 *       - apiKey: []
 * 
 * components:
 *   securitySchemes:
 *     apiKey:
 *       type: apiKey
 *       in: header
 *       name: x-api-key
 */

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  switch (req.method) {
    case 'GET':
      try {
        const db = await connectDB();
        const newestLog = await db.collection('importLogs')
          .find({})
          .sort({ startTime: -1 })
          .limit(1)
          .toArray();

        if (newestLog.length === 0) {
          return res.status(404).json({ error: 'No import logs found' });
        }

        const log = newestLog[0];
        const endDate = new Date(log.endTime);

        const formattedDate = endDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric'
        });

        res.status(200).json({
          log,
          lastUpdated: formattedDate,
          lastUpdatedRange: `Last 15 days ending on ${formattedDate}`
        });
      } catch (error: any) {
        res.status(500).json({ error: 'An error occurred while fetching the newest import log', details: error.message });
      }
      break;

    default:
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

// Wrap the handler with apiKeyMiddleware
export default apiKeyMiddleware(handler);
