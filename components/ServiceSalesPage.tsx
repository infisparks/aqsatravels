"use client";

import type React from "react";
import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ref, onValue } from "firebase/database";
import { database } from "@/lib/firebase";
import { parseISO, isToday, isSameDay, isSameMonth, isSameYear } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Tag, DollarSign, ShoppingBag } from "lucide-react";

/**
 * Interface representing a sell record with the complete structure.
 */
interface SellData {
  id: string;
  productId: string;
  name: string;
  paymentMethod: string;
  unitPrice: number; // New field
  quantity: number; // New field
  totalPriceCalculated: number; // New field
  finalPriceCharged: number; // New field (Used for total sales aggregation)
  discount: number; // New field
  soldAt: string;
}

/**
 * Interface for aggregated product sales quantities.
 */
interface ProductQuantity {
  name: string;
  quantity: number;
}

const ServiceSalesPage: React.FC = () => {
  const [sellData, setSellData] = useState<SellData[]>([]);
  const [filter, setFilter] = useState<"today" | "month" | "year" | "day" | "all">("today");
  const [selectedDateInput, setSelectedDateInput] = useState<string>(""); // For day filter (YYYY-MM-DD)
  const [selectedMonthInput, setSelectedMonthInput] = useState<string>(""); // For month filter (YYYY-MM)
  const [selectedYearInput, setSelectedYearInput] = useState<string>(""); // For year filter (YYYY)

  // --- Data Fetching ---
  useEffect(() => {
    const sellRef = ref(database, "sell");
    const unsubscribe = onValue(sellRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const sellList: SellData[] = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
          // Ensure numeric fields are correctly parsed from Firebase
          unitPrice: Number(data[key].unitPrice || 0),
          quantity: Number(data[key].quantity || 0),
          totalPriceCalculated: Number(data[key].totalPriceCalculated || 0),
          finalPriceCharged: Number(data[key].finalPriceCharged || 0),
          discount: Number(data[key].discount || 0),
        }));
        setSellData(sellList);
      } else {
        setSellData([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // --- Filtering and Aggregation ---
  const filteredSales = useMemo(() => {
    let sales: SellData[] = [];
    let defaultToToday = false;

    if (filter === "today") {
      sales = sellData.filter((sale) => isToday(parseISO(sale.soldAt)));
    } else if (filter === "month" && selectedMonthInput) {
      const monthDate = parseISO(`${selectedMonthInput}-01`);
      sales = sellData.filter((sale) => isSameMonth(parseISO(sale.soldAt), monthDate));
    } else if (filter === "year" && selectedYearInput) {
      const yearDate = new Date(Number.parseInt(selectedYearInput), 0, 1);
      sales = sellData.filter((sale) => isSameYear(parseISO(sale.soldAt), yearDate));
    } else if (filter === "day" && selectedDateInput) {
      const dayDate = parseISO(selectedDateInput);
      sales = sellData.filter((sale) => isSameDay(parseISO(sale.soldAt), dayDate));
    } else if (filter === "all") {
      sales = sellData;
    } else {
      // Handle cases where a specific filter is selected but input is missing
      defaultToToday = true;
      sales = sellData.filter((sale) => isToday(parseISO(sale.soldAt)));
    }
    
    // If the filter is 'day', 'month', or 'year' but the input is cleared,
    // we should return an empty array, unless we default to 'today'.
    if (!defaultToToday && (
        (filter === 'day' && !selectedDateInput) || 
        (filter === 'month' && !selectedMonthInput) || 
        (filter === 'year' && !selectedYearInput)
    )) {
        return [];
    }

    return sales;
  }, [sellData, filter, selectedDateInput, selectedMonthInput, selectedYearInput]);

  const productQuantities = useMemo(() => {
    const productCount: { [key: string]: { name: string; quantity: number } } = {};
    
    filteredSales.forEach((sale) => {
      // Use the 'quantity' field from the updated data structure
      const qty = sale.quantity || 1; 

      if (productCount[sale.productId]) {
        productCount[sale.productId].quantity += qty;
      } else {
        productCount[sale.productId] = { name: sale.name, quantity: qty };
      }
    });

    // Sort by quantity descending (most sold on top)
    return Object.values(productCount).sort((a, b) => b.quantity - a.quantity);
  }, [filteredSales]);

  // Calculate total sales and total discount based on filtered data
  const totalSales = filteredSales.reduce((total, sale) => total + sale.finalPriceCharged, 0);
  const totalDiscount = filteredSales.reduce((total, sale) => total + sale.discount, 0);

  const handleFilterChange = (newFilter: "today" | "month" | "year" | "day" | "all") => {
    setFilter(newFilter);
    // Reset specific date inputs when changing main filter type
    setSelectedDateInput("");
    setSelectedMonthInput("");
    setSelectedYearInput("");
  };

  const getFilterTitle = () => {
    if (filter === "today") return "Today's Sales";
    if (filter === "all") return "All Sales";
    if (filter === "day" && selectedDateInput) return `Sales for ${selectedDateInput}`;
    if (filter === "month" && selectedMonthInput) return `Sales for ${selectedMonthInput}`;
    if (filter === "year" && selectedYearInput) return `Sales for ${selectedYearInput}`;
    return "Sales Overview";
  }

  return (
    <div className="flex flex-col h-screen overflow-y-auto bg-gray-50">
      <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-extrabold mb-6 text-center text-[#0a1963]">Service Sales Dashboard</h1>
        
        {/* --- Sales Overview Card --- */}
        <Card className="mb-8 shadow-xl">
          <CardHeader className="bg-[#0a1963] text-white">
            <CardTitle className="text-2xl">Filter & Summary</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            
            {/* Filter Buttons & Inputs */}
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <Button
                onClick={() => handleFilterChange("today")}
                variant={filter === "today" ? "default" : "outline"}
                className={filter === "today" ? "bg-[#0a1963] hover:bg-[#0c1d7a] text-white" : "border-[#0a1963] text-[#0a1963]"}
              >
                Today's Sales
              </Button>
              <Button
                onClick={() => handleFilterChange("all")}
                variant={filter === "all" ? "default" : "outline"}
                className={filter === "all" ? "bg-[#0a1963] hover:bg-[#0c1d7a] text-white" : "border-[#0a1963] text-[#0a1963]"}
              >
                All Time Sales
              </Button>
              {/* Day Filter */}
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  id="day-input"
                  value={selectedDateInput}
                  onChange={(e) => {
                    setSelectedDateInput(e.target.value)
                    setFilter("day")
                    setSelectedMonthInput("")
                    setSelectedYearInput("")
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                />
                <Button
                  onClick={() => { if (selectedDateInput) setFilter("day") }}
                  variant={filter === "day" && selectedDateInput ? "default" : "outline"}
                  className={filter === "day" && selectedDateInput ? "bg-[#0a1963] hover:bg-[#0c1d7a] text-white" : "border-gray-300 text-gray-700"}
                >
                  Filter Day
                </Button>
              </div>
              {/* Month Filter */}
              <div className="flex items-center gap-2">
                <input
                  type="month"
                  id="month-input"
                  value={selectedMonthInput}
                  onChange={(e) => {
                    setSelectedMonthInput(e.target.value)
                    setFilter("month")
                    setSelectedDateInput("")
                    setSelectedYearInput("")
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                />
                <Button
                  onClick={() => { if (selectedMonthInput) setFilter("month") }}
                  variant={filter === "month" && selectedMonthInput ? "default" : "outline"}
                  className={filter === "month" && selectedMonthInput ? "bg-[#0a1963] hover:bg-[#0c1d7a] text-white" : "border-gray-300 text-gray-700"}
                >
                  Filter Month
                </Button>
              </div>
              {/* Year Filter */}
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  id="year-input"
                  placeholder="YYYY"
                  min="1900"
                  max="2100"
                  value={selectedYearInput}
                  onChange={(e) => {
                    setSelectedYearInput(e.target.value)
                    setFilter("year")
                    setSelectedDateInput("")
                    setSelectedMonthInput("")
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm w-28"
                />
                <Button
                  onClick={() => { if (selectedYearInput) setFilter("year") }}
                  variant={filter === "year" && selectedYearInput ? "default" : "outline"}
                  className={filter === "year" && selectedYearInput ? "bg-[#0a1963] hover:bg-[#0c1d7a] text-white" : "border-gray-300 text-gray-700"}
                >
                  Filter Year
                </Button>
              </div>
            </div>

            {/* Sales Summary Statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
                <div className="p-4 rounded-lg bg-green-50 border-green-200 border shadow-md">
                    <DollarSign className="w-6 h-6 mx-auto text-green-600 mb-2" />
                    <p className="text-sm font-medium text-gray-600">{getFilterTitle()}</p>
                    <h2 className="text-2xl font-bold text-green-700">
                        ₹{totalSales.toFixed(2)}
                    </h2>
                </div>
                <div className="p-4 rounded-lg bg-red-50 border-red-200 border shadow-md">
                    <Tag className="w-6 h-6 mx-auto text-red-600 mb-2" />
                    <p className="text-sm font-medium text-gray-600">Total Discount Given</p>
                    <h2 className="text-2xl font-bold text-red-700">
                        ₹{totalDiscount.toFixed(2)}
                    </h2>
                </div>
                <div className="p-4 rounded-lg bg-blue-50 border-blue-200 border shadow-md">
                    <ShoppingBag className="w-6 h-6 mx-auto text-blue-600 mb-2" />
                    <p className="text-sm font-medium text-gray-600">Total Items Sold</p>
                    <h2 className="text-2xl font-bold text-blue-700">
                        {filteredSales.reduce((total, sale) => total + sale.quantity, 0)}
                    </h2>
                </div>
            </div>
          </CardContent>
        </Card>
        
        {/* --- Product Aggregation List --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <Card className="shadow-xl">
                <CardHeader className="bg-gray-100">
                    <CardTitle className="text-xl text-[#0a1963]">Product Sales List (By Quantity)</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <h3 className="text-sm text-gray-600 mb-4">Products arranged by total quantity sold (highest first).</h3>
                    {productQuantities.length > 0 ? (
                        <ul className="space-y-2 max-h-[400px] overflow-y-auto">
                            {productQuantities.map((product, index) => (
                                <li key={index} className="flex justify-between items-center px-4 py-2 bg-white border border-gray-200 rounded shadow-sm hover:bg-gray-50 transition-colors">
                                    <span className="font-medium text-[#0a1963]">{index + 1}. {product.name}</span>
                                    <span className="text-lg font-semibold text-gray-700">Qty: {product.quantity}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-center text-gray-500">No product sales found for the selected period.</p>
                    )}
                </CardContent>
            </Card>

            {/* --- Product Sales Chart --- */}
            <Card className="shadow-xl">
                <CardHeader className="bg-gray-100">
                    <CardTitle className="text-xl text-[#0a1963]">Sales by Product Quantity</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    {productQuantities.length > 0 ? (
                        <ResponsiveContainer width="100%" height={400}>
                            <BarChart 
                                data={productQuantities}
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                                <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" height={60} stroke="#4b5563" />
                                <YAxis stroke="#4b5563" />
                                <Tooltip formatter={(value: number) => [`${value} Units`, 'Quantity']} />
                                <Bar dataKey="quantity" fill="#0a1963" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-[400px]">
                             <p className="text-center text-gray-500">No data available for the selected period.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
        
        {/* --- Detailed Sales List --- */}
        <Card className="shadow-xl">
            <CardHeader className="bg-[#0a1963] text-white">
                <CardTitle className="text-xl">Detailed Transaction List</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
                {filteredSales.length > 0 ? (
                    <div className="overflow-x-auto max-h-[500px]">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price (₹)</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Discount (₹)</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Final Price (₹)</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredSales.map((sale) => (
                                    <tr key={sale.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{sale.name}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{sale.quantity}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-gray-500">{sale.unitPrice.toFixed(2)}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-red-600">{sale.discount.toFixed(2)}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-right text-green-700">{sale.finalPriceCharged.toFixed(2)}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{sale.paymentMethod}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(sale.soldAt).toLocaleDateString()} {new Date(sale.soldAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-center text-gray-500">No transactions found for the selected period.</p>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ServiceSalesPage;