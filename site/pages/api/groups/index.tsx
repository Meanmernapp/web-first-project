import { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '../../../models/db';
import apiKeyMiddleware from '../../../middleware/apiKeyMiddleware';
import { InsertOneResult } from 'mongodb';

async function handler(req: NextApiRequest, res: NextApiResponse) {
    const db = await connectDB();


    if (req.method === 'GET') {
        try {
            const groups = await db.collection('groups').find().toArray();
            res.status(200).json(groups);
        } catch (error) {
            res.status(500).json({ message: 'Failed to fetch groups' });
        }
    } else if (req.method === 'POST') {
        const { name, projectIds } = req.body;
        if (!name || !projectIds) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        try {
            const result: InsertOneResult = await db.collection('groups').insertOne({ name, projectIds });
            res.status(201).json({ message: 'Group created successfully', id: result.insertedId });
        } catch (error) {
            res.status(500).json({ message: 'Failed to create group' });
        }
    } else {
        res.status(405).json({ message: 'Method not allowed' });
    }
}

export default apiKeyMiddleware(handler);
