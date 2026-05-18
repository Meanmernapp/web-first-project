import { GetServerSideProps } from 'next';
import axios from 'axios';

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || `http://${req.headers.host}`;
    const userRes = await axios.get(`${baseUrl}/api/users`, {
      headers: {
        'x-api-key': process.env.NEXT_PUBLIC_API_KEY!,
      },
    });

    if (userRes.status !== 200) {
      throw new Error('Failed to fetch users');
    }

    const users = userRes.data;

    return {
      redirect: {
        destination: '/dashboard',
        permanent: false,
      },
    };
  } catch (error) {
    console.error('Error fetching users:', error);
    return {
      redirect: {
        destination: '/dashboard',
        permanent: false,
      },
    };
  }
};

const Home = () => {
  // This component will not be displayed because of the redirection
  return <div>Redirecting...</div>;
};

export default Home;
