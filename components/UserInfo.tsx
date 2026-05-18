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
      <div className="ui-card mt-4 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-center text-sm text-fg">
            <div>
              <span className="text-fg-subtle">Type</span>
              <div className="font-medium">{userDetails?.employeeType ?? 'N/A'}</div>
            </div>
            <div>
              <span className="text-fg-subtle">Title</span>
              <div className="font-medium">{userDetails?.title ?? 'N/A'}</div>
            </div>
            <div>
              <span className="text-fg-subtle">Supervisor</span>
              <div className="font-medium">{userDetails?.supervisor ?? 'N/A'}</div>
            </div>
            <div className="flex items-center justify-center gap-2">
              <div>
                <span className="text-fg-subtle">Utilization (period)</span>
                <div className="font-medium tabular-nums text-accent">{totalUtilization.toFixed(2)}%</div>
              </div>
              <Tippy
                content="Non-WebFirst hours ÷ total hours for the selected date range."
                placement="top"
                theme="dark"
              >
                <span className="cursor-default text-accent" tabIndex={0} role="button" aria-label="Utilization help">
                  <FaInfoCircle />
                </span>
              </Tippy>
            </div>
        </div>
      </div>
    </div>
  );
};

export default UserInfo;
