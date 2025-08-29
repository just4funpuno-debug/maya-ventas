import React, { Suspense, lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import Layout from './Layout.jsx';
import AuthPage from '../features/auth/AuthPage.jsx';

const DashboardPage = lazy(()=> import('../features/dashboard/DashboardPage.jsx'));
const SalesPage = lazy(()=> import('../features/sales/SalesPage.jsx'));
const ProductsPage = lazy(()=> import('../features/products/ProductsPage.jsx'));
const CommissionsPage = lazy(()=> import('../features/commissions/CommissionsPage.jsx'));

const withSuspense = (el)=> (
  <Suspense fallback={<div className="p-6 text-sm text-neutral-400">Cargando...</div>}>
    {el}
  </Suspense>
);

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/auth', element: <AuthPage /> },
      { path: '/', element: withSuspense(<DashboardPage />) },
      { path: '/ventas', element: withSuspense(<SalesPage />) },
      { path: '/productos', element: withSuspense(<ProductsPage />) },
      { path: '/comisiones', element: withSuspense(<CommissionsPage />) }
    ]
  }
]);
export default router;