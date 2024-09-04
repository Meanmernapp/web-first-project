import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import axios from 'axios';
import Link from 'next/link';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface Project {
  name: string;
  description: string;  // Added description here
  status?: string;
  pm?: string; // Project manager username
  periodOfPerformance?: {
    startDate: string;
    endDate: string;
  };
}

interface User {
  username: string;
  email: string;
}

interface AlertConfig {
  projectName: string;
  managerEmail?: string; // Make this optional
  customEmails: string[];
  lastAlertSent?: string;
}

type SortKey = keyof Project | keyof AlertConfig | 'selected' | 'daysRemaining';

const ProjectEndAlerts: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [alertConfigs, setAlertConfigs] = useState<AlertConfig[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [showActive, setShowActive] = useState<boolean>(true);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' }>({ key: 'name', direction: 'ascending' }); // Default sort config
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';

        const [projectsRes, usersRes, alertConfigsRes] = await Promise.all([
          axios.get(`${baseUrl}/api/projects`, {
            headers: { 'x-api-key': process.env.NEXT_PUBLIC_API_KEY! },
          }),
          axios.get(`${baseUrl}/api/users`, {
            headers: { 'x-api-key': process.env.NEXT_PUBLIC_API_KEY! },
          }),
          axios.get(`${baseUrl}/api/project-end-alerts`, {
            headers: { 'x-api-key': process.env.NEXT_PUBLIC_API_KEY! },
          }),
        ]);

        const sortedProjects = projectsRes.data.sort((a: Project, b: Project) => a.name.localeCompare(b.name));
        setProjects(sortedProjects);
        setUsers(usersRes.data);

        const alertConfigsWithManagerEmails = alertConfigsRes.data.map((config: AlertConfig) => ({
          ...config,
          managerEmail: config.managerEmail ?? getManagerEmail(config.projectName, sortedProjects, usersRes.data),
        }));

        setAlertConfigs(alertConfigsWithManagerEmails);
        setSelectedProjects(new Set(alertConfigsWithManagerEmails.map((config: AlertConfig) => config.projectName)));
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to fetch data.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getManagerEmail = (projectName: string, projects: Project[], users: User[]): string => {
    const project = projects.find(proj => proj.name === projectName);
    if (project) {
      const user = users.find(user => user.username === project.pm);
      return user ? user.email : '';
    }
    return '';
  };

  const calculateDaysRemaining = (endDate: string): number => {
    const today = new Date();
    const end = new Date(endDate);
    const timeDiff = end.getTime() - today.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  };

  const updateAlertConfig = async (alertConfig: AlertConfig) => {
    const url = `/api/project-end-alerts/${encodeURIComponent(alertConfig.projectName)}`;
    const headers = {
      'x-api-key': process.env.NEXT_PUBLIC_API_KEY!,
      'Content-Type': 'application/json',
    };

    try {
      console.log('Updating alert config:', alertConfig); // Log the data being sent
      await axios.post(url, alertConfig, { headers });
      setAlertConfigs(prevConfigs =>
        prevConfigs.map(config => (config.projectName === alertConfig.projectName ? alertConfig : config))
      );
      toast.success(`Alerts updated for project ${alertConfig.projectName}`);
    } catch (error) {
      console.error('Error updating alerts:', error);
      if (axios.isAxiosError(error) && error.response) {
        toast.error(`Error updating alerts: ${error.response.data.message}`);
      } else {
        toast.error('Error updating alerts: An unknown error occurred');
      }
    }
  };

  const removeAlertConfig = async (projectName: string) => {
    const url = `/api/project-end-alerts/${encodeURIComponent(projectName)}`;
    const headers = {
      'x-api-key': process.env.NEXT_PUBLIC_API_KEY!,
      'Content-Type': 'application/json',
    };

    try {
      await axios.delete(url, { headers });
      setAlertConfigs(prevConfigs => prevConfigs.filter(config => config.projectName !== projectName));
      toast.success(`Alerts removed for project ${projectName}`);
    } catch (error) {
      console.error(`Error removing alerts for project ${projectName}:`, error);
      if (axios.isAxiosError(error) && error.response) {
        toast.error(`Error removing alerts: ${error.response.data.message}`);
      } else {
        toast.error('Error removing alerts: An unknown error occurred');
      }
    }
  };

  const toggleProjectSelection = async (projectName: string) => {
    const newSelectedProjects = new Set(selectedProjects);
    const isSelected = newSelectedProjects.has(projectName);

    if (isSelected) {
      newSelectedProjects.delete(projectName);
      await removeAlertConfig(projectName);
    } else {
      const projectManagerEmail = getManagerEmail(projectName, projects, users);

      const alertConfig = {
        projectName,
        managerEmail: projectManagerEmail,
        customEmails: ['jscott@webfirst.com', 'spatel@webfirst.com', 'kdriskell@webfirst.com'],
      };
      newSelectedProjects.add(projectName);
      await updateAlertConfig(alertConfig);
    }

    setSelectedProjects(newSelectedProjects);
  };

  const handleEmailCheckboxChange = async (projectName: string, email: string, isChecked: boolean) => {
    const updatedConfigs = alertConfigs.map(config =>
      config.projectName === projectName
        ? {
            ...config,
            customEmails: isChecked
              ? [...config.customEmails, email]
              : config.customEmails.filter(e => e !== email),
          }
        : config
    );

    const updatedConfig = updatedConfigs.find(config => config.projectName === projectName);
    if (updatedConfig) {
      try {
        console.log('Updating alert config for email change:', updatedConfig); // Log the updated config
        await updateAlertConfig(updatedConfig);
      } catch (error) {
        console.error('Error updating custom emails:', error);
        toast.error('Error updating custom emails.');
      }
    }
  };

  const handleManagerEmailCheckboxChange = async (projectName: string, isChecked: boolean) => {
    const updatedConfigs = alertConfigs.map(config =>
      config.projectName === projectName
        ? {
            ...config,
            managerEmail: isChecked ? getManagerEmail(projectName, projects, users) : '',
          }
        : config
    );

    const updatedConfig = updatedConfigs.find(config => config.projectName === projectName);
    if (updatedConfig) {
      try {
        console.log('Updating alert config for manager email change:', updatedConfig); // Log the updated config
        await updateAlertConfig(updatedConfig);
      } catch (error) {
        console.error('Error updating manager email:', error);
        toast.error('Error updating manager email.');
      }
    }
  };

  const filteredProjects = projects.filter(project =>
    showActive ? project.status?.toLowerCase() === 'active' : project.status?.toLowerCase() !== 'active'
  );

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    if (!sortConfig) return 0;
    const key = sortConfig.key as SortKey;

    let aValue: any, bValue: any;

    if (key === 'selected') {
      aValue = selectedProjects.has(a.name);
      bValue = selectedProjects.has(b.name);
    } else if (key === 'daysRemaining') {
      aValue = a.periodOfPerformance ? calculateDaysRemaining(a.periodOfPerformance.endDate) : 0;
      bValue = b.periodOfPerformance ? calculateDaysRemaining(b.periodOfPerformance.endDate) : 0;
    } else {
      aValue = (a[key as keyof Project] || '').toString();
      bValue = (b[key as keyof Project] || '').toString();
    }

    if (aValue < bValue) {
      return sortConfig.direction === 'ascending' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'ascending' ? 1 : -1;
    }
    return 0;
  });

  const handleSort = (key: SortKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  if (loading) {
    return <div className="bg-gray-900 text-white min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (error) {
    return <div className="bg-red-500 text-white p-4">Error: {error}</div>;
  }

  return (
    <>
      <div className="bg-gray-100 dark:bg-gray-900 min-h-screen">
        <Header pageTitle="Project End Alerts" />
        <ToastContainer />
        <div className="p-4 bg-indigo-500 text-white rounded-md shadow-md mb-4 flex justify-center items-center text-center">
          This page allows you to add projects and notify Project manager Sanjay and Joema 30 days before the project ends.
        </div>
        <div className="mb-4 flex flex-col md:flex-row justify-between">
          <button
            onClick={() => setShowActive(!showActive)}
            className="py-2 px-4 bg-gray-500 dark:bg-indigo-600 hover:bg-gray-600 dark:hover:bg-indigo-700 text-white font-semibold rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {showActive ? 'Show Inactive Projects' : 'Show Active Projects'}
          </button>
        </div>
        <div className="overflow-x-auto">
          <form>
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th
                    scope="col"
                    className="px-2 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('selected')}
                  >
                    Select
                  </th>
                  <th
                    scope="col"
                    className="px-2 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('name')}
                  >
                    Project Name
                  </th>
                  <th
                    scope="col"
                    className="px-2 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('description')}  // Added description sort
                  >
                    Description
                  </th>
                  <th
                    scope="col"
                    className="px-2 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('managerEmail')}
                  >
                    Manager Email
                  </th>
                  <th
                    scope="col"
                    className="px-2 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('customEmails')}
                  >
                    Custom Emails
                  </th>
                  <th
                    scope="col"
                    className="px-2 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('daysRemaining')}
                  >
                    Days Remaining
                  </th>
                  <th
                    scope="col"
                    className="px-2 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('lastAlertSent')}
                  >
                    Last Alert Sent
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {sortedProjects.map(project => {
                  const alertConfig = alertConfigs.find(config => config.projectName === project.name) || {
                    projectName: project.name,
                    managerEmail: getManagerEmail(project.name, projects, users),
                    customEmails: ['jscott@webfirst.com', 'spatel@webfirst.com', 'kdriskell@webfirst.com'],
                  };

                  const isSelected = selectedProjects.has(project.name);
                  const daysRemaining = project.periodOfPerformance ? calculateDaysRemaining(project.periodOfPerformance.endDate) : 'N/A';
                  const lastAlertSent = alertConfig.lastAlertSent ? new Date(alertConfig.lastAlertSent).toLocaleDateString() : 'N/A';
                  const alertSentStyle = alertConfig.lastAlertSent ? 'text-green-500' : 'text-gray-500 dark:text-gray-200';

                  return (
                    <tr key={project.name}>
                      <td className="px-2 md:px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleProjectSelection(project.name)}
                          className="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
                        />
                      </td>
                      <td className="px-2 md:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                        <Link href={`/project/${encodeURIComponent(project.name)}`} legacyBehavior>
                          <a className="text-blue-500 hover:underline">{project.name}</a>
                        </Link>
                      </td>
                      <td className="px-2 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        <div className="whitespace-pre-wrap break-words">{project.description}</div>
                      </td>
                      <td className="px-2 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-200">
                        <label className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={!!alertConfig.managerEmail}
                            onChange={(e) => handleManagerEmailCheckboxChange(project.name, e.target.checked)}
                            className="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
                          />
                          <span className="ml-2">{alertConfig.managerEmail || getManagerEmail(project.name, projects, users)}</span>
                        </label>
                      </td>
                      <td className="px-2 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-200">
                        {['jscott@webfirst.com', 'spatel@webfirst.com', 'kdriskell@webfirst.com'].map(email => (
                          <div key={email}>
                            <label className="inline-flex items-center">
                              <input
                                type="checkbox"
                                checked={alertConfig.customEmails.includes(email)}
                                onChange={(e) => handleEmailCheckboxChange(project.name, email, e.target.checked)}
                                className="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
                              />
                              <span className="ml-2">{email}</span>
                            </label>
                          </div>
                        ))}
                      </td>
                      <td className="px-2 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-200">
                        {daysRemaining}
                      </td>
                      <td className={`px-2 md:px-6 py-4 whitespace-nowrap text-sm ${alertSentStyle}`}>
                        {lastAlertSent}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </form>
        </div>
      </div>
    </>
  );
};

export default ProjectEndAlerts;
