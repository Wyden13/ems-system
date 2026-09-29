import { useState } from 'react';
import { Alert, AppBar, Box, Button, IconButton, Snackbar, Toolbar, Typography } from '@mui/material';
import MenuIcon from '@mui/icons-material/MenuRounded';
import HubIcon from '@mui/icons-material/HubRounded';
import { TOPBAR_HEIGHT } from './navigation';
import { useAuth } from '../../auth/context';
export default function Topbar({ onToggleSidebar, isMobile = false }: { onToggleSidebar: () => void; isMobile?: boolean }) {
  const { account, signOut } = useAuth(); const [error, setError] = useState(''); const [pending, setPending] = useState(false);
  return <><AppBar position="fixed" elevation={0} sx={{ zIndex: theme => theme.zIndex.drawer + 1 }}><Toolbar sx={{ minHeight: `${TOPBAR_HEIGHT}px !important`, gap: 1 }}>
    <IconButton color="inherit" onClick={onToggleSidebar} aria-label={isMobile ? 'Open navigation' : 'Collapse navigation'}><MenuIcon /></IconButton><HubIcon /><Typography variant="h6">EMS</Typography><Box sx={{ flexGrow: 1 }} />
    <Typography variant="body2" noWrap sx={{ maxWidth: { xs: 130, sm: 300 } }}>{account?.email}</Typography>
    <Button color="inherit" disabled={pending} onClick={async () => { setPending(true); try { await signOut(); } catch (failure) { setError((failure as Error).message); } finally { setPending(false); } }}>Sign out</Button>
  </Toolbar></AppBar><Snackbar open={!!error} onClose={() => setError('')}><Alert severity="error">Sign out failed: {error}. Please retry.</Alert></Snackbar></>;
}
