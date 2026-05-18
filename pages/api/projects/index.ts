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
        //     $unwind: {
        //       path: '$timeEntries',
        //       preserveNullAndEmptyArrays: true,
        //     },
        //   },
        //   {
        //     $addFields: {
        //       showHrs: { $ifNull: ['$showHrs', false] },
        //       timeEntriesDateFilter: {
        //         $cond: {
        //           if: { $eq: ['$showHrs', true] },
        //           then: {
        //             $and: [
        //               { $gte: ['$timeEntries.date', '$periodOfPerformance.startDate'] },
        //               { $lte: ['$timeEntries.date', '$periodOfPerformance.endDate'] },
        //             ],
        //           },
        //           else: {
        //             $or: [
        //               { $lte: ['$timeEntries.date', new Date('2023-01-01')] }, // Date <= 2023-01-01
        //               { $eq: ['$timeEntries.date', null] }, // Date is null
        //               { $gt: ['$timeEntries.date', new Date('2023-01-31')] }
        //             ],
        //           },
        //         },
        //       },
        //     },
        //   },
        //   {
        //     $match: {
        //       $expr: {
        //         $eq: ['$timeEntriesDateFilter', true],
        //       },
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
        //         month: {
        //           $cond: {
        //             if: { $or: [{ $eq: ['$timeEntries.date', null] }, { $eq: ['$timeEntries.date', NaN] }] },
        //             then: null,
        //             else: { $dateToString: { format: "%Y-%m", date: "$timeEntries.date" } },
        //           },
        //         },
        //       },
        //       totalHours: { $sum: '$timeEntries.hours' },
        //       projectDetails: { $first: '$$ROOT' },
        //     },
        //   },
        //   {
        //     $group: {
        //       _id: {
        //         projectName: '$_id.projectName',
        //         username: '$_id.username',
        //       },
        //       userTotalHours: { $sum: '$totalHours' },
        //       projectDetails: { $first: '$projectDetails' },
        //     },
        //   },
        //   {
        //     $group: {
        //       _id: '$_id.projectName',
        //       users: {
        //         $push: {
        //           username: '$_id.username',
        //           userTotalHours: '$userTotalHours',
        //         },
        //       },
        //       projectTotalHours: { $sum: '$userTotalHours' },
        //       projectDetails: { $first: '$projectDetails' },
        //     },
        //   },
        //   {
        //     $addFields: {
        //       'projectDetails.users': '$users',
        //       'projectDetails.projectTotalHours': '$projectTotalHours',
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
        //       // users: 1,
        //       projectTotalHours: 1,
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
        // Ensure you replace 'collection' with your actual collection reference
        const projects = await collection.aggregate([
          // Step 1: Lookup timeEntries
          {
            $lookup: {
              from: 'timeEntries',
              localField: 'name',
              foreignField: 'projectName',
              as: 'timeEntries',
            },
          },
          // Step 2: Lookup groups to find groups that include this project
          {
            $lookup: {
              from: 'groups',
              let: { projectId: '$_id' }, // Pass the current project's _id
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $in: [
                        { $toString: '$$projectId' }, // Convert _id to string for matching
                        '$projectIds.value',           // Check if projectId is in projectIds.value array
                      ],
                    },
                  },
                },
                {
                  $project: {
                    _id: 1,
                    name: 1,
                    projectIds: 1,
                  },
                },
              ],
              as: 'groupDetails',
            },
          },
          // Step 3: Unwind timeEntries to process each entry individually
          {
            $unwind: {
              path: '$timeEntries',
              preserveNullAndEmptyArrays: true,
            },
          },
          // Step 4: Add fields for filtering timeEntries
          {
            $addFields: {
              showHrs: { $ifNull: ['$showHrs', false] },
              timeEntriesDateFilter: {
                $cond: {
                  if: { $eq: ['$showHrs', true] },
                  then: {
                    $and: [
                      { $gte: ['$timeEntries.date', '$periodOfPerformance.startDate'] },
                      { $lte: ['$timeEntries.date', '$periodOfPerformance.endDate'] },
                    ],
                  },
                  else: {
                    $or: [
                      { $lte: ['$timeEntries.date', new Date('2023-01-01')] },
                      { $eq: ['$timeEntries.date', null] },
                      { $gt: ['$timeEntries.date', new Date('2023-01-01')] },
                    ],
                  },
                },
              },
            },
          },
          // Step 5: Filter timeEntries based on the date filter
          {
            $match: {
              $expr: {
                $eq: ['$timeEntriesDateFilter', true],
              },
            },
          },
          // Step 6: Handle NaN or null hours in timeEntries
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
          // Step 7: Group data to calculate total hours per project, user, and month
          {
            $group: {
              _id: {
                projectName: '$name',
                username: '$timeEntries.username',
                month: {
                  $cond: {
                    if: { $or: [{ $eq: ['$timeEntries.date', null] }, { $eq: ['$timeEntries.date', NaN] }] },
                    then: null,
                    else: { $dateToString: { format: "%Y-%m", date: "$timeEntries.date" } },
                  },
                },
              },
              totalHours: { $sum: '$timeEntries.hours' },
              projectDetails: { $first: '$$ROOT' },
              groupDetails: { $first: '$groupDetails' }, // Capture group details
            },
          },
          // Step 8: Extract all projectIds from the groups and convert to ObjectId
          {
            $addFields: {
              groupProjectIds: {
                $map: {
                  input: "$groupDetails",
                  as: "group",
                  in: {
                    $map: {
                      input: "$$group.projectIds",
                      as: "pid",
                      in: "$$pid.value"
                    }
                  }
                }
              },
            },
          },
          // Step 9: Flatten the array of arrays to a single array of projectId strings
          {
            $addFields: {
              groupProjectIds: {
                $reduce: {
                  input: "$groupProjectIds",
                  initialValue: [],
                  in: { $concatArrays: ["$$value", "$$this"] }
                },
              },
            },
          },
          // Step 10: Remove duplicates to prevent redundant lookups
          {
            $addFields: {
              groupProjectIds: { $setUnion: ["$groupProjectIds", []] }
            },
          },
          // Step 11: Convert projectId strings to ObjectId
          {
            $addFields: {
              groupProjectIds: {
                $map: {
                  input: "$groupProjectIds",
                  as: "pid",
                  in: { $toObjectId: "$$pid" }
                },
              },
            },
          },
          // Step 12: Lookup project details for groupProjectIds
          {
            $lookup: {
              from: 'projects',
              localField: 'groupProjectIds',
              foreignField: '_id',
              as: 'groupProjectDetails',
            },
          },
          // Step 13: Group data by projectName and username, aggregating userTotalHours and capturing groupProjectDetails
          {
            $group: {
              _id: {
                projectName: '$_id.projectName',
                username: '$_id.username',
              },
              userTotalHours: { $sum: '$totalHours' },
              projectDetails: { $first: '$projectDetails' },
              groupProjectDetails: { $first: '$groupProjectDetails' }, // Capture project details
            },
          },
          // Step 14: Group data by projectName, aggregating users and projectTotalHours
          {
            $group: {
              _id: '$_id.projectName',
              users: {
                $push: {
                  username: '$_id.username',
                  userTotalHours: '$userTotalHours',
                },
              },
              projectTotalHours: { $sum: '$userTotalHours' },
              projectDetails: { $first: '$projectDetails' },
              groupProjectDetails: { $first: '$groupProjectDetails' }, // Keep the project details
            },
          },
          // Step 15: Add aggregated fields to projectDetails
          {
            $addFields: {
              'projectDetails.users': '$users',
              'projectDetails.projectTotalHours': '$projectTotalHours',
              'projectDetails.groupProjects': '$groupProjectDetails', // Assign groupProjectDetails to groupProjects
            },
          },
          // Step 16: Replace root with projectDetails to structure the final output
          {
            $replaceRoot: {
              newRoot: '$projectDetails',
            },
          },
          // Step 17: Project the desired fields in the final output
          {
            $project: {
              _id: 1,
              name: 1,
              projectTotalHours: 1,
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
              showHrs: 1,               // Include aggregated users
              groupProjects: 1,      // Include groupProjects with detailed project info
            },
          },
        ]).toArray();

        projects.forEach((project: any) => {
          // Check if groupProjects exists and is an array
          if (Array.isArray(project.groupProjects)) {
            // Use map to create a new array with updated groupProjects
            project.groupProjects = project.groupProjects.map((groupProject: any) => {
              // Find the corresponding project in the main projects array by matching the name
              const correspondingMainProject = projects.find((p: any) => p.name === groupProject.name);

              // If found, update projectTotalHours in the groupProject
              if (correspondingMainProject) {
                return {
                  ...groupProject,
                  projectTotalHours: correspondingMainProject.projectTotalHours,
                };
              }

              // Return the original groupProject if no corresponding project is found
              return groupProject;
            });
          }
        });


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