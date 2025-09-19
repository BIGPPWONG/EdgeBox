import React from 'react';
import { createHashRouter, RouterProvider } from 'react-router-dom';
import { App } from './App';
import { VNCPage } from './VNCPage';

// 创建基于Hash的路由器
const router = createHashRouter([
  {
    path: '/',
    element: <App />,
  },
  {
    path: '/vnc/:containerName',
    element: <VNCPage />,
  },
]);

export const AppRouter: React.FC = () => {
  return <RouterProvider router={router} />;
};