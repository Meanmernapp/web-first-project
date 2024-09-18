import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Header from '../components/Header';

interface Project {
  name: string;
  status?: string;
  contractType?: string
  budgetHours?: number
  projectTotalHours?: number
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
        console.log(projectsData);
        setProjects(projectsData);

        // New API call to get the most recent date from timeEntries
        const recentDateRes = await fetch(`${baseUrl}/api/getRecentTimeEntry`, {
          headers: {
            'x-api-key': process.env.NEXT_PUBLIC_API_KEY!,
          },
        });

        if (!recentDateRes.ok) {
          throw new Error(`Failed to fetch recent date: ${recentDateRes.statusText}`);
        }

        const recentDate = await recentDateRes.json();

        // Format the date using toLocaleDateString to MM/DD/YYYY
        const formattedDate = new Date(recentDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          timeZone: 'UTC',  // Ensures the date is interpreted in UTC
        });

        setLastUpdated(formattedDate || 'Date not available');
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
              {groupProjectsByPrefix(filteredProjects)[prefix].map(project => {
                let hrsRemain = project.budgetHours && project.projectTotalHours && ((project.budgetHours - project.projectTotalHours));
                let progress = hrsRemain && project.budgetHours && Math.round(((hrsRemain) / (project.budgetHours)) * 100);
                let hrsUsed = project.budgetHours && project.projectTotalHours && project.projectTotalHours;
                let progressUsed = hrsUsed && project.budgetHours && Math.round((hrsUsed / project.budgetHours) * 100);

                console.log(hrsRemain, progress, hrsUsed, progressUsed);
                // Determine the color based on the progress
                let bgColor = 'bg-gray-300 dark:bg-gray-600'; // Default color (less than 70%)
                if (progressUsed && progress)

                  if (progress < 0 || progressUsed > 85) {
                    bgColor = 'bg-red-500'; // More than 85% used or negative remaining hours
                  } else if (progressUsed >= 70 && progressUsed <= 85) {
                    bgColor = 'bg-yellow-500'; // Between 70% and 85% used
                  }

                return (
                  <button
                    key={project.name}
                    className={`w-full text-left p-2 border border-gray-400 dark:border-gray-700 rounded-lg ${bgColor} hover:bg-opacity-75 text-gray-900 dark:text-slate-200		`}

                    onClick={() => handleProjectSelect(project)}
                  >
                    <div className="flex justify-between items-center">
                      <span className='flex gap-1 items-center'>
                        <span className="break-words">{project.name}</span>
                        <span className="break-words">
                          {project.contractType
                            ? (project.contractType === 'Time and Materials' ? "(T&M)" : "(FFP)")
                            : ""
                          }
                        </span>


                      </span>
                      <span className={`text-sm ${project.status === 'Active' ? 'text-green-500' : 'text-red-500'}`}>
                        {project.status}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 p-4 border border-gray-400 dark:border-gray-700 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 shadow-md">
        <h3 className="text-lg font-bold mb-4">Budget Usage Indicators</h3>
        <div className="flex flex-col items-start ">
          {/* Gray Box */}
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4  bg-gray-300 dark:bg-gray-600 rounded-md "></div>
            <span className="text-center">0-70% of budget</span>
          </div>
          {/* Yellow Box */}
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4  bg-yellow-500 rounded-md "></div>
            <span className="text-center">70-85% of budget</span>
          </div>

          {/* Red Box */}
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4  bg-red-500 rounded-md "></div>
            <span className="text-center">Greater than 85% or negative</span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;