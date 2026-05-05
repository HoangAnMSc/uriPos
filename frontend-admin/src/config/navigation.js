import {
  LayoutDashboard,
  BarChart3,
  ScanLine,
  Users2,
  UserRound,
  PackageSearch,
  TicketPercent
} from 'lucide-react';

export const navigationItems = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    moduleKey: 'dashboard',
    icon: LayoutDashboard,
    description: 'Tong quan doanh thu'
  },
  {
    label: 'Thong ke',
    path: '/analytics',
    moduleKey: 'analytics',
    icon: BarChart3,
    description: 'Doanh thu va xu huong'
  },
  {
    label: 'POS',
    path: '/pos',
    moduleKey: 'pos',
    icon: ScanLine,
    description: 'Ban hang tai quay'
  },
  {
    label: 'Nguoi dung',
    path: '/users',
    moduleKey: 'users',
    icon: Users2,
    description: 'Vai tro va tai khoan'
  },
  {
    label: 'Khach hang',
    path: '/customers',
    moduleKey: 'customers',
    icon: UserRound,
    description: 'Lich su mua va cham soc'
  },
  {
    label: 'San pham',
    path: '/products',
    moduleKey: 'products',
    icon: PackageSearch,
    description: 'Ton kho va gia ban'
  },
  {
    label: 'Ma giam gia',
    path: '/coupons',
    moduleKey: 'coupons',
    icon: TicketPercent,
    description: 'Voucher va khuyen mai'
  }
];
