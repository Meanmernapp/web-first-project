import React, { useEffect, useState } from "react";
import { FaInfoCircle } from "react-icons/fa";
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';

interface ProjectInfoProps {
  projectId: string;
  totalHours: number;
  setDescription: (description: string) => void;
}

interface ProjectDetails {
  name: string;
  status: string;
  contractType: string;
  periodOfPerformance: {
    startDate: string;
    endDate: string;
  };
  budgetHours: number;
  description: string;
  pm: string;
}

const ProjectInfo: React.FC<ProjectInfoProps> = ({ projectId, totalHours, setDescription }) => {
  const [projectDetails, setProjectDetails] = useState<ProjectDetails | null>(null);

  useEffect(() => {
    if (!projectId) return;

    const fetchData = async () => {
      try {
        const response = await fetch(`/api/projects`, {
          headers: {
            'x-api-key': process.env.NEXT_PUBLIC_API_KEY!,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch project info');
        }

        const data: ProjectDetails[] = await response.json();
        console.log('Fetched project info:', data);

        const project = data.find(proj => proj.name === projectId);
        if (project) {
          let contractType = project.contractType || "";
          if (contractType.toLowerCase() === "time and materials") {
            contractType = "T&M";
          } else if (contractType.toLowerCase() === "fixed price") {
            contractType = "FFP";
          }

          setProjectDetails({
            name: project.name,
            status: project.status || "",
            contractType,
            periodOfPerformance: project.periodOfPerformance || { startDate: "", endDate: "" },
            budgetHours: parseFloat(project.budgetHours.toString()) || 0,
            description: project.description || "",
            pm: project.pm || "N/A",
          });

          setDescription(project.description);
        } else {
          setProjectDetails({
            name: projectId,
            status: "N/A",
            contractType: "N/A",
            periodOfPerformance: { startDate: "N/A", endDate: "N/A" },
            budgetHours: 0,
            description: "N/A",
            pm: "N/A",
          });

          setDescription("N/A");
        }
      } catch (error) {
        console.error('Error fetching project info:', error);
        setProjectDetails({
          name: projectId,
          status: "N/A",
          contractType: "N/A",
          periodOfPerformance: { startDate: "N/A", endDate: "N/A" },
          budgetHours: 0,
          description: "N/A",
          pm: "N/A",
        });

        setDescription("N/A");
      }
    };

    fetchData();
  }, [projectId, setDescription]);

  const calculateRemainingMonths = (startDate: string, endDate: string) => {
    const today = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (today > end) return 0;
    if (today < start) return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));

    let remainingMonths = (end.getFullYear() - today.getFullYear()) * 12 + end.getMonth() - today.getMonth();
    if (start.getDate() > today.getDate()) remainingMonths--;

    return remainingMonths;
  };

  const calculateAdjustedRemainingMonths = (startDate: string, endDate: string) => {
    const today = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (today > end) return 0;
    if (today < start) return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));

    let remainingMonths = (end.getFullYear() - today.getFullYear()) * 12 + end.getMonth() - today.getMonth();
    if (start.getDate() > today.getDate()) remainingMonths--;

    if (today.getDate() <= 15) {
      return remainingMonths + 1;
    }

    return remainingMonths;
  };

  const budgetHours = projectDetails?.budgetHours ?? 0;
  const hrsRemain = budgetHours !== 0 ? budgetHours - totalHours : 0; // Prevent negative hrsRemain if no budget hours
  const remainingMonths = projectDetails ? calculateAdjustedRemainingMonths(projectDetails.periodOfPerformance.startDate, projectDetails.periodOfPerformance.endDate) : 0;

  let hoursRemainPerMonth = remainingMonths > 0 ? (hrsRemain / remainingMonths) : hrsRemain;
  hoursRemainPerMonth = hoursRemainPerMonth < 0 ? 0 : hoursRemainPerMonth;

  const formatDateString = (dateString: string) => {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? "Date not available" : date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getIconColorClass = (bgColorClass: string) => {
    return bgColorClass === 'bg-blue-500' ? 'text-white' : 'text-blue-500';
  };

  if (!projectDetails) {
    return <div>Loading...</div>;
  }

  const periodOfPerformanceDisplay = projectDetails.periodOfPerformance.startDate && projectDetails.periodOfPerformance.endDate
    ? `${formatDateString(projectDetails.periodOfPerformance.startDate)} - ${formatDateString(projectDetails.periodOfPerformance.endDate)}`
    : "Period of Performance data not available";

  return (
    <div className="w-full">
      <div className="flex justify-between items-center">
        <div className="bg-blue-500 rounded-md p-4 m-auto max-w-full text-center">
          <div className="flex justify-center items-center text-black">
            <div className="mx-2">
              <span><b>Status:</b> {projectDetails.status || "N/A"} </span>
            </div>
            <div className="mx-2">
              <span><b>Contract Type:</b> {projectDetails.contractType || "N/A"} </span>
            </div>
            <div className="mx-2">
              <span><b>POP:</b> {periodOfPerformanceDisplay} </span>
            </div>
            <div className="mx-2">
              <span><b>Budget Hrs:</b> {budgetHours.toFixed(2) || "0"} </span>
            </div>
            <div className="mx-2">
              <span><b>Hrs. Remain:</b> {hrsRemain.toFixed(2) || "0"} </span>
            </div>
            <div className="mx-2">
              <Tippy content="Calculated as the remaining hours divided by the number of months remaining in the project period. The current month is included if today is between the 1st and the 15th of the month; otherwise, it is excluded. If less than a month is remaining or the result is negative, this value shows 0.">
                <span className="flex items-center">
                  <b>Hrs/Month:</b> {hoursRemainPerMonth.toFixed(2) || "0"}
                  <FaInfoCircle className={`ml-2 ${getIconColorClass('bg-blue-500')}`} />
                </span>
              </Tippy>
            </div>
            <div className="mx-2">
              <span><b>PM:</b> {projectDetails.pm || "N/A"} </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectInfo;
