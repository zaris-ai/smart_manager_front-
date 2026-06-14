import { GetServerSideProps } from 'next';
import { getSession } from 'next-auth/react';

const HomePage = () => {
  return null;
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context);

  return {
    redirect: {
      destination: session ? '/dashboard' : '/auth/login',
      permanent: false,
    },
  };
};

export default HomePage;