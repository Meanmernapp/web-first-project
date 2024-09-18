// pages/api/projects/[name].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '../../../models/db';
import apiKeyMiddleware from '../../../middleware/apiKeyMiddleware'; // Adjust the path if necessary


const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const db = await connectDB();
  const { name } = req.query;

  switch (req.method) {
    case 'PUT':
      try {
        const result = await db.collection('projects').updateOne(
          { name: name as string },
          { $set: req.body }
        );
        if (result.matchedCount === 0) {
          return res.status(404).json({ error: 'Project not found' });
        }
        res.status(200).json({ message: 'Project updated' });
      } catch (error) {
        res.status(500).json({ error: 'An error occurred while updating the project' });
      }
      break;
    case 'GET':
      try {
        const projectName = name as string;


        // Step 1: Find the project by name
        const project = await db.collection('projects').findOne({ name: projectName });

        if (!project) {
          return res.status(404).json({ error: 'Project not found' });
        }

        // Step 2: Use the project's _id to find groups with matching projectIds
        const group = await db.collection('groups').findOne({
          'projectIds.value': project._id.toString() // Match project._id with the 'value' field inside projectIds
        });


        if (!group) {
          return res.status(200).json({ project });
        }

        // Step 3: Get all projectIds (including the current project and others in the group)
        let timeEntries = []
        const allProjectIds = group.projectIds.map((id: any) => id.label.toString());
        console.log(allProjectIds)
        if (project.showHrs) {
          timeEntries = [
            {
              $match: {
                name: { $in: allProjectIds },  // Match projects by their names
              },
            },
            {
              $lookup: {
                from: 'timeEntries',
                localField: 'name',  // Match on project name
                foreignField: 'projectName',  // Use projectName from timeEntries
                as: 'timeEntries',
              },
            },
            {
              $addFields: {
                // Apply filtering on timeEntries based on the periodOfPerformance of each project
                timeEntries: {
                  $filter: {
                    input: '$timeEntries',
                    as: 'timeEntry',
                    cond: {
                      $and: [
                        {
                          $or: [
                            { $eq: ['$$timeEntry.date', null] },  // Include entries with null date
                            { $eq: ['$$timeEntry.date', NaN] },   // Include entries with NaN date
                            {
                              // Filter entries between project's periodOfPerformance dates
                              $and: [
                                { $gte: ['$$timeEntry.date', '$periodOfPerformance.startDate'] },
                                { $lte: ['$$timeEntry.date', '$periodOfPerformance.endDate'] },
                              ]
                            }
                          ],
                        }
                      ]
                    }
                  }
                }
              }
            },
            {
              $unwind: {
                path: '$timeEntries',
                preserveNullAndEmptyArrays: true  // Allow projects with no time entries
              }
            },
            {
              $addFields: {
                'timeEntries.hours': {
                  $cond: {
                    if: { $or: [{ $eq: ['$timeEntries.hours', NaN] }, { $eq: ['$timeEntries.hours', null] }] },
                    then: 0,
                    else: '$timeEntries.hours',
                  }
                }
              }
            },
            {
              $group: {
                _id: {
                  projectId: '$name',
                  username: '$timeEntries.username',
                },
                userTotalHours: { $sum: '$timeEntries.hours' },  // Sum hours per user per project
                projectDetails: { $first: '$$ROOT' },  // Keep project details
              }
            },
            {
              $group: {
                _id: '$_id.projectId',
                users: {
                  $push: {
                    username: '$_id.username',
                    userTotalHours: '$userTotalHours',
                  }
                },
                projectTotalHours: { $sum: '$userTotalHours' },  // Sum all user hours per project
                projectDetails: { $first: '$projectDetails' }  // Keep project details
              }
            },
            {
              $addFields: {
                'projectDetails.users': '$users',
                'projectDetails.projectTotalHours': '$projectTotalHours',
              }
            },
            {
              $replaceRoot: {
                newRoot: '$projectDetails'
              }
            },
            {
              $project: {
                _id: 1,
                name: 1,
                projectTotalHours: 1,  // Keep total project hours
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
              }
            }

          ]
        } else {
          timeEntries = [
            {
              $lookup: {
                from: 'timeEntries',
                localField: 'name', // Match on _id of the projects
                foreignField: 'projectName', // Use 'projectId' from the timeEntries collection
                as: 'timeEntries',
              },
            },
            {
              $unwind: {
                path: '$timeEntries',
                preserveNullAndEmptyArrays: true, // Allow projects with no time entries or null time entries
              },
            },
            {
              $match: {
                $and: [
                  { 'timeEntries.projectName': { $in: allProjectIds } }, // Filter for projectIds in group
                  {
                    $or: [
                      { 'timeEntries.date': { $exists: false } }, // Include entries where date is not present
                      { 'timeEntries.date': { $eq: null } },      // Include entries where date is null
                      { 'timeEntries.date': { $gt: new Date('2023-01-01') } },  // Filter for valid date > 2023-01-31
                    ],
                  },
                ],
              },
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
                  projectId: '$name',
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
              },
            },
            {
              $group: {
                _id: {
                  projectId: '$_id.projectId',
                  username: '$_id.username',
                },
                userTotalHours: { $sum: '$totalHours' },
                projectDetails: { $first: '$projectDetails' },
              },
            },
            {
              $group: {
                _id: '$_id.projectId',
                users: {
                  $push: {
                    username: '$_id.username',
                    userTotalHours: '$userTotalHours',
                  },
                },
                projectTotalHours: { $sum: '$userTotalHours' },
                projectDetails: { $first: '$projectDetails' },
              },
            },
            {
              $addFields: {
                'projectDetails.users': '$users',
                'projectDetails.projectTotalHours': '$projectTotalHours',
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
                // users: 1,
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
              },
            },
          ]
        }
        // Step 4: Aggregate total hours for all projects in projectIds
        const projects = await db.collection('projects').aggregate(timeEntries).toArray();

        // Step 5: Return the result
        return res.status(200).json({ projects, project });

      } catch (error) {
        return res.status(500).json({ error: 'An error occurred while updating the project' });
      }
      break;
    default:
      res.setHeader('Allow', ['PUT', 'GET']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default apiKeyMiddleware(handler);