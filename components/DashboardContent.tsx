"use client";

import { useEffect, useState, useMemo} from 'react';
import { signOut } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';
import { useRouter } from 'next/navigation';
import {
  Bell,
 
  Settings,
  LogOut,
  User,
  DollarSign,
  CreditCard,
  ShoppingBag,
  Tag,
 
  Filter,
  ArrowUp,
  ArrowDown,
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
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

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
  unitPrice: number;
  quantity: number;
  totalPriceCalculated: number;
  finalPriceCharged: number;
  discount: number;
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
  unitPrice: number;
  quantity: number;
  totalPriceCalculated: number;
  finalPriceCharged: number;
  discount: number;
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

/**
 * Interface for aggregated product sales report.
 */
interface ProductReportItem {
    name: string;
    totalQuantity: number;
    totalAmount: number;
    totalDiscount: number;
}


const MONTHS = Array.from({ length: 12 }, (_, i) =>
  new Date(0, i).toLocaleString('default', { month: 'long' })
);

const DashboardContent: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [sells, setSells] = useState<SellRecord[]>([]);
  
  // Filtering States
  const [filteredMonth, setFilteredMonth] = useState<string>('All');
  const [filteredYear, setFilteredYear] = useState<string>('All');
  const [filteredDay, setFilteredDay] = useState<string>('All');
  const [filteredWeek, setFilteredWeek] = useState<string>('All');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  /**
   * Fetches sell data from Firebase Realtime Database.
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
            // Ensure numeric fields are correctly parsed
            unitPrice: Number(value.unitPrice || 0),
            quantity: Number(value.quantity || 0),
            totalPriceCalculated: Number(value.totalPriceCalculated || 0),
            finalPriceCharged: Number(value.finalPriceCharged || 0),
            discount: Number(value.discount || 0),
          })
        );
        setSells(sellList);
      } else {
        setSells([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  /**
   * Central filtering logic based on all selected criteria.
   */
  const filteredSells = useMemo(() => {
    return sells.filter((sell) => {
      const soldDate = new Date(sell.soldAt);
      let matches = true;

      // 1. Custom Date Range Filter
      if (startDate && endDate) {
        const start = new Date(startDate.setHours(0, 0, 0, 0));
        const end = new Date(endDate.setHours(23, 59, 59, 999));
        matches = soldDate >= start && soldDate <= end;
        if (!matches) return false;
      }
      
      // 2. Year Filter
      if (filteredYear !== 'All') {
        matches = soldDate.getFullYear() === parseInt(filteredYear);
        if (!matches) return false;
      }

      // 3. Month Filter
      if (filteredMonth !== 'All') {
        const monthIndex = MONTHS.indexOf(filteredMonth);
        matches = soldDate.getMonth() === monthIndex;
        if (!matches) return false;
      }

      // 4. Day Filter
      if (filteredDay !== 'All') {
        matches = soldDate.getDate() === parseInt(filteredDay);
        if (!matches) return false;
      }
      
      // 5. Week Filter
      if (filteredWeek !== 'All') {
        const today = new Date();
        const getStartOfWeek = (d: Date) => {
          const date = new Date(d);
          const day = date.getDay();
          const diff = date.getDate() - day; // adjust to Sunday
          date.setDate(diff);
          date.setHours(0, 0, 0, 0);
          return date;
        };

        const startOfWeek = getStartOfWeek(today);

        if (filteredWeek === 'This Week') {
          // soldDate >= start of this week
          matches = soldDate >= startOfWeek;
        } else if (filteredWeek === 'Last Week') {
          // start of last week <= soldDate <= end of last week
          const startOfLastWeek = new Date(startOfWeek.setDate(startOfWeek.getDate() - 7));
          const endOfLastWeek = new Date(startOfLastWeek);
          endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
          endOfLastWeek.setHours(23, 59, 59, 999);
          
          matches = soldDate >= startOfLastWeek && soldDate <= endOfLastWeek;
        }
        if (!matches) return false;
      }

      return matches;
    });
  }, [sells, filteredMonth, filteredYear, filteredDay, filteredWeek, startDate, endDate]);


  // Logic to show TODAY's sells by default when no filters are active
  const isFilterActive = filteredMonth !== 'All' || filteredYear !== 'All' || filteredDay !== 'All' || filteredWeek !== 'All' || startDate || endDate;
  
  const currentViewSells = useMemo(() => {
    if (isFilterActive) {
      return filteredSells;
    }
    // Default to Today's sales
    const today = new Date();
    return sells.filter((sell) => {
      const soldDate = new Date(sell.soldAt);
      return (
        soldDate.getDate() === today.getDate() &&
        soldDate.getMonth() === today.getMonth() &&
        soldDate.getFullYear() === today.getFullYear()
      );
    });
  }, [sells, filteredSells, isFilterActive]);

  // --- Statistics Calculations ---
  const getSellStats = (data: SellRecord[]) => {
    const totalQuantitySold = data.reduce((acc, sell) => acc + sell.quantity, 0);
    const totalMoneyCollected = data.reduce((acc, sell) => acc + sell.finalPriceCharged, 0);
    const totalDiscountGiven = data.reduce((acc, sell) => acc + sell.discount, 0);
    
    const cashSales = data.filter(sell => sell.paymentMethod === 'cash');
    const onlineSales = data.filter(sell => sell.paymentMethod === 'online');
    
    const totalCashSales = cashSales.reduce((acc, sell) => acc + sell.finalPriceCharged, 0);
    const totalOnlineSales = onlineSales.reduce((acc, sell) => acc + sell.finalPriceCharged, 0);
    
    return {
      totalQuantitySold,
      totalMoneyCollected,
      totalDiscountGiven,
      totalCashSales,
      totalOnlineSales,
      cashTransactions: cashSales.length,
      onlineTransactions: onlineSales.length,
    };
  };

  const currentViewStats = getSellStats(currentViewSells);

  // --- Chart Data ---
  const chartData: ChartData[] = useMemo(() => {
    return MONTHS.map((monthName, index) => {
      const monthlyData = filteredSells.filter(sell => new Date(sell.soldAt).getMonth() === index);
      const monthlyCashTotal = monthlyData
        .filter((sell) => sell.paymentMethod === 'cash')
        .reduce((acc, sell) => acc + sell.finalPriceCharged, 0);
      const monthlyOnlineTotal = monthlyData
        .filter((sell) => sell.paymentMethod === 'online')
        .reduce((acc, sell) => acc + sell.finalPriceCharged, 0);
      return { month: monthName.slice(0, 3), Cash: monthlyCashTotal, Online: monthlyOnlineTotal };
    });
  }, [filteredSells]);

  // --- Aggregated Product Reporting (Full List) ---
  const aggregatedProductSales: ProductReportItem[] = useMemo(() => {
    const productMap = filteredSells.reduce((acc, sell) => {
      acc[sell.name] = {
        name: sell.name,
        totalQuantity: (acc[sell.name]?.totalQuantity || 0) + sell.quantity,
        totalAmount: (acc[sell.name]?.totalAmount || 0) + sell.finalPriceCharged,
        totalDiscount: (acc[sell.name]?.totalDiscount || 0) + sell.discount,
      };
      return acc;
    }, {} as Record<string, ProductReportItem>);

    return Object.values(productMap);
  }, [filteredSells]);

  // --- Helper Functions ---

  const getDayOptions = (): number[] => {
    if (filteredMonth === 'All' || filteredYear === 'All') {
      return [];
    }
    const monthIndex = MONTHS.indexOf(filteredMonth);
    const year = parseInt(filteredYear);
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  };
  
  const handleFilterReset = () => {
    setFilteredMonth('All');
    setFilteredYear('All');
    setFilteredDay('All');
    setFilteredWeek('All');
    setStartDate(null);
    setEndDate(null);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      {/* Header Section (No Change) */}
      <header className="bg-white shadow-md">
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" size="icon"><Bell className="h-6 w-6" /></Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/placeholder.svg?height=32&width=32" alt="@user" />
                  <AvatarFallback>{user?.email?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuItem><User className="mr-2 h-4 w-4" /><span>Profile</span></DropdownMenuItem>
              <DropdownMenuItem><Settings className="mr-2 h-4 w-4" /><span>Settings</span></DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}><LogOut className="mr-2 h-4 w-4" /><span>Log out</span></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content Section */}
      <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
        <h1 className="text-3xl font-semibold text-gray-800 mb-6">Dashboard</h1>

        {/* Filters */}
        <Card className="mb-6 p-4 shadow-lg">
            <h3 className="text-xl font-semibold mb-3 flex items-center"><Filter className="w-5 h-5 mr-2" />Sales Filters</h3>
            <div className="flex flex-wrap items-end gap-4">
                {/* Filter by Month */}
                <div>
                    <Label htmlFor="filterMonth">Month</Label>
                    <select id="filterMonth" value={filteredMonth} onChange={(e) => {setFilteredMonth(e.target.value); setFilteredDay('All'); setFilteredWeek('All'); setStartDate(null); setEndDate(null);}} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md">
                        <option>All</option>
                        {MONTHS.map((month) => (<option key={month}>{month}</option>))}
                    </select>
                </div>
                
                {/* Filter by Year */}
                <div>
                    <Label htmlFor="filterYear">Year</Label>
                    <select id="filterYear" value={filteredYear} onChange={(e) => {setFilteredYear(e.target.value); setFilteredDay('All'); setFilteredWeek('All'); setStartDate(null); setEndDate(null);}} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md">
                        <option>All</option>
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (<option key={year}>{year}</option>))}
                    </select>
                </div>

                {/* Filter by Day */}
                <div>
                    <Label htmlFor="filterDay">Day</Label>
                    <select id="filterDay" value={filteredDay} onChange={(e) => {setFilteredDay(e.target.value); setFilteredWeek('All'); setStartDate(null); setEndDate(null);}} disabled={filteredMonth === 'All' || filteredYear === 'All'} className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md ${filteredMonth === 'All' || filteredYear === 'All' ? 'bg-gray-200 cursor-not-allowed' : ''}`}>
                        <option>All</option>
                        {getDayOptions().map((day) => (<option key={day} value={day}>{day}</option>))}
                    </select>
                </div>
                
                {/* Filter by Week */}
                <div>
                    <Label htmlFor="filterWeek">Week</Label>
                    <select id="filterWeek" value={filteredWeek} onChange={(e) => {setFilteredWeek(e.target.value); setFilteredMonth('All'); setFilteredYear('All'); setFilteredDay('All'); setStartDate(null); setEndDate(null);}} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md">
                        <option>All</option>
                        <option>This Week</option>
                        <option>Last Week</option>
                    </select>
                </div>
                
                {/* Custom Date Range */}
                <div className="flex space-x-2 items-end">
                    <div>
                        <Label htmlFor="startDate">Start Date</Label>
                        <DatePicker
                            id="startDate"
                            selected={startDate}
                            onChange={(date: Date | null) => {
                                setStartDate(date);
                                setFilteredMonth('All');
                                setFilteredYear('All');
                                setFilteredDay('All');
                                setFilteredWeek('All');
                                // If endDate is before new startDate, reset endDate
                                if (endDate && date && endDate < date) {
                                    setEndDate(null);
                                }
                            }}
                            selectsStart
                            endDate={endDate}
                            maxDate={endDate || new Date()}
                            placeholderText="Start Date"
                            className="mt-1 block w-full pl-3 pr-3 py-2 text-base border-gray-300 rounded-md shadow-sm"
                        />
                    </div>
                    <div>
                        <Label htmlFor="endDate">End Date</Label>
                        <DatePicker
                            id="endDate"
                            selected={endDate ?? undefined}
                            onChange={(
                                date: Date | null
                            ) => {
                                setEndDate(date);
                                setFilteredMonth('All');
                                setFilteredYear('All');
                                setFilteredDay('All');
                                setFilteredWeek('All');
                            }}
                            selectsEnd
                            startDate={startDate ?? undefined}
                            minDate={startDate ?? undefined}
                            maxDate={new Date()}
                            placeholderText="End Date"
                            className="mt-1 block w-full pl-3 pr-3 py-2 text-base border-gray-300 rounded-md shadow-sm"
                        />
                    </div>
                </div>

                {/* Reset Filters Button */}
                <Button variant="secondary" onClick={handleFilterReset}>Reset Filters</Button>
            </div>
        </Card>

        {/* Current View Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">
            {isFilterActive ? 'Filtered Overview' : "Today's Overview (Default)"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Quantity Sold"
              icon={ShoppingBag}
              value={currentViewStats.totalQuantitySold}
              subvalue={`Rs. ${currentViewStats.totalMoneyCollected.toFixed(2)} Collected`}
            />
            <StatCard
              title="Total Discount Given"
              icon={Tag}
              value={`Rs. ${currentViewStats.totalDiscountGiven.toFixed(2)}`}
              subvalue={`On ${currentViewSells.length} Transactions`}
            />
            <StatCard
              title="Cash Sales"
              icon={DollarSign}
              value={`Rs. ${currentViewStats.totalCashSales.toFixed(2)}`}
              subvalue={`${currentViewStats.cashTransactions} Transactions`}
            />
            <StatCard
              title="Online Sales"
              icon={CreditCard}
              value={`Rs. ${currentViewStats.totalOnlineSales.toFixed(2)}`}
              subvalue={`${currentViewStats.onlineTransactions} Transactions`}
            />
          </div>

          {/* Current View Sell List */}
          <Card className="mt-6">
            <CardHeader><CardTitle>{isFilterActive ? 'Filtered Sales List' : "Today's Sales List"}</CardTitle></CardHeader>
            <CardContent className="overflow-y-auto">
              <SellTable sells={currentViewSells} />
            </CardContent>
          </Card>
        </section>

        {/* Reports Section */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Sales Reports & Analytics {isFilterActive ? `(Filtered: ${filteredSells.length} Sales)` : ''}</h2>

          {/* Aggregated Product Sales Reports (Full List) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <ReportTable
                title="Products Sold - Sorted by Quantity"
                data={aggregatedProductSales}
                initialSortKey="totalQuantity"
                Icon={ShoppingBag}
            />
            <ReportTable
                title="Products Sold - Sorted by Amount"
                data={aggregatedProductSales}
                initialSortKey="totalAmount"
                Icon={DollarSign}
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <ChartCard
              title="Monthly Sales by Payment Method (Rs.)"
              chart={<LineChartComponent data={chartData} />}
            />
            <ChartCard
              title="Monthly Sales Distribution (Rs.)"
              chart={<BarChartComponent data={chartData} />}
            />
          </div>
        </section>
      </main>
    </div>
  );
};

// --- Component Definitions ---

// ... StatCard, ChartCard, LineChartComponent, BarChartComponent (No significant changes needed) ...

/**
 * Component representing the sell records table (SellTable).
 */
interface SellTableProps {
  sells: SellRecord[];
}

const SellTable: React.FC<SellTableProps> = ({ sells }) => (
  <>
    {sells.length > 0 ? (
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead>
            <tr>
              <th className="py-2 px-4 border-b text-left text-sm font-medium text-gray-700">Product Name</th>
              <th className="py-2 px-4 border-b text-left text-sm font-medium text-gray-700">Qty</th>
              <th className="py-2 px-4 border-b text-left text-sm font-medium text-gray-700">Unit Price</th>
              <th className="py-2 px-4 border-b text-left text-sm font-medium text-gray-700">Discount (Rs.)</th>
              <th className="py-2 px-4 border-b text-left text-sm font-medium text-gray-700">Final Price (Rs.)</th>
              <th className="py-2 px-4 border-b text-left text-sm font-medium text-gray-700">Method</th>
              <th className="py-2 px-4 border-b text-left text-sm font-medium text-gray-700">Sold At</th>
            </tr>
          </thead>
          <tbody>
            {sells.map((sell) => (
              <tr key={sell.id} className="hover:bg-gray-50">
                <td className="py-2 px-4 border-b text-sm text-gray-600">{sell.name}</td>
                <td className="py-2 px-4 border-b text-sm text-gray-600">{sell.quantity}</td>
                <td className="py-2 px-4 border-b text-sm text-gray-600">{sell.unitPrice.toFixed(2)}</td>
                <td className="py-2 px-4 border-b text-sm text-red-600">{sell.discount.toFixed(2)}</td>
                <td className="py-2 px-4 border-b text-sm font-semibold text-green-700">{sell.finalPriceCharged.toFixed(2)}</td>
                <td className="py-2 px-4 border-b text-sm text-gray-600 capitalize">{sell.paymentMethod}</td>
                <td className="py-2 px-4 border-b text-sm text-gray-600">
                  {new Date(sell.soldAt).toLocaleDateString()} {new Date(sell.soldAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <p className="text-sm text-gray-500">No sales records found for this period.</p>
    )}
    <div className="mt-4 border-t pt-2">
      <p className="text-sm font-medium">
        Total Sales Amount: <span className="text-lg font-bold text-indigo-600">Rs. {sells.reduce((acc, sell) => acc + sell.finalPriceCharged, 0).toFixed(2)}</span>
      </p>
    </div>
  </>
);

/**
 * Component representing the aggregated product sales table (ReportTable).
 */
interface ReportTableProps {
    title: string;
    data: ProductReportItem[];
    initialSortKey: keyof ProductReportItem;
    Icon: React.ElementType;
}

const ReportTable: React.FC<ReportTableProps> = ({ title, data, initialSortKey, Icon }) => {
    const [sortConfig, setSortConfig] = useState<{ key: keyof ProductReportItem; direction: 'ascending' | 'descending' }>({
        key: initialSortKey,
        direction: 'descending', // Default to highest sales on top
    });

    const sortedData = useMemo(() => {
        const sortableItems = [...data];
        if (sortConfig.key) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                
                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [data, sortConfig]);

    const requestSort = (key: keyof ProductReportItem) => {
        let direction: 'ascending' | 'descending' = 'descending';
        if (
            sortConfig.key === key &&
            sortConfig.direction === 'descending'
        ) {
            direction = 'ascending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: keyof ProductReportItem) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'ascending' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />;
    };

    return (
        <Card className="shadow-lg h-96">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{title}</CardTitle>
                <Icon className="h-6 w-6 text-green-500" />
            </CardHeader>
            <CardContent className="h-[calc(100%-7rem)] overflow-y-auto">
                {data.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white text-sm">
                            <thead>
                                <tr>
                                    <th className="py-2 px-4 border-b text-left text-gray-700">Product Name</th>
                                    <th className="py-2 px-4 border-b text-right text-gray-700 cursor-pointer" onClick={() => requestSort('totalQuantity')}>
                                        <div className="flex items-center justify-end">Quantity{getSortIndicator('totalQuantity')}</div>
                                    </th>
                                    <th className="py-2 px-4 border-b text-right text-gray-700 cursor-pointer" onClick={() => requestSort('totalAmount')}>
                                        <div className="flex items-center justify-end">Amount (Rs.){getSortIndicator('totalAmount')}</div>
                                    </th>
                                    <th className="py-2 px-4 border-b text-right text-gray-700 cursor-pointer" onClick={() => requestSort('totalDiscount')}>
                                        <div className="flex items-center justify-end">Discount (Rs.){getSortIndicator('totalDiscount')}</div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedData.map((item, index) => (
                                    <tr key={item.name} className="hover:bg-gray-50">
                                        <td className="py-2 px-4 border-b text-left font-medium text-gray-600">{index + 1}. {item.name}</td>
                                        <td className="py-2 px-4 border-b text-right">{item.totalQuantity}</td>
                                        <td className="py-2 px-4 border-b text-right font-semibold text-indigo-700">₹{item.totalAmount.toFixed(2)}</td>
                                        <td className="py-2 px-4 border-b text-right text-red-600">₹{item.totalDiscount.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-sm text-gray-500">No aggregated sales data available for the current filter.</p>
                )}
            </CardContent>
        </Card>
    );
};

// ... Rest of the components (StatCard, ChartCard, LineChartComponent, BarChartComponent) ...

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
    <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
    <CardContent><div className="h-[300px]">{chart}</div></CardContent>
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
      <Line type="monotone" dataKey="Cash" stroke="#0a1963" strokeWidth={2} name="Cash Sales (Final Price)" />
      <Line type="monotone" dataKey="Online" stroke="#f59e0b" strokeWidth={2} name="Online Sales (Final Price)" />
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
      <Bar dataKey="Cash" fill="#0a1963" name="Cash Sales (Final Price)" />
      <Bar dataKey="Online" fill="#f59e0b" name="Online Sales (Final Price)" />
    </ReBarChart>
  </ResponsiveContainer>
);

export default DashboardContent;