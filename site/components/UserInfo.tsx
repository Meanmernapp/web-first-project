
import React, { useEffect, useState } from 'react';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css'; // Required CSS for Tippy
import { FaInfoCircle } from 'react-icons/fa';

interface UserInfoProps {
  username: string;
  totalUtilization: number;
}

interface User {
  username: string;
  employeeType: string;
  firstName: string;
  lastName: string;
  supervisor: string;
  title: string;
}

const UserInfo: React.FC<UserInfoProps> = ({ username, totalUtilization }) => {
  const [userDetails, setUserDetails] = useState<User | null>(null);

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const response = await fetch(`/api/users`, {
          headers: {
            'x-api-key': process.env.NEXT_PUBLIC_API_KEY!,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch user details');
        }

        const users: User[] = await response.json();
        const user = users.find(user => user.username === username);

        if (user) {
          setUserDetails(user);
        } else {
          setUserDetails({
            username: 'N/A',
            employeeType: 'N/A',
            firstName: 'N/A',
            lastName: 'N/A',
            supervisor: 'N/A',
            title: 'N/A',
          });
        }
      } catch (error) {
        console.error('Error fetching user details:', error);
        setUserDetails({
          username: 'N/A',
          employeeType: 'N/A',
          firstName: 'N/A',
          lastName: 'N/A',
          supervisor: 'N/A',
          title: 'N/A',
        });
      }
    };

    fetchUserDetails();
  }, [username]);

  return (
    <div className="w-full">
      <div className="flex justify-between items-center">
        <div className="bg-blue-500 dark:bg-blue-700 rounded-md p-4 m-auto max-w-full text-center">
          <div className="flex justify-center items-center text-black dark:text-white">
            <div className="mx-2">
              <span><b>Type:</b> {userDetails?.employeeType ?? 'N/A'}</span>
            </div>
            <div className="mx-2">
              <span><b>Title:</b> {userDetails?.title ?? 'N/A'}</span>
            </div>
            <div className="mx-2">
              <span><b>Supervisor:</b> {userDetails?.supervisor ?? 'N/A'}</span>
            </div>
            <div className="mx-2 flex items-center">
              <span><b>Utilization over this period:</b> {totalUtilization.toFixed(2)}%</span>
              {/* Tippy Tooltip for Utilization Explanation */}
              <Tippy
                content="Utilization % calculated as Non-WebFirst Hours (all hrs except WebFirst-xxx) / Total Hours worked, for the selected time period"
                placement="top"
                className="z-50"
                theme=""
              >
                {/* Custom Icon Color based on Dark/Light Mode */}
                <span className="ml-2 cursor-pointer text-gray-600 dark:text-blue-300"><FaInfoCircle /></span>
              </Tippy>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserInfo;
