import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Header from '../components/Header';

interface Project {
  name: string;
  status?: string;
  contractType?: string
}

const Dashboard: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('Date not available');
  const router = useRouter();
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const projectsRes = await fetch(`${baseUrl}/api/projects`, {
          headers: {
            'x-api-key': process.env.NEXT_PUBLIC_API_KEY!,
          },
        });

        if (!projectsRes.ok) {
          throw new Error(`Failed to fetch projects: ${projectsRes.statusText}`);
        }

        const projectsData: Project[] = await projectsRes.json();
        setProjects(projectsData);

        const importLogRes = await fetch(`${baseUrl}/api/newest-import-log`, {
          headers: {
            'x-api-key': process.env.NEXT_PUBLIC_API_KEY!,
          },
        });

        if (!importLogRes.ok) {
          throw new Error(`Failed to fetch import log: ${importLogRes.statusText}`);
        }

        const importLogData = await importLogRes.json();
        setLastUpdated(importLogData.lastUpdated || 'Date not available');
      } catch (error) {
        console.error('Error fetching data:', error);
        setError((error as Error).message);
      }
    };

    fetchProjects();
  }, [baseUrl]);

  useEffect(() => {
    const updatedProjects = projects.map(project => ({
      ...project,
      status: project.status === 'Unknown' || project.status === 'Inactive' || !project.status ? 'Inactive' : project.status,
    }));

    let filtered = updatedProjects;
    if (showInactive) {
      filtered = updatedProjects.filter(project => project.status === 'Inactive');
    } else {
      filtered = updatedProjects.filter(project => project.status === 'Active');
    }

    setFilteredProjects(filtered);
  }, [showInactive, projects]);

  const handleProjectSelect = (project: Project) => {
    router.push(`/project/${project.name}`);
  };

  const handleInactiveToggle = () => {
    setShowInactive(!showInactive);
  };

  const groupProjectsByPrefix = (projects: Project[]) => {
    const sortedProjects = projects.sort((a, b) => a.name.localeCompare(b.name));

    const grouped = sortedProjects.reduce((acc, project) => {
      const [prefix] = project.name.split('-');
      if (!acc[prefix]) {
        acc[prefix] = [];
      }
      acc[prefix].push(project);
      return acc;
    }, {} as { [key: string]: Project[] });

    Object.keys(grouped).forEach(prefix => {
      grouped[prefix].sort((a, b) => {
        const numA = parseInt(a.name.split('-')[1]);
        const numB = parseInt(b.name.split('-')[1]);
        return numA - numB;
      });
    });

    return grouped;
  };

  if (error) {
    return <div className="bg-red-500 text-white p-4">Error: {error}</div>;
  }

  if (projects.length === 0) {
    return <div className="bg-gray-900 text-white min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const groupedProjects = groupProjectsByPrefix(filteredProjects);

  return (
    <div className="p-4 bg-gray-200 dark:bg-gray-900 min-h-screen">
      <Header pageTitle="Project Timesheets" />

      <ToastContainer />
      <div className="flex flex-col md:flex-row justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4 md:mb-0">
          {showInactive ? 'Inactive Projects' : 'Active Projects'}
          <span className="text-sm ml-2 text-gray-600 dark:text-gray-400">Data as of: {lastUpdated}</span>
        </h2>
        <div className="flex space-x-2">
          <button
            className={`px-4 py-2 rounded ${showInactive ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
            onClick={handleInactiveToggle}
          >
            {showInactive ? 'Show Active Projects' : 'Show Inactive Projects'}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Object.keys(groupProjectsByPrefix(filteredProjects)).map(prefix => (
          <div key={prefix} className="border border-gray-400 rounded-lg p-4 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 shadow-md">
            <h3 className="text-xl font-bold mb-2">{prefix}</h3>
            <div className="space-y-2">
              {groupProjectsByPrefix(filteredProjects)[prefix].map(project => (
                <button
                  key={project.name}
                  className="w-full text-left p-2 border border-gray-400 dark:border-gray-700 rounded-lg bg-gray-200 dark:bg-gray-900 hover:bg-gray-300 dark:hover:bg-gray-700"
                  onClick={() => handleProjectSelect(project)}
                >
                  <div className="flex justify-between items-center">
                    <span className='flex gap-1 items-center'>
                      <span className="break-words">{project.name}</span>
                      <span className="break-words">{project.contractType === 'Time and Materials' ? "(T&M)" : "(FFP)"}</span>

                    </span>
                    <span className={`text-sm ${project.status === 'Active' ? 'text-green-500' : 'text-red-500'}`}>
                      {project.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
