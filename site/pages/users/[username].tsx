import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Header from '../../components/Header';
import DateRangePickerModal from '../../components/DateRangePickerModal';
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';
import UserInfo from '../../components/UserInfo';
import ProjectParticipationPieChart from '../../components/ProjectParticipationPieChart';
import HoursOverTimeBarChart from '../../components/HoursOverTimeBarChart';
import { parseISO, isValid, format, isWithinInterval, startOfYear, endOfYear } from 'date-fns';
import { RangeKeyDict } from 'react-date-range';

const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';

interface MonthlyUserHours {
  projectName: string;
  [month: string]: number | string;
}

interface Totals {
  [month: string]: number;
}

interface Utilizations {
  [month: string]: number;
}

interface User {
  username: string;
  employeeType: string;
  firstName: string;
  lastName: string;
}

interface DateRange {
  startDate: Date;
  endDate: Date;
  key: string;
}

const UserPage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userProjects, setUserProjects] = useState<MonthlyUserHours[]>([]);
  const [allUserProjects, setAllUserProjects] = useState<MonthlyUserHours[]>([]);
  const [months, setMonths] = useState<string[]>([]);
  const [allMonths, setAllMonths] = useState<string[]>([]);
  const [totals, setTotals] = useState<Totals>({});
  const [allTotals, setAllTotals] = useState<Totals>({});
  const [utilizations, setUtilizations] = useState<Utilizations>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange[]>([
    {
      startDate: new Date('2023-01-01'),
      endDate: new Date(),
      key: 'selection'
    }
  ]);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'projectName', direction: 'asc' });
  const [totalUtilization, setTotalUtilization] = useState<number>(0);
  const router = useRouter();
  const { username, startDate, endDate, filter } = router.query as { username: string; startDate?: string; endDate?: string; filter?: string };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userResponse = await axios.get(`${baseUrl}/api/users/${encodeURIComponent(username)}`, {
          headers: {
            'x-api-key': process.env.NEXT_PUBLIC_API_KEY!,
          },
        });
        setUser(userResponse.data);
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setUser({ username, employeeType: 'Unknown', firstName: '', lastName: '' });
        } else {
          setError('Failed to fetch user data.');
        }
      }
    };

    const fetchTimeEntries = async () => {
      try {
        const entriesResponse = await axios.get(`${baseUrl}/api/user-time-entries/${encodeURIComponent(username)}`, {
          headers: {
            'x-api-key': process.env.NEXT_PUBLIC_API_KEY!,
          },
        });

        const { userProjects, months } = entriesResponse.data;

        let validMonths = months.filter((month: string) => {
          const date = parseISO(month);
          return isValid(date) && date.getFullYear() > 1970;
        });

        if (startDate && endDate) {
          const start = parseISO(startDate);
          const end = parseISO(endDate);
          validMonths = validMonths.filter((month: string) => {
            const date = parseISO(month);
            return isWithinInterval(date, { start, end });
          });

          setDateRange([
            {
              startDate: start,
              endDate: end,
              key: 'selection',
            },
          ]);
        } else if (filter === '2024') {
          validMonths = validMonths.filter((month: string) => {
            const date = parseISO(month);
            return isValid(date) && date.getFullYear() === 2024;
          });

          setDateRange([
            {
              startDate: startOfYear(new Date('2024-01-01')),
              endDate: endOfYear(new Date('2024-12-31')),
              key: 'selection',
            },
          ]);
        }

        const filteredUserProjects = userProjects.map((project: MonthlyUserHours) => {
          const filteredProject: MonthlyUserHours = { projectName: project.projectName };
          validMonths.forEach((month: string) => {
            if (project[month] !== undefined) {
              filteredProject[month] = project[month];
            }
          });
          return filteredProject;
        }).filter((project: MonthlyUserHours) => {
          return validMonths.some((month: string) => project[month] !== undefined && project[month] !== 0 && project[month] !== '-');
        });

        if (filteredUserProjects.length === 0) {
          setError(null);  // Reset the error since no data is different from a fetch error
          setLoading(false);
          setUserProjects([]);
          setMonths(validMonths);
          return;
        }

        const filteredTotals: Totals = {};
        validMonths.forEach((month: string) => {
          if (entriesResponse.data.totals[month] !== undefined) {
            filteredTotals[month] = entriesResponse.data.totals[month];
          }
        });

        const calculateMonthlyUtilization = (month: string): number => {
          let webFirstMonthHours = 0;
          let totalMonthHours = 0;

          filteredUserProjects.forEach((project: MonthlyUserHours) => {
            if (project[month] !== undefined && project[month] !== '-') {
              const hours = Number(project[month]);
              totalMonthHours += hours;
              if (project.projectName.startsWith('WEBFIRST')) {
                webFirstMonthHours += hours;
              }
            }
          });

          return totalMonthHours > 0
            ? ((totalMonthHours - webFirstMonthHours) / totalMonthHours) * 100
            : 0;
        };

        const filteredUtilizations: Utilizations = {};
        validMonths.forEach((month: string) => {
          filteredUtilizations[month] = calculateMonthlyUtilization(month);
        });

        setAllUserProjects(filteredUserProjects);
        setAllMonths(validMonths);
        setAllTotals(filteredTotals);
        setUserProjects(filteredUserProjects);
        setMonths(validMonths);
        setTotals(filteredTotals);
        setUtilizations(filteredUtilizations);
        setLoading(false);

        // Calculate overall utilization
        const totalUtilization = (() => {
          let totalHours = 0;
          let totalWebFirstHours = 0;

          validMonths.forEach((month: string) => {
            totalHours += filteredTotals[month] ?? 0;
            filteredUserProjects.forEach((project: MonthlyUserHours) => {
              if (project.projectName.startsWith('WEBFIRST') && project[month] !== '-' && project[month] !== undefined) {
                totalWebFirstHours += Number(project[month]);
              }
            });
          });

          return totalHours > 0
            ? ((totalHours - totalWebFirstHours) / totalHours) * 100
            : 0;
        })();

        setTotalUtilization(totalUtilization);

      } catch (error) {
        setError('Failed to fetch time entries.');
        setLoading(false);
      }
    };

    if (username) {
      fetchUserData();
      fetchTimeEntries();
    }
  }, [username, filter, startDate, endDate]);

  const applyFilter = (startDate: Date, endDate: Date) => {
    const filteredMonths = allMonths.filter((month: string) => {
      const date = parseISO(month);
      return isWithinInterval(date, { start: startDate, end: endDate });
    });

    const filteredUserProjects = allUserProjects.map((user: MonthlyUserHours) => {
      const filteredUser: MonthlyUserHours = { projectName: user.projectName };
      filteredMonths.forEach((month: string) => {
        filteredUser[month] = user[month] ?? 0;
      });
      return filteredUser;
    }).filter((project: MonthlyUserHours) => {
      return filteredMonths.some((month: string) => project[month] !== undefined && project[month] !== 0 && project[month] !== '-');
    });

    const filteredTotals = filteredMonths.reduce((acc, month: string) => {
      acc[month] = allTotals[month] ?? 0;
      return acc;
    }, {} as { [month: string]: number });

    const filteredUtilizations = filteredMonths.reduce((acc: Utilizations, month: string) => {
      acc[month] = utilizations[month];
      return acc;
    }, {} as Utilizations);

    const totalUtilization = (() => {
      let totalHours = 0;
      let totalWebFirstHours = 0;

      filteredMonths.forEach((month: string) => {
        totalHours += filteredTotals[month] ?? 0;
        filteredUserProjects.forEach((project: MonthlyUserHours) => {
          if (project.projectName.startsWith('WEBFIRST') && project[month] !== '-' && project[month] !== undefined) {
            totalWebFirstHours += Number(project[month]);
          }
        });
      });

      return totalHours > 0
        ? ((totalHours - totalWebFirstHours) / totalHours) * 100
        : 0;
    })();

    setMonths(filteredMonths);
    setUserProjects(filteredUserProjects);
    setTotals(filteredTotals);
    setTotalUtilization(totalUtilization);
  };

  const handleApplyDateRange = (ranges: RangeKeyDict) => {
    const selection = ranges.selection;
    if (selection.startDate && selection.endDate) {
      const start = selection.startDate.toISOString().split('T')[0];
      const end = selection.endDate.toISOString().split('T')[0];
      setDateRange([{ startDate: selection.startDate, endDate: selection.endDate, key: 'selection' }]);
      applyFilter(selection.startDate, selection.endDate);
      router.push({
        pathname: router.pathname,
        query: { username, startDate: start, endDate: end },
      });
      setIsModalOpen(false);
    }
  };

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedUserProjects = [...userProjects].sort((a, b) => {
    if (sortConfig.key === 'total') {
      const aTotal = months.reduce((total, month) => total + (a[month] !== '-' ? Number(a[month] ?? 0) : 0), 0);
      const bTotal = months.reduce((total, month) => total + (b[month] !== '-' ? Number(b[month] ?? 0) : 0), 0);
      return sortConfig.direction === 'asc' ? aTotal - bTotal : bTotal - aTotal;
    } else {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    }
  });

  if (loading) {
    return <div className="bg-gray-900 text-white min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (error) {
    return <div className="bg-red-500 text-white p-4">{error}</div>;
  }

  const totalHours = Object.values(totals).reduce((total, monthTotal) => total + monthTotal, 0);
  const displayName = user?.employeeType === 'Contractor' ? `${user?.username} (C)` : user?.username;

  return (
    <div className="p-4 w-full bg-gray-100 dark:bg-gray-900 min-h-screen">
      <Header pageTitle={`User Report: ${displayName}`} />

      <ToastContainer />
      <UserInfo username={username} totalUtilization={totalUtilization} />
      <div className="overflow-x-auto shadow-lg rounded-lg mt-8">
        <div className="flex justify-between items-center mb-4">
          <div className="text-lg font-bold text-gray-800 dark:text-gray-100">
            User Hours Report
          </div>
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={() => setIsModalOpen(true)}
          >
            Select Date Range
          </button>
        </div>
        <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700">
          <thead className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-200">
            <tr>
              <th
                className="py-2 px-4 border-b border-gray-300 dark:border-gray-600 text-left cursor-pointer"
                onClick={() => requestSort('projectName')}
              >
                Project Name
              </th>
              {months.map((month: string) => (
                <th
                  key={month}
                  className="py-2 px-4 border-b border-gray-300 dark:border-gray-600 text-center cursor-pointer"
                  onClick={() => requestSort(month)}
                >
                  {format(parseISO(month), 'MMMM yyyy')}
                </th>
              ))}
              <th
                className="py-2 px-4 border-b border-gray-300 dark:border-gray-600 text-center cursor-pointer"
                onClick={() => requestSort('total')}
              >
                Total Hours
              </th>
            </tr>
          </thead>
          <tbody className="text-gray-900 dark:text-gray-200">
            {sortedUserProjects.length === 0 ? (
              <tr>
                <td colSpan={months.length + 2} className="py-2 px-4 border-b border-gray-300 dark:border-gray-600 text-center">
                  No data available for this user.
                </td>
              </tr>
            ) : (
              sortedUserProjects.map((project: MonthlyUserHours) => (
                <tr key={project.projectName}>
                  <td className="py-2 px-4 border-b border-gray-300 dark:border-gray-600 text-left">
                    <Link href={`/project/${project.projectName}`} legacyBehavior>
                      <a className="text-blue-500 hover:underline">{project.projectName}</a>
                    </Link>
                  </td>
                  {months.map((month: string) => (
                    <td key={month} className="py-2 px-4 border-b border-gray-300 dark:border-gray-600 text-center">
                      {project[month] !== '-' ? Number(project[month] ?? 0).toFixed(2) : project[month]}
                    </td>
                  ))}
                  <td className="py-2 px-4 border-b border-gray-300 dark:border-gray-600 text-center">
                    {months.reduce((total, month: string) => total + (project[month] !== '-' ? Number(project[month] ?? 0) : 0), 0).toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-200">
            <tr>
              <th className="py-2 px-4 border-t border-gray-300 dark:border-gray-600 text-left">Total</th>
              {months.map((month: string) => (
                <th key={month} className="py-2 px-4 border-t border-gray-300 dark:border-gray-600 text-center">
                  {(totals[month] ?? 0).toFixed(2)}
                </th>
              ))}
              <th className="py-2 px-4 border-t border-gray-300 dark:border-gray-600 text-center">
                {totalHours.toFixed(2)}
              </th>
            </tr>
            <tr className="bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-200">
              <th className="py-2 px-4 border-t border-gray-300 dark:border-gray-600 text-left">Utilization</th>
              {months.map((month: string) => (
                <th key={month} className={`py-2 px-4 border-t border-gray-300 dark:border-gray-600 text-center ${utilizations[month] >= 80 ? 'text-green-500' : utilizations[month] >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>
                  {utilizations[month].toFixed(2)}%
                </th>
              ))}
              <th className="py-2 px-4 border-t border-gray-300 dark:border-gray-600 text-center">{totalUtilization.toFixed(2)}%</th>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="flex flex-col md:flex-row mt-8 gap-4">
        <div className="w-full md:w-1/2">
          <ProjectParticipationPieChart username={username} dateRange={dateRange} />
        </div>
        <div className="w-full md:w-1/2">
          <HoursOverTimeBarChart username={username} dateRange={dateRange} />
        </div>
      </div>
      <DateRangePickerModal
        isOpen={isModalOpen}
        onRequestClose={() => setIsModalOpen(false)}
        initialRanges={dateRange}
        onApply={handleApplyDateRange}
        overallStartDate={new Date('2023-01-01')}
        overallEndDate={new Date()}
      />
    </div>
  );
};

export default UserPage;
