// pages/api/projects.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '../../../models/db';
import { InsertOneResult, Document } from 'mongodb';
import apiKeyMiddleware from '../../../middleware/apiKeyMiddleware'; // Adjust the path as necessary

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const db = await connectDB();
  const collection = db.collection('projects');

  switch (req.method) {
    case 'GET':
      try {
        // const projects = await collection.find({}).toArray();
        // const projects = await collection.aggregate([
        //   {
        //     $lookup: {
        //       from: 'timeEntries',
        //       localField: 'name',
        //       foreignField: 'projectName',
        //       as: 'timeEntries',
        //     },
        //   },
        //   {
        //     $unwind: '$timeEntries',
        //   },
        //   {
        //     $match: {
        //       'timeEntries.projectName': { $not: { $regex: '^WEBFIRST', $options: 'i' } },
        //     },
        //   },
        //   {
        //     $addFields: {
        //       'timeEntries.hours': {
        //         $cond: {
        //           if: { $or: [{ $eq: ['$timeEntries.hours', NaN] }, { $eq: ['$timeEntries.hours', null] }] },
        //           then: 0,
        //           else: '$timeEntries.hours',
        //         },
        //       },
        //     },
        //   },
        //   {
        //     $group: {
        //       _id: {
        //         projectName: '$name',
        //         username: '$timeEntries.username',
        //       },
        //       totalUserHours: { $sum: '$timeEntries.hours' },
        //       projectDetails: { $first: '$$ROOT' },
        //     },
        //   },
        //   {
        //     $group: {
        //       _id: '$_id.projectName',
        //       users: {
        //         $push: {
        //           username: '$_id.username',
        //           totalHours: '$totalUserHours',
        //         },
        //       },
        //       totalHours: { $sum: '$totalUserHours' },
        //       projectDetails: { $first: '$projectDetails' },
        //     },
        //   },
        //   {
        //     $addFields: {
        //       'projectDetails.totalHours': '$totalHours',
        //       'projectDetails.userHours': '$users',
        //     },
        //   },
        //   {
        //     $replaceRoot: {
        //       newRoot: '$projectDetails',
        //     },
        //   },
        //   {
        //     $project: {
        //       _id: 1,
        //       name: 1,
        //       totalHours: 1,
        //       userHours: 1,
        //       budgetHours: 1,
        //       contractType: 1,
        //       createdAt: 1,
        //       description: 1,
        //       periodOfPerformance: 1,
        //       endDate: 1,
        //       startDate: 1,
        //       pm: 1,
        //       status: 1,
        //       updatedAt: 1,
        //     },
        //   },
        // ]).toArray();
        const projects = await collection.aggregate([
          {
            $lookup: {
              from: 'timeEntries',
              localField: 'name',
              foreignField: 'projectName',
              as: 'timeEntries',
            },
          },
          {
            $unwind: '$timeEntries', // Unwind the timeEntries array
          },
          {
            $match: {
              'timeEntries.date': { $gt: new Date('2023-01-31') }, // Filter for date > 2023-02-01
              // 'timeEntries.createdAt': { $gt: new Date('2023-02-01') }, // Filter for createdAt > 2023-02-01
            }
          },
          {
            $addFields: {
              'timeEntries.hours': {
                $cond: {
                  if: { $or: [{ $eq: ['$timeEntries.hours', NaN] }, { $eq: ['$timeEntries.hours', null] }] },
                  then: 0,
                  else: '$timeEntries.hours',
                },
              },
            },
          },
          {
            $group: {
              _id: {
                projectName: '$name',
                username: '$timeEntries.username',
                month: { $dateToString: { format: "%Y-%m", date: "$timeEntries.date" } },
              },
              totalHours: { $sum: '$timeEntries.hours' },
              projectDetails: { $first: '$$ROOT' },
            },
          },
          {
            $group: {
              _id: {
                projectName: '$_id.projectName',
                username: '$_id.username',
              },
              // monthlyHours: {
              //   $push: {
              //     month: '$_id.month',
              //     totalHours: '$totalHours',
              //   },
              // },
              userTotalHours: { $sum: '$totalHours' },  // Sum total hours per user across months
              projectDetails: { $first: '$projectDetails' },
            },
          },
          {
            $group: {
              _id: '$_id.projectName',
              users: {
                $push: {
                  username: '$_id.username',
                  // monthlyHours: '$monthlyHours',
                  userTotalHours: '$userTotalHours',  // Include the total hours per user
                },
              },
              projectTotalHours: { $sum: '$userTotalHours' },  // Sum all user total hours for the project
              projectDetails: { $first: '$projectDetails' },
            },
          },
          {
            $addFields: {
              'projectDetails.users': '$users',
              'projectDetails.projectTotalHours': '$projectTotalHours',  // Attach total project hours
            },
          },
          {
            $replaceRoot: {
              newRoot: '$projectDetails',
            },
          },
          {
            $project: {
              _id: 1,
              name: 1,
              users: 1, // Include users with their monthly hours and total user hours
              projectTotalHours: 1,  // Include the total project hours
              budgetHours: 1,
              contractType: 1,
              createdAt: 1,
              description: 1,
              periodOfPerformance: 1,
              endDate: 1,
              startDate: 1,
              pm: 1,
              status: 1,
              updatedAt: 1,
            },
          }
        ]).toArray();





        res.status(200).json(projects);
      } catch (error: any) {
        res.status(500).json({ error: 'An error occurred while fetching projects', details: error.message });
      }
      break;

    case 'POST':
      try {
        const result: InsertOneResult<Document> = await collection.insertOne(req.body);
        res.status(201).json(result);
      } catch (error: any) {
        res.status(500).json({ error: 'An error occurred while creating the project', details: error.message });
      }
      break;

    case 'DELETE':
      try {
        await collection.deleteMany({});
        res.status(200).json({ message: 'All projects deleted' });
      } catch (error: any) {
        res.status(500).json({ error: 'An error occurred while deleting projects', details: error.message });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

// Apply the middleware
export default apiKeyMiddleware(handler);
