import Header from './Header';
import Sidebar from './Sidebar';

export default function MainLayout({ children }) {
  return (
    <div className="rk-app-shell">
      <Header />
      <div className="rk-main-row">
        <Sidebar />
        <main>{children}</main>
      </div>
    </div>
  );
}
