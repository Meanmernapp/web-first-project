import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Header from '../components/Header';
import { ToastContainer, toast } from 'react-toastify';
import Link from 'next/link';
import 'react-toastify/dist/ReactToastify.css';

interface Project {
  name: string;
  description: string; // Added description here
  status?: string;
  pm?: string;
}

interface User {
  username: string;
  email: string;
}

interface AlertConfig {
  projectName: string;
  managerEmail: string;
  customEmails: string[];
  alert50: number;
  alert80: number;
  lastAlert50?: string;
  lastAlert80?: string;
}

type SortKey = keyof Project | keyof AlertConfig | 'selected';

const ProjectAlerts: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [alertConfigs, setAlertConfigs] = useState<AlertConfig[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [showActive, setShowActive] = useState<boolean>(true);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' }>({ key: 'name', direction: 'ascending' }); // Default sort config
  const [alertConfigsState, setAlertConfigsState] = useState<AlertConfig[]>([]);

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
          axios.get(`${baseUrl}/api/project-alerts`, {
            headers: { 'x-api-key': process.env.NEXT_PUBLIC_API_KEY! },
          }),
        ]);

        const sortedProjects = projectsRes.data.sort((a: Project, b: Project) => a.name.localeCompare(b.name));
        setProjects(sortedProjects);
        setUsers(usersRes.data);
        setAlertConfigs(alertConfigsRes.data);
        setAlertConfigsState(alertConfigsRes.data);
        setSelectedProjects(new Set(alertConfigsRes.data.map((config: AlertConfig) => config.projectName)));
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  const getManagerEmail = (projectName: string) => {
    const project = projects.find(proj => proj.name === projectName);
    if (project) {
      const user = users.find(user => user.username === project.pm);
      return user ? user.email : '';
    }
    return '';
  };

  const updateAlertConfig = async (alertConfig: AlertConfig) => {
    const url = `/api/projects/${alertConfig.projectName}/alerts`;
    const headers = {
      'x-api-key': process.env.NEXT_PUBLIC_API_KEY!,
      'Content-Type': 'application/json',
    };

    try {
      await axios.post(url, alertConfig, { headers });
      toast.success(`Alerts updated for project ${alertConfig.projectName}`);
    } catch (error) {
      console.error('Error updating alerts:', error);
      toast.error('Error updating alerts');
    }
  };

  const removeAlertConfig = async (projectName: string) => {
    const url = `/api/projects/${projectName}/alerts`;
    const headers = {
      'x-api-key': process.env.NEXT_PUBLIC_API_KEY!,
      'Content-Type': 'application/json',
    };

    try {
      await axios.delete(url, { headers });
      toast.success(`Alerts removed for project ${projectName}`);
    } catch (error) {
      console.error(`Error removing alerts for project ${projectName}:`, error);
      toast.error('Error removing alerts');
    }
  };

  const toggleProjectSelection = async (projectName: string) => {
    const newSelectedProjects = new Set(selectedProjects);
    const isSelected = newSelectedProjects.has(projectName);

    if (isSelected) {
      newSelectedProjects.delete(projectName);
      await removeAlertConfig(projectName);
    } else {
      const managerEmail = getManagerEmail(projectName);
      const alertConfig = {
        projectName,
        managerEmail: managerEmail,
        customEmails: ['kostas@webfirst.com', 'spatel@webfirst.com', 'kdriskell@webfirst.com'], // Default checked emails
        alert50: 0.5,
        alert80: 0.8,
      };
      newSelectedProjects.add(projectName);
      await updateAlertConfig(alertConfig);
    }

    setSelectedProjects(newSelectedProjects);
  };

  const handleInputChange = (projectName: string, field: keyof AlertConfig, value: string | number | string[]) => {
    setAlertConfigsState(prevConfigs =>
      prevConfigs.map(config =>
        config.projectName === projectName ? { ...config, [field]: value } : config
      )
    );
  };

  const handleEmailCheckboxChange = async (projectName: string, email: string, isChecked: boolean) => {
    setAlertConfigsState(prevConfigs => {
      const updatedConfigs = prevConfigs.map(config =>
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
        updateAlertConfig(updatedConfig);
      }
      return updatedConfigs;
    });
  };

  const handleAlertThresholdChange = (projectName: string, field: keyof AlertConfig, value: number) => {
    setAlertConfigsState(prevConfigs =>
      prevConfigs.map(config =>
        config.projectName === projectName ? { ...config, [field]: value / 100 } : config
      )
    );

    const updatedConfig = alertConfigsState.find(config => config.projectName === projectName);
    if (updatedConfig) {
      updateAlertConfig({ ...updatedConfig, [field]: value / 100 });
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
    } else if (key === 'lastAlert50' || key === 'lastAlert80') {
      const aConfig = alertConfigsState.find(config => config.projectName === a.name);
      const bConfig = alertConfigsState.find(config => config.projectName === b.name);
      aValue = aConfig ? !!aConfig[key] : false;
      bValue = bConfig ? !!bConfig[key] : false;
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

  const getEmailStatus = (threshold: '50' | '80', alertConfig?: AlertConfig) => {
    if (!alertConfig) return 'Not Sent'; // Handle case where alertConfig is undefined

    const statusField = `lastAlert${threshold}` as keyof AlertConfig;
    if (!alertConfig[statusField]) {
      return 'Not Sent';
    }
    return 'Sent';
  };

  return (
    <div className="bg-gray-100 dark:bg-gray-900 min-h-screen">
      <Header pageTitle="Project Alerts" />
      <ToastContainer />
      <div className="p-4 bg-indigo-500 text-white rounded-md shadow-md mb-4 flex justify-center items-center text-center">
        This page allows you to set notifications for projects reaching 50% and 80% completion.
      </div>
      <div className="p-4">
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
                  <th className="px-2 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('selected')}>
                    Select
                  </th>
                  <th onClick={() => handleSort('name')} className="cursor-pointer px-2 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider">
                    Project Name
                  </th>
                  <th onClick={() => handleSort('description')} className="cursor-pointer px-2 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider">
                    Description
                  </th>
                  <th onClick={() => handleSort('pm')} className="cursor-pointer px-2 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider">
                    Project Manager
                  </th>
                  <th onClick={() => handleSort('customEmails')} className="cursor-pointer px-2 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider">
                    Custom Emails
                  </th>
                  <th onClick={() => handleSort('lastAlert50')} className="cursor-pointer px-2 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider">
                    Status 50%
                  </th>
                  <th onClick={() => handleSort('lastAlert80')} className="cursor-pointer px-2 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider">
                    Status 80%
                  </th>
                  <th onClick={() => handleSort('alert50')} className="cursor-pointer px-2 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider">
                    Alert 50%
                  </th>
                  <th onClick={() => handleSort('alert80')} className="cursor-pointer px-2 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider">
                    Alert 80%
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {sortedProjects.map(project => {
                  const alertConfig = alertConfigsState.find(config => config.projectName === project.name);
                  const isSelected = selectedProjects.has(project.name);

                  return (
                    <tr key={project.name} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-2 md:px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleProjectSelection(project.name)}
                          className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-400 border-gray-300 dark:border-gray-600 rounded"
                        />
                      </td>
                      <td className="px-2 md:px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100">
                        <Link href={`/project/${encodeURIComponent(project.name)}`} legacyBehavior>
                          <a className="text-blue-500 hover:underline">{project.name}</a>
                        </Link>
                      </td>
                      <td className="px-2 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        <div className="whitespace-pre-wrap break-words">{project.description}</div>
                      </td>
                      <td className="px-2 md:px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">{project.pm}</td>
                      <td className="px-2 md:px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          {['kostas@webfirst.com', 'spatel@webfirst.com', 'kdriskell@webfirst.com'].map(email => (
                            <label key={email} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={alertConfig?.customEmails.includes(email) || false}
                                onChange={(e) => handleEmailCheckboxChange(project.name, email, e.target.checked)}
                                className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-400 border-gray-300 dark:border-gray-600 rounded"
                              />
                              <span className="text-gray-900 dark:text-gray-100">{email}</span>
                            </label>
                          ))}
                        </div>
                      </td>
                      <td className={`px-2 md:px-6 py-4 whitespace-nowrap ${alertConfig?.lastAlert50 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-900 dark:text-gray-100'}`}>
                        {getEmailStatus('50', alertConfig)}
                      </td>
                      <td className={`px-2 md:px-6 py-4 whitespace-nowrap ${alertConfig?.lastAlert80 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
                        {getEmailStatus('80', alertConfig)}
                      </td>
                      <td className="px-2 md:px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          value={alertConfig?.alert50 ? Math.round(alertConfig.alert50 * 100) : 0}
                          onChange={(e) => handleAlertThresholdChange(project.name, 'alert50', Number(e.target.value))}
                          className="w-16 md:w-20 border border-gray-300 dark:border-gray-600 rounded-md p-1 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                        />
                      </td>
                      <td className="px-2 md:px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          value={alertConfig?.alert80 ? Math.round(alertConfig.alert80 * 100) : 0}
                          onChange={(e) => handleAlertThresholdChange(project.name, 'alert80', Number(e.target.value))}
                          className="w-16 md:w-20 border border-gray-300 dark:border-gray-600 rounded-md p-1 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProjectAlerts;
