import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import ProjectInfo from '../../components/ProjectInfo';
import Header from '../../components/Header';
import DateRangePickerModal from '../../components/DateRangePickerModal';
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';
import { Range, RangeKeyDict } from 'react-date-range';
import MonthlyPieChart from '../../components/MonthlyPieChart';
import MonthlyBarChart from '../../components/MonthlyBarChart';
import MonthlyPieChartParticipation from '../../components/MonthlyPieChartParticipation';
import axios from 'axios';
import { parseISO, isValid, format, isWithinInterval, isBefore, isAfter } from 'date-fns';
import { GetServerSideProps, GetServerSidePropsContext } from 'next';
import * as Switch from '@radix-ui/react-switch';
const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';

interface MonthlyUserHours {
  username: string;
  [month: string]: number | string;
}
interface SwitchWithLabelsProps {
  showHrs: boolean; // This will be a boolean
  handleHrs: (checked: boolean) => void; // This is a function that takes a boolean and returns void
}

interface User {
  username: string;
  employeeType: string;
  title: string; // Include title here
  createdAt: string;
  updatedAt: string;
}
interface ProjectDetails {
  name: string;
  status: string;
  contractType: string;
  periodOfPerformance: {
    startDate: Date;
    endDate: Date;
  };
  budgetHours: number;
  description: string;
  pm: string;
  showHrs?: boolean;
}

interface ProjectProps {
  projectId: string;
}
interface LatestDates {
  createdAt: string;
  updatedAt: string;
}

const Project: React.FC<ProjectProps> = ({ projectId }) => {
  const [projectFlag, setProjectFlag] = useState<boolean>(true);
  const [showHrs, setShowHrs] = useState<boolean>(false);
  const [groupProjects, setGroupProjects] = useState<string[]>([]);
  const [userHours, setUserHours] = useState<MonthlyUserHours[]>([]);
  const [allUserHours, setAllUserHours] = useState<MonthlyUserHours[]>([]);
  const [months, setMonths] = useState<string[]>([]);
  const [allMonths, setAllMonths] = useState<string[]>([]);
  const [totals, setTotals] = useState<{ [month: string]: number }>({});
  const [project, setProject] = useState<ProjectDetails>({} as ProjectDetails);
  const [allTotals, setAllTotals] = useState<{ [month: string]: number }>({});
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'username', direction: 'asc' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<LatestDates>({
    createdAt: new Date().toDateString(),
    updatedAt: new Date().toDateString()
  });
  const [dateRange, setDateRange] = useState<Range[]>([
    {
      startDate: new Date('2023-01-01'),
      endDate: new Date(),
      key: 'selection'
    }
  ]);

  const [userDetails, setUserDetails] = useState<{ [key: string]: User }>({});
  const [description, setDescription] = useState<string>("");

  const router = useRouter();

  useEffect(() => {
    if (projectId) {
      fetchData(projectId);
    }
  }, [projectId]);

  const fetchData = async (projectId: string) => {
    try {
      const [entriesResponse, usersResponse, recentEntryResponse] = await Promise.all([
        axios.get(`${baseUrl}/api/processed-time-entries/${projectId}`, {
          headers: {
            'x-api-key': process.env.NEXT_PUBLIC_API_KEY!,
          },
        }),
        axios.get(`${baseUrl}/api/users`, {
          headers: {
            'x-api-key': process.env.NEXT_PUBLIC_API_KEY!,
          },
        }),
        axios.get(`${baseUrl}/api/getRecentTimeEntry`, {
          headers: {
            'x-api-key': process.env.NEXT_PUBLIC_API_KEY!,
          },
        })
      ]);

      const { userHours, months, project } = entriesResponse.data;
      const users: User[] = usersResponse.data;
      setShowHrs(project.showHrs)
      setProject(project)

      const startDate = project?.periodOfPerformance?.startDate
        ? parseISO(project.periodOfPerformance.startDate)
        : null;

      const endDate = project?.periodOfPerformance?.endDate
        ? parseISO(project.periodOfPerformance.endDate)
        : null;

      const validMonths = months.filter((month: string) => {
        const date = parseISO(month);

        if (!isValid(date)) return false;

        if (startDate && endDate && project.showHrs) {
          return (
            isAfter(date, startDate) || date.getTime() === startDate.getTime()
          ) && (
              isBefore(date, endDate) || date.getTime() === endDate.getTime()
            );
        }

        return isValid(date) && date.getFullYear() > 1970;
      });

      const filteredUserHours = userHours.map((user: MonthlyUserHours) => {
        const filteredUser: MonthlyUserHours = { username: user.username };
        validMonths.forEach((month: string) => {
          if (user[month] !== undefined) {
            filteredUser[month] = user[month];
          }
        });
        return filteredUser;
      }).filter((user: MonthlyUserHours) => user.username);

      const filteredTotals: { [month: string]: number } = {};
      validMonths.forEach((month: string) => {
        if (entriesResponse.data.totals[month] !== undefined) {
          filteredTotals[month] = entriesResponse.data.totals[month];
        }
      });
      const recentEntryDate = recentEntryResponse.data;

      const formattedDate = new Date(recentEntryDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        timeZone: 'UTC',
      });

      setLastUpdated({ createdAt: formattedDate, updatedAt: formattedDate });

      const userDetailsMap: { [key: string]: User } = {};
      users.forEach(user => {
        userDetailsMap[user.username] = user;
      });

      setAllUserHours(filteredUserHours);
      setAllMonths(validMonths);
      setAllTotals(filteredTotals);
      setUserDetails(userDetailsMap);
      applyFilter(dateRange[0].startDate!, dateRange[0].endDate!, filteredUserHours, validMonths, filteredTotals);
    } catch (error) {
      setError((error as Error).message);
    }
  };

  const applyFilter = (startDate: Date, endDate: Date, data: MonthlyUserHours[], monthsData: string[], totalsData: { [month: string]: number }) => {
    if (!startDate || !endDate) {
      return;
    }

    const filteredMonths = monthsData.filter(month => {
      const date = parseISO(month);
      return isWithinInterval(date, { start: startDate, end: endDate });
    });

    const filteredUserHours = data.map(user => {
      const filteredUser: MonthlyUserHours = { username: user.username };
      filteredMonths.forEach(month => {
        filteredUser[month] = user[month] ?? 0;
      });
      return filteredUser;
    });

    const filteredTotals = filteredMonths.reduce((acc, month) => {
      acc[month] = totalsData[month] ?? 0;
      return acc;
    }, {} as { [month: string]: number });

    setMonths(filteredMonths);
    setUserHours(filteredUserHours);
    setTotals(filteredTotals);
  };

  const handleApplyDateRange = (ranges: RangeKeyDict) => {
    const selection = ranges.selection;
    if (selection.startDate && selection.endDate) {
      setDateRange([selection]);
      applyFilter(selection.startDate, selection.endDate, allUserHours, allMonths, allTotals);
      setIsModalOpen(false);
    }
  };

  const sortedUserHours = [...userHours].sort((a, b) => {
    let aValue: number | string;
    let bValue: number | string;

    if (sortConfig.key === 'total') {
      aValue = months.reduce((total, month) => total + (a[month] !== '-' ? Number(a[month] ?? 0) : 0), 0);
      bValue = months.reduce((total, month) => total + (b[month] !== '-' ? Number(b[month] ?? 0) : 0), 0);
    } else {
      aValue = a[sortConfig.key] ?? '';
      bValue = b[sortConfig.key] ?? '';
    }

    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  if (error) {
    return <div className="bg-red-500 text-white p-4">Error: {error}</div>;
  }

  const totalHours = Object.values(totals).reduce((total, monthTotal) => total + monthTotal, 0);

  const handleHrs = async (checked: boolean) => {
    setShowHrs(checked);
    await axios.put(`/api/projects/${projectId}`, {
      showHrs: checked,
    }, {
      headers: {
        'x-api-key': process.env.NEXT_PUBLIC_API_KEY!,
      },
    });
    
    if (checked) {
      applyFilter(project.periodOfPerformance.startDate, project.periodOfPerformance.endDate, allUserHours, allMonths, allTotals);
    } else {
      applyFilter(dateRange[0].startDate!, dateRange[0].endDate!, allUserHours, allMonths, allTotals);
    }
  };

  return (
    <div className="p-4 w-full bg-gray-100 dark:bg-gray-900 min-h-screen">
      <Header pageTitle={`Project Report ${projectId}`} description={description} />
      <ToastContainer />
      <ProjectInfo projectId={projectId} totalHours={totalHours} setDescription={setDescription} setProjectFlag={setProjectFlag} setGroupProjects={setGroupProjects} checked={showHrs} />

      {sortedUserHours.length === 0 ? (
        <div className="text-gray-900 dark:text-gray-100 text-center mt-8">
          No data available for this project.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto shadow-lg rounded-lg mt-8">
            <div className="flex justify-between items-center mb-4">
              <div className="text-lg font-bold text-gray-800 dark:text-gray-100">
                User Hours Report:  <span className="text-sm ml-2 text-gray-600 dark:text-gray-400">
                  Data as of: {lastUpdated.createdAt}
                </span>
              </div>
              {groupProjects?.length > 0 && (
                <div className="text-sm font-bold text-gray-800 dark:text-gray-100">
                  Budget & Hrs. Remain grouped for {groupProjects?.join(", ")}
                  {!projectFlag && (
                    <span className="text-sm ml-2 text-gray-600 dark:text-gray-400" style={{ color: projectFlag ? 'black' : 'red' }}>
                      (Project Hours not match)
                    </span>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2">
                {/* Custom Switch Component */}
                <div className="flex items-center space-x-4">
      {/* Left Label */}
      <span className={`transition-all duration-300 ease-in-out 
        ${!showHrs ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-500 dark:text-gray-400'}`}>
        All Months
      </span>

      {/* Switch Container */}
      <Switch.Root
        className={`relative inline-flex items-center w-[70px] h-[36px] rounded-full 
        ${showHrs ? 'bg-blue-500 dark:bg-green-600' : 'bg-gray-300 dark:bg-gray-700'} 
        transition-colors duration-300 ease-in-out cursor-pointer`}
        checked={showHrs}
        onCheckedChange={handleHrs}
      >
        {/* Thumb */}
        <Switch.Thumb
          className={`block w-[32px] h-[32px] bg-white dark:bg-gray-200 rounded-full shadow-md transform transition-transform duration-300 ease-in-out 
          ${showHrs ? 'translate-x-[34px]' : 'translate-x-[2px]'}`}
        />
      </Switch.Root>

      {/* Right Label */}
      <span className={`transition-all duration-300 ease-in-out 
        ${showHrs ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-500 dark:text-gray-400'}`}>
        Enforce POP
      </span>
    </div>
               <button
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  onClick={() => setIsModalOpen(true)}
                >
                  Select Date Range
                </button>
              </div>
            </div>

            <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700">
              <thead className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-200">
                <tr>
                  <th
                    className="py-2 px-4 border-b border-gray-300 dark:border-gray-600 text-left cursor-pointer"
                    onClick={() => requestSort('username')}
                  >
                    Username
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
                  <th className="py-2 px-4 border-b border-gray-300 dark:border-gray-600 text-center cursor-pointer" onClick={() => requestSort('total')}>Total Hours</th>
                </tr>
              </thead>

              <tbody>
                {sortedUserHours
                  .filter((user: MonthlyUserHours) =>
                    months.reduce((total, month) => total + (user[month] !== '-' ? Number(user[month] ?? 0) : 0), 0) > 0
                  )
                  .map((user: MonthlyUserHours) => {
                    const userType = userDetails[user.username]?.employeeType;
                    const displayName = userType === 'Contractor' ? `${user.username} (C)` : user.username;
                    return (
                      <tr key={user.username}>
                        <td className="py-2 px-4 border-b border-gray-300 dark:border-gray-600 text-left text-gray-800 dark:text-gray-300">
                          <Link href={`/users/${user.username}`} legacyBehavior>
                            <a className="text-blue-500 hover:underline dark:text-blue-400">{displayName}</a>
                          </Link>
                        </td>
                        {months.map((month: string) => (
                          <td
                            key={month}
                            className="py-2 px-4 border-b border-gray-300 dark:border-gray-600 text-center text-gray-800 dark:text-gray-300"
                          >
                            {user[month] !== '-' ? Number(user[month] ?? 0).toFixed(2) : user[month]}
                          </td>
                        ))}
                        <td className="py-2 px-4 border-b border-gray-300 dark:border-gray-600 text-center text-gray-800 dark:text-gray-300">
                          {months.reduce((total, month) => total + (user[month] !== '-' ? Number(user[month] ?? 0) : 0), 0).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>

              <tfoot className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-200">
                <tr>
                  <th className="py-2 px-4 border-t border-gray-300 dark:border-gray-600 text-left cursor-pointer">Total</th>
                  {months.map((month: string) => (
                    <th key={month} className="py-2 px-4 border-t border-gray-300 dark:border-gray-600 text-center">
                      {(totals[month] ?? 0).toFixed(2)}
                    </th>
                  ))}
                  <th className="py-2 px-4 border-t border-gray-300 dark:border-gray-600 text-center">
                    {totalHours.toFixed(2)}
                  </th>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex flex-col md:flex-row mt-8 gap-4">
            <div className="w-full md:w-1/2">
              <MonthlyPieChart projectId={projectId} filteredData={userHours} userDetails={userDetails} />
            </div>
            <div className="w-full md:w-1/2">
              <MonthlyPieChartParticipation projectId={projectId} filteredData={userHours} />
            </div>
          </div>
          <div className="mt-8">
            <MonthlyBarChart projectId={projectId} filteredData={{ userHours, months }} />
          </div>
        </>
      )}

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

export const getServerSideProps: GetServerSideProps = async (context: GetServerSidePropsContext) => {
  return {
    props: { projectId: context.query.projectId as string },
  };
};

export default Project;
