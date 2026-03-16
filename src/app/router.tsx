import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../store/AuthContext';
import PrivateRoute from '../components/PrivateRoute';
import PublicOnlyRoute from '../components/PublicOnlyRoute';
import MainLayout from '../layouts/MainLayout';

// Pages
import Home from '../pages/Home';
import Access from '../pages/Access';
import Help from '../pages/Help';
import Cookies from '../pages/Cookies';
import Terms from '../pages/Terms';
import Privacy from '../pages/Privacy';
import KeyUsers from '../pages/KeyUsers';
import Transparency from '../pages/Transparency';
import Unauthorized from '../pages/Unauthorized';

// Student
import StudentDashboard from '../pages/StudentDashboard';
import RequestCard from '../pages/RequestCard';


// Driver
import DriverDashboard from '../pages/DriverDashboard';

// Executive
import ExecutiveDashboard from '../pages/ExecutiveDashboard';

// Admin
import AdminDashboard from '../pages/AdminDashboard';

// Shared
import ValidateCard from '../pages/ValidateCard';
import OfflineCard from '../pages/OfflineCard';

export default function AppRouter() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    {/* Access fora do MainLayout (sem navbar/footer) */}
                    <Route element={<PublicOnlyRoute />}>
                        <Route path="/access" element={<Access />} />
                    </Route>

                    {/* Redirects de compatibilidade */}
                    <Route path="/login" element={<Navigate to="/access" replace />} />
                    <Route path="/register" element={<Navigate to="/access?tab=register" replace />} />

                    <Route element={<MainLayout />}>

                        {/* Always public */}
                        <Route path="/home" element={<Home />} />
                        <Route path="/help" element={<Help />} />
                        <Route path="/cookies" element={<Cookies />} />
                        <Route path="/terms" element={<Terms />} />
                        <Route path="/privacy" element={<Privacy />} />
                        <Route path="/key-users" element={<KeyUsers />} />
                        <Route path="/transparency" element={<Transparency />} />
                        <Route path="/unauthorized" element={<Unauthorized />} />
                        <Route path="/validate/:studentId" element={<ValidateCard />} />
                        <Route path="/offline" element={<OfflineCard />} />

                        {/* Student - protected */}
                        <Route element={<PrivateRoute allowedRoles={['student']} />}>
                            <Route path="/student" element={<StudentDashboard />} />
                            <Route path="/student/request" element={<RequestCard />} />

                        </Route>

                        {/* Driver - protected */}
                        <Route element={<PrivateRoute allowedRoles={['driver']} />}>
                            <Route path="/driver" element={<DriverDashboard />} />
                        </Route>

                        {/* Executive - protected */}
                        <Route element={<PrivateRoute allowedRoles={['executive', 'admin']} />}>
                            <Route path="/executive" element={<ExecutiveDashboard />} />
                        </Route>

                        {/* Admin - protected */}
                        <Route element={<PrivateRoute allowedRoles={['admin']} />}>
                            <Route path="/admin" element={<AdminDashboard />} />
                        </Route>

                        {/* Fallback */}
                        <Route path="/" element={<Navigate to="/home" replace />} />
                        <Route path="*" element={<Navigate to="/home" replace />} />
                    </Route>
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}
