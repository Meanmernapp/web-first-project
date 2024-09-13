import { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '../../../models/db';
import { ObjectId } from 'mongodb';
import apiKeyMiddleware from '../../../middleware/apiKeyMiddleware';

async function handler(req: NextApiRequest, res: NextApiResponse) {
    const db = await connectDB();
    const { id } = req.query;

    if (!ObjectId.isValid(id as string)) {
        return res.status(400).json({ message: 'Invalid ID format' });
    }

    const groupId = new ObjectId(id as string);

    if (req.method === 'GET') {
        try {
            const group = await db.collection('groups').findOne({ _id: groupId });
            if (!group) return res.status(404).json({ message: 'Group not found' });
            res.status(200).json(group);
        } catch (error) {
            res.status(500).json({ message: 'Failed to fetch group' });
        }
    } else if (req.method === 'PUT') {
        const { name, projectIds } = req.body;
        if (!name || !projectIds) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        try {
            const result = await db.collection('groups').updateOne(
                { _id: groupId },
                { $set: { name, projectIds } }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({ message: 'Group not found' });
            }

            res.status(200).json({ message: 'Group updated successfully' });
        } catch (error) {
            res.status(500).json({ message: 'Failed to update group' });
        }
    } else if (req.method === 'DELETE') {
        try {
            const result = await db.collection('groups').deleteOne({ _id: groupId });

            if (result.deletedCount === 0) {
                return res.status(404).json({ message: 'Group not found' });
            }

            res.status(200).json({ message: 'Group deleted successfully' });
        } catch (error) {
            res.status(500).json({ message: 'Failed to delete group' });
        }
    } else {
        res.status(405).json({ message: 'Method not allowed' });
    }
}

export default apiKeyMiddleware(handler);
