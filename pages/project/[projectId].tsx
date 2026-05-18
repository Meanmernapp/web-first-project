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
    return (
      <div className="min-h-screen bg-surface p-6">
        <div className="ui-card border-rose-500/40 bg-rose-950/25 p-4 text-rose-100">Error: {error}</div>
      </div>
    );
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
    <div className="min-h-screen w-full bg-surface">
      <Header pageTitle={`Project report: ${projectId}`} description={description} />
      <ToastContainer theme="dark" />
      <div className="app-shell">
        <ProjectInfo projectId={projectId} totalHours={totalHours} setDescription={setDescription} setProjectFlag={setProjectFlag} setGroupProjects={setGroupProjects} checked={showHrs} />

      {sortedUserHours.length === 0 ? (
        <div className="ui-card mt-8 px-4 py-10 text-center text-fg-muted">
          No data available for this project.
        </div>
      ) : (
        <>
          <div className="ui-card mt-8 overflow-hidden p-4">
            <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-fg">User hours</h2>
                <p className="mt-1 text-sm text-fg-muted">Data as of: {lastUpdated.createdAt}</p>
              </div>
              {groupProjects?.length > 0 && (
                <div className="text-sm text-fg">
                  <span className="font-medium">Budget grouped with:</span>{' '}
                  <span className="text-fg-muted">{groupProjects?.join(', ')}</span>
                  {!projectFlag && (
                    <span className="ml-2 font-medium text-rose-400">(Project hours do not match)</span>
                  )}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-3">
                  <span className={`text-sm transition-colors ${!showHrs ? 'font-semibold text-accent' : 'text-fg-muted'}`}>
                    All months
                  </span>
                  <Switch.Root
                    className={`relative inline-flex h-9 w-[68px] shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                      showHrs ? 'bg-emerald-600' : 'bg-line-strong'
                    }`}
                    checked={showHrs}
                    onCheckedChange={handleHrs}
                  >
                    <Switch.Thumb
                      className={`block h-8 w-8 rounded-full bg-fg shadow-md transition-transform duration-200 ${
                        showHrs ? 'translate-x-[34px]' : 'translate-x-0.5'
                      }`}
                    />
                  </Switch.Root>
                  <span className={`text-sm transition-colors ${showHrs ? 'font-semibold text-accent' : 'text-fg-muted'}`}>
                    Enforce POP
                  </span>
                </div>
                <button type="button" className="btn-primary" onClick={() => setIsModalOpen(true)}>
                  Date range
                </button>
              </div>
            </div>

            <div className="table-shell max-h-[min(70vh,880px)] overflow-auto">
            <table className="table-data min-w-full border-collapse text-left text-sm">
              <thead className="sticky top-0 z-10 border-b border-line bg-surface-inset">
                <tr>
                  <th
                    scope="col"
                    className="cursor-pointer px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-fg-muted hover:text-fg"
                    onClick={() => requestSort('username')}
                  >
                    Username
                  </th>
                  {months.map((month: string) => (
                    <th
                      key={month}
                      scope="col"
                      className="cursor-pointer whitespace-nowrap px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-fg-muted hover:text-fg"
                      onClick={() => requestSort(month)}
                    >
                      {format(parseISO(month), 'MMMM yyyy')}
                    </th>
                  ))}
                  <th scope="col" className="cursor-pointer px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-fg-muted hover:text-fg" onClick={() => requestSort('total')}>Total</th>
                </tr>
              </thead>

              <tbody className="bg-surface-elevated">
                {sortedUserHours
                  .filter((user: MonthlyUserHours) =>
                    months.reduce((total, month) => total + (user[month] !== '-' ? Number(user[month] ?? 0) : 0), 0) > 0
                  )
                  .map((user: MonthlyUserHours) => {
                    const userType = userDetails[user.username]?.employeeType;
                    const displayName = userType === 'Contractor' ? `${user.username} (C)` : user.username;
                    return (
                      <tr key={user.username}>
                        <td className="border-b border-line px-3 py-2 text-left">
                          <Link href={`/users/${user.username}`} className="font-medium text-accent hover:text-accent-hover hover:underline">
                            {displayName}
                          </Link>
                        </td>
                        {months.map((month: string) => (
                          <td
                            key={month}
                            className="border-b border-line px-3 py-2 text-center tabular-nums text-fg-muted"
                          >
                            {user[month] !== '-' ? Number(user[month] ?? 0).toFixed(2) : user[month]}
                          </td>
                        ))}
                        <td className="border-b border-line px-3 py-2 text-center tabular-nums text-fg">
                          {months.reduce((total, month) => total + (user[month] !== '-' ? Number(user[month] ?? 0) : 0), 0).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>

              <tfoot className="border-t border-line bg-surface-inset text-xs font-semibold uppercase tracking-wide text-fg-muted">
                <tr>
                  <th className="px-3 py-2.5 text-left">Total</th>
                  {months.map((month: string) => (
                    <th key={month} className="px-3 py-2.5 text-center tabular-nums text-fg">
                      {(totals[month] ?? 0).toFixed(2)}
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-center tabular-nums text-fg">
                    {totalHours.toFixed(2)}
                  </th>
                </tr>
              </tfoot>
            </table>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-4 md:flex-row">
            <div className="ui-card w-full p-4 md:w-1/2">
              <MonthlyPieChart projectId={projectId} filteredData={userHours} userDetails={userDetails} />
            </div>
            <div className="ui-card w-full p-4 md:w-1/2">
              <MonthlyPieChartParticipation projectId={projectId} filteredData={userHours} />
            </div>
          </div>
          <div className="ui-card mt-8 p-4">
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
    </div>
  );
};

export const getServerSideProps: GetServerSideProps = async (context: GetServerSidePropsContext) => {
  return {
    props: { projectId: context.query.projectId as string },
  };
};

export default Project;
