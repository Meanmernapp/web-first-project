import { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '../../../models/db';
import { format } from 'date-fns';

interface TimeEntry {
  username: string;
  projectName: string;
  date: string;
  hours: number;
  createdAt: Date;
  updatedAt: Date;
  contractType?: string;
}

interface UserProjects {
  [projectName: string]: {
    contractType?: string;
    months: { [month: string]: number };
  };
}

interface Totals {
  [month: string]: number;
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const db = await connectDB();
  const { username } = req.query as { username: string };

  if (typeof username !== 'string' || username.trim().length === 0) {
    return res.status(400).json({ error: 'Invalid username parameter' });
  }

  try {
    const newEntries = await db.collection('timeEntries').aggregate([
      {
        $lookup: {
          from: "projects",
          localField: "projectName",
          foreignField: "name",
          as: "projectDetails"
        }
      },
      {
        $unwind: {
          path: "$projectDetails",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          username: 1,
          projectName: 1,
          date: 1,
          hours: 1,
          description: 1,
          createdAt: 1,
          updatedAt: 1,
          contractType: { $ifNull: ["$projectDetails.contractType", null] }
        }
      }
    ]).toArray();

    const timeEntries = newEntries.map(entry => ({
      username: entry.username,
      projectName: entry.projectName,
      date: entry.date,
      hours: entry.hours,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      contractType: entry.contractType
    })) as TimeEntry[];

    if (!timeEntries || timeEntries.length === 0) {
      return res.status(404).json({ error: 'No time entries found for this user' });
    }

    const parseDate = (dateString: string): Date => new Date(dateString);

    const findLatestEntry = (data: TimeEntry[], field: keyof TimeEntry): TimeEntry => {
      return data.reduce((latest, entry) => {
        return parseDate(entry[field] as string) > parseDate(latest[field] as string) ? entry : latest;
      }, data[0]);
    };

    const createdAt = new Date(findLatestEntry(timeEntries, 'createdAt').createdAt).toLocaleDateString();
    const updatedAt = new Date(findLatestEntry(timeEntries, 'updatedAt').updatedAt).toLocaleDateString();

    const userProjects: UserProjects = {};
    const monthsSet = new Set<string>();
    const totals: Totals = {};

    timeEntries.forEach(entry => {
      const date = new Date(entry.date);
      const month = format(date, 'yyyy-MM');
      monthsSet.add(month);

      if (!userProjects[entry.projectName]) {
        userProjects[entry.projectName] = {
          contractType: entry.contractType,
          months: {}
        };
      }

      if (!userProjects[entry.projectName].months[month]) {
        userProjects[entry.projectName].months[month] = 0;
      }

      if (!totals[month]) {
        totals[month] = 0;
      }

      userProjects[entry.projectName].months[month] += entry.hours;
      totals[month] += entry.hours;
    });

    const monthsArray = Array.from(monthsSet).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    const formattedUserProjects = Object.keys(userProjects).map(projectName => {
      const { contractType, months } = userProjects[projectName];
      const projectRecord: { [key: string]: string | number } = { projectName, contractType: contractType || '-' };

      monthsArray.forEach(month => {
        projectRecord[month] = months[month] || '-';
      });

      return projectRecord;
    });

    res.status(200).json({ userProjects: formattedUserProjects, months: monthsArray, totals, latestUpdate: { createdAt, updatedAt } });
  } catch (error: any) {
    console.error('Error fetching user time entries:', error);
    res.status(500).json({ error: 'An error occurred while fetching user time entries' });
  }
};

export default handler;
