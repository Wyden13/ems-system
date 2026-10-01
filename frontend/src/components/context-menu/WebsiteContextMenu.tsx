import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import RefreshRounded from '@mui/icons-material/RefreshRounded';
import DashboardRounded from '@mui/icons-material/DashboardRounded';
import PersonOutlineRounded from '@mui/icons-material/PersonOutlineRounded';
import ContextMenuProvider from './ContextMenuProvider';
import ObjectControlsProvider from './ObjectControlsProvider';
import { useAuth } from '../../auth/context';

export default function WebsiteContextMenu({ children }: { children: ReactNode }) {
  const cache = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const { account } = useAuth();
  return <ObjectControlsProvider key={`${account?.id}:${account?.role}`} routeKey={`${location.pathname}${location.search}`}>
    <ContextMenuProvider key={`${location.pathname}${location.search}`} actions={[
    { label: 'Refresh data', icon: <RefreshRounded fontSize="small" />, onSelect: () => { void cache.invalidateQueries(); } },
    { label: 'Go to dashboard', icon: <DashboardRounded fontSize="small" />, onSelect: () => navigate('/dashboard') },
    { label: 'My profile', icon: <PersonOutlineRounded fontSize="small" />, onSelect: () => navigate('/profile') },
  ]}>{children}</ContextMenuProvider></ObjectControlsProvider>;
}
