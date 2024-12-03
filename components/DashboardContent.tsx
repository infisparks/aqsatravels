"use client";

import { useEffect, useState } from 'react';
import { signOut } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';
import { useRouter } from 'next/navigation';
import {
  Bell,
  ChevronDown,
  Briefcase,
  Settings,
  LogOut,
  User,
  DollarSign,
  CreditCard,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart as ReBarChart,
  Bar,
} from 'recharts';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { auth, database } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

/**
 * Interface representing a sell record with all necessary fields.
 */
interface SellRecord {
  id: string;
  productId: string;
  name: string;
  description: string;
  price: number;
  phoneNumber?: string | null;
  soldAt: string;
  paymentMethod: 'cash' | 'online';
}

/**
 * Interface representing the structure of sell data retrieved from Firebase.
 */
interface FirebaseSellData {
  productId: string;
  name: string;
  description: string;
  price: number;
  phoneNumber?: string | null;
  soldAt: string;
  paymentMethod: 'cash' | 'online';
}

/**
 * Interface representing the structure of data used in charts.
 */
interface ChartData {
  month: string;
  Cash: number;
  Online: number;
}

const DashboardContent: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [sells, setSells] = useState<SellRecord[]>([]);
  const [filteredMonth, setFilteredMonth] = useState<string>('All');
  const [filteredYear, setFilteredYear] = useState<string>('All');
  const [filteredDay, setFilteredDay] = useState<string>('All');

  /**
   * Fetches sell data from Firebase Realtime Database and sets it to state.
   */
  useEffect(() => {
    const sellRef = ref(database, 'sell');
    const unsubscribe = onValue(sellRef, (snapshot) => {
      const data = snapshot.val() as Record<string, FirebaseSellData> | null;
      if (data) {
        const sellList: SellRecord[] = Object.entries(data).map(
          ([key, value]: [string, FirebaseSellData]) => ({
            id: key,
            ...value,
          })
        );
        setSells(sellList);
      } else {
        setSells([]);
      }
    });

    return () => unsubscribe();
  }, []);

  /**
   * Handles user logout by signing out and redirecting to the login page.
   */
  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      // Optionally, display an error message to the user
    }
  };

  /**
   * Filters sells based on the selected month, year, and day.
   * @param sells - Array of sell records.
   * @param month - Selected month filter.
   * @param year - Selected year filter.
   * @param day - Selected day filter.
   * @returns Filtered array of sell records.
   */
  const filterSells = (
    sells: SellRecord[],
    month: string,
    year: string,
    day: string
  ): SellRecord[] => {
    return sells.filter((sell) => {
      const soldDate = new Date(sell.soldAt);
      const monthMatch =
        month === 'All' ||
        soldDate.getMonth() === new Date(`${month} 1, 2020`).getMonth();
      const yearMatch =
        year === 'All' || soldDate.getFullYear() === parseInt(year);
      const dayMatch =
        day === 'All' || soldDate.getDate() === parseInt(day);
      return monthMatch && yearMatch && dayMatch;
    });
  };

  const filteredSells = filterSells(sells, filteredMonth, filteredYear, filteredDay);

  /**
   * Determines the sells to display in the "Today" section.
   * If any filter is applied, it shows the filtered sells.
   * Otherwise, it shows today's sells.
   */
  const todaySells = (filteredMonth !== 'All' || filteredYear !== 'All' || filteredDay !== 'All')
    ? filteredSells
    : sells.filter((sell) => {
        const soldDate = new Date(sell.soldAt);
        const today = new Date();
        return (
          soldDate.getDate() === today.getDate() &&
          soldDate.getMonth() === today.getMonth() &&
          soldDate.getFullYear() === today.getFullYear()
        );
      });

  const totalProductsSold = filteredSells.length;
  const totalMoneyCollected = filteredSells.reduce(
    (acc, sell) => acc + sell.price,
    0
  );
  const totalCashSales = filteredSells
    .filter(sell => sell.paymentMethod === 'cash')
    .reduce((acc, sell) => acc + sell.price, 0);
  const totalOnlineSales = filteredSells
    .filter(sell => sell.paymentMethod === 'online')
    .reduce((acc, sell) => acc + sell.price, 0);

  // Calculate Today's Cash Sales
  const todayCashSales = todaySells
    .filter(sell => sell.paymentMethod === 'cash')
    .reduce((acc, sell) => acc + sell.price, 0);

  // Calculate Today's Online Sales
  const todayOnlineSales = todaySells
    .filter(sell => sell.paymentMethod === 'online')
    .reduce((acc, sell) => acc + sell.price, 0);

  const lineChartData: ChartData[] = Array.from({ length: 12 }, (_, index) => {
    const month = new Date(0, index).toLocaleString('default', { month: 'short' });
    const monthlyCashTotal = filteredSells
      .filter((sell) => sell.paymentMethod === 'cash' && new Date(sell.soldAt).getMonth() === index)
      .reduce((acc, sell) => acc + sell.price, 0);
    const monthlyOnlineTotal = filteredSells
      .filter((sell) => sell.paymentMethod === 'online' && new Date(sell.soldAt).getMonth() === index)
      .reduce((acc, sell) => acc + sell.price, 0);
    return { month, Cash: monthlyCashTotal, Online: monthlyOnlineTotal };
  });

  const barChartData: ChartData[] = lineChartData;

  // Generate day options based on selected month and year
  const getDayOptions = (): number[] => {
    if (filteredMonth === 'All' || filteredYear === 'All') {
      return [];
    }
    const monthIndex = new Date(`${filteredMonth} 1, 2020`).getMonth();
    const year = parseInt(filteredYear);
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      {/* Header Section */}
      <header className="bg-white shadow-md">
        <div className="flex items-center justify-between p-4">
          {/* Notifications Button */}
          <Button variant="ghost" size="icon">
            <Bell className="h-6 w-6" />
          </Button>

          {/* User Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/placeholder.svg?height=32&width=32" alt="@user" />
                  <AvatarFallback>
                    {user?.email?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content Section */}
      <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
        <h1 className="text-3xl font-semibold text-gray-800 mb-6">Dashboard</h1>

        {/* Filters */}
        <div className="flex flex-wrap items-center space-x-4 mb-6">
          {/* Filter by Month */}
          <div>
            <Label htmlFor="filterMonth" className="block text-sm font-medium text-gray-700">
              Filter by Month
            </Label>
            <select
              id="filterMonth"
              value={filteredMonth}
              onChange={(e) => {
                setFilteredMonth(e.target.value);
                setFilteredDay('All'); // Reset day filter when month changes
              }}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option>All</option>
              {Array.from({ length: 12 }, (_, i) =>
                new Date(0, i).toLocaleString('default', { month: 'long' })
              ).map((month) => (
                <option key={month}>{month}</option>
              ))}
            </select>
          </div>

          {/* Filter by Year */}
          <div>
            <Label htmlFor="filterYear" className="block text-sm font-medium text-gray-700">
              Filter by Year
            </Label>
            <select
              id="filterYear"
              value={filteredYear}
              onChange={(e) => {
                setFilteredYear(e.target.value);
                setFilteredDay('All'); // Reset day filter when year changes
              }}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option>All</option>
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                <option key={year}>{year}</option>
              ))}
            </select>
          </div>

          {/* Filter by Day */}
          <div>
            <Label htmlFor="filterDay" className="block text-sm font-medium text-gray-700">
              Filter by Day
            </Label>
            <select
              id="filterDay"
              value={filteredDay}
              onChange={(e) => setFilteredDay(e.target.value)}
              disabled={filteredMonth === 'All' || filteredYear === 'All'}
              className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md ${
                filteredMonth === 'All' || filteredYear === 'All'
                  ? 'bg-gray-200 cursor-not-allowed'
                  : ''
              }`}
            >
              <option>All</option>
              {getDayOptions().map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters Button */}
          <div className="flex items-end">
            <Button
              variant="secondary"
              onClick={() => {
                setFilteredMonth('All');
                setFilteredYear('All');
                setFilteredDay('All');
              }}
            >
              Reset Filters
            </Button>
          </div>
        </div>

        {/* Today Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Todays Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard
              title="Total Sells"
              icon={Briefcase}
              value={todaySells.length}
              subvalue={`Rs. ${todaySells.reduce((acc, sell) => acc + sell.price, 0).toFixed(2)}`}
            />
            <StatCard
              title="Cash Sales"
              icon={DollarSign}
              value={`Rs. ${todayCashSales.toFixed(2)}`}
              subvalue={`${todaySells.filter(sell => sell.paymentMethod === 'cash').length} Transactions`}
            />
            <StatCard
              title="Online Sales"
              icon={CreditCard}
              value={`Rs. ${todayOnlineSales.toFixed(2)}`}
              subvalue={`${todaySells.filter(sell => sell.paymentMethod === 'online').length} Transactions`}
            />
          </div>

          {/* Today's Sell List */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Todays Sell List</CardTitle>
            </CardHeader>
            <CardContent className="overflow-y-auto">
              <SellTable sells={todaySells} />
            </CardContent>
          </Card>
        </section>

        {/* Total Section */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Total Overview</h2>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <StatCard
              title="Total Products Sold"
              icon={ChevronDown}
              value={totalProductsSold}
              subvalue={`Rs. ${totalMoneyCollected.toFixed(2)}`}
            />
            <StatCard
              title="Total Cash Sales"
              icon={DollarSign}
              value={`Rs. ${totalCashSales.toFixed(2)}`}
              subvalue={`${filteredSells.filter(sell => sell.paymentMethod === 'cash').length} Transactions`}
            />
            <StatCard
              title="Total Online Sales"
              icon={CreditCard}
              value={`Rs. ${totalOnlineSales.toFixed(2)}`}
              subvalue={`${filteredSells.filter(sell => sell.paymentMethod === 'online').length} Transactions`}
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <ChartCard
              title="Monthly Sales by Payment Method (Rs.)"
              chart={<LineChartComponent data={lineChartData} />}
            />
            <ChartCard
              title="Yearly Sales by Payment Method (Rs.)"
              chart={<BarChartComponent data={barChartData} />}
            />
          </div>

          {/* Total Sell List */}
          <Card className="h-96">
            <CardHeader>
              <CardTitle>Sell List</CardTitle>
            </CardHeader>
            <CardContent className="overflow-y-auto">
              <SellTable sells={filteredSells} />
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
};

/**
 * Props interface for StatCard component.
 */
interface StatCardProps {
  title: string;
  icon: React.ElementType;
  value: string | number;
  subvalue: string;
}

/**
 * Component representing a statistical card.
 */
const StatCard: React.FC<StatCardProps> = ({ title, icon: Icon, value, subvalue }) => (
  <Card className="shadow-lg">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
      <Icon className="h-6 w-6 text-indigo-500" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-gray-800">{value}</div>
      <p className="text-sm text-gray-500">{subvalue}</p>
    </CardContent>
  </Card>
);

/**
 * Props interface for ChartCard component.
 */
interface ChartCardProps {
  title: string;
  chart: React.ReactNode;
}

/**
 * Component representing a chart card.
 */
const ChartCard: React.FC<ChartCardProps> = ({ title, chart }) => (
  <Card className="shadow-lg">
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="h-[300px]">
        {chart}
      </div>
    </CardContent>
  </Card>
);

/**
 * Props interface for LineChartComponent.
 */
interface LineChartComponentProps {
  data: ChartData[];
}

/**
 * Component rendering a line chart.
 */
const LineChartComponent: React.FC<LineChartComponentProps> = ({ data }) => (
  <ResponsiveContainer width="100%" height="100%">
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="month" />
      <YAxis />
      <Tooltip formatter={(value: number) => `Rs. ${value.toFixed(2)}`} />
      <Legend />
      <Line type="monotone" dataKey="Cash" stroke="#0a1963" strokeWidth={2} />
      <Line type="monotone" dataKey="Online" stroke="#f59e0b" strokeWidth={2} />
    </LineChart>
  </ResponsiveContainer>
);

/**
 * Props interface for BarChartComponent.
 */
interface BarChartComponentProps {
  data: ChartData[];
}

/**
 * Component rendering a bar chart.
 */
const BarChartComponent: React.FC<BarChartComponentProps> = ({ data }) => (
  <ResponsiveContainer width="100%" height="100%">
    <ReBarChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="month" />
      <YAxis />
      <Tooltip formatter={(value: number) => `Rs. ${value.toFixed(2)}`} />
      <Legend />
      <Bar dataKey="Cash" fill="#0a1963" />
      <Bar dataKey="Online" fill="#f59e0b" />
    </ReBarChart>
  </ResponsiveContainer>
);

/**
 * Props interface for SellTable component.
 */
interface SellTableProps {
  sells: SellRecord[];
}

/**
 * Component representing the sell records table.
 */
const SellTable: React.FC<SellTableProps> = ({ sells }) => (
  <>
    {sells.length > 0 ? (
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead>
            <tr>
              <th className="py-2 px-4 border-b text-left text-sm font-medium text-gray-700">Product Name</th>
              <th className="py-2 px-4 border-b text-left text-sm font-medium text-gray-700">Price (Rs.)</th>
              <th className="py-2 px-4 border-b text-left text-sm font-medium text-gray-700">Payment Method</th>
              <th className="py-2 px-4 border-b text-left text-sm font-medium text-gray-700">Phone Number</th>
              <th className="py-2 px-4 border-b text-left text-sm font-medium text-gray-700">Sold At</th>
            </tr>
          </thead>
          <tbody>
            {sells.map((sell) => (
              <tr key={sell.id} className="hover:bg-gray-50">
                <td className="py-2 px-4 border-b text-sm text-gray-600">{sell.name}</td>
                <td className="py-2 px-4 border-b text-sm text-gray-600">{sell.price.toFixed(2)}</td>
                <td className="py-2 px-4 border-b text-sm text-gray-600 capitalize">{sell.paymentMethod}</td>
                <td className="py-2 px-4 border-b text-sm text-gray-600">{sell.phoneNumber || 'N/A'}</td>
                <td className="py-2 px-4 border-b text-sm text-gray-600">
                  {new Date(sell.soldAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <p className="text-sm text-gray-500">No products sold in this period.</p>
    )}
    <div className="mt-4">
      <p className="text-sm font-medium">
        Total Cost: Rs. {sells.reduce((acc, sell) => acc + sell.price, 0).toFixed(2)}
      </p>
    </div>
  </>
);

export default DashboardContent;
