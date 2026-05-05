import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import usePermissions from '../../hooks/usePermissions';
import BackendSetupNotice from '../ui/BackendSetupNotice';
import LoadingScreen from '../ui/LoadingScreen';
import GlassCard from '../ui/GlassCard';

function ProtectedRoute({ children, moduleKey }) {
  const { user, loading, backendIssue } = useAuth();
  const { can } = usePermissions();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (backendIssue) {
    return (
      <BackendSetupNotice
        title={backendIssue.title}
        message={backendIssue.message}
        details={backendIssue.details}
      />
    );
  }

  if (moduleKey && !can(moduleKey)) {
    return (
      <div className="p-4 md:p-8">
        <GlassCard
          title="Ban khong co quyen truy cap"
          subtitle="Sidebar va route da duoc loc theo vai tro. Hay dang nhap bang tai khoan co quyen phu hop de thao tac."
        >
          <p className="text-sm leading-6 text-slate-600">
            Module nay hien da bi an hoac khoa voi vai tro cua ban.
          </p>
        </GlassCard>
      </div>
    );
  }

  return children;
}

export default ProtectedRoute;
