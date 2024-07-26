import React, { useEffect, useState } from 'react';

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
        <div className="bg-blue-500 rounded-md p-4 m-auto max-w-full text-center">
          <div className="flex justify-center items-center text-black">
            <div className="mx-2">
              <span><b>Type:</b> {userDetails?.employeeType ?? 'N/A'}</span>
            </div>
            <div className="mx-2">
              <span><b>Title:</b> {userDetails?.title ?? 'N/A'}</span>
            </div>
            <div className="mx-2">
              <span><b>Supervisor:</b> {userDetails?.supervisor ?? 'N/A'}</span>
            </div>
            <div className="mx-2">
              <span><b>Utilization over this period:</b> {totalUtilization.toFixed(2)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserInfo;
