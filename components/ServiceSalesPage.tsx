'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ref, onValue } from 'firebase/database';
import { database } from '@/lib/firebase';
import { parseISO, isToday, isThisMonth, format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface SellData {
  id: string;
  productId: string;
  name: string;
  paymentMethod: string;
  price: number;
  soldAt: string;
}

const ServiceSalesPage: React.FC = () => {
  const [sellData, setSellData] = useState<SellData[]>([]);
  const [filter, setFilter] = useState<'today' | 'month'>('today');
  const [filteredSales, setFilteredSales] = useState<SellData[]>([]);
  const [mostSold, setMostSold] = useState<{ name: string; quantity: number }[]>([]);
  const [leastSold, setLeastSold] = useState<{ name: string; quantity: number }[]>([]);

  useEffect(() => {
    const sellRef = ref(database, 'sell');
    const unsubscribe = onValue(sellRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const sellList: SellData[] = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));
        setSellData(sellList);
      } else {
        setSellData([]);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let sales: SellData[] = [];
    if (filter === 'today') {
      sales = sellData.filter((sale) => isToday(parseISO(sale.soldAt)));
    } else if (filter === 'month') {
      sales = sellData.filter((sale) => isThisMonth(parseISO(sale.soldAt)));
    }
    setFilteredSales(sales);

    const productCount: { [key: string]: { name: string; quantity: number } } = {};
    sales.forEach((sale) => {
      if (productCount[sale.productId]) {
        productCount[sale.productId].quantity += 1;
      } else {
        productCount[sale.productId] = { name: sale.name, quantity: 1 };
      }
    });

    const productArray = Object.values(productCount);
    productArray.sort((a, b) => b.quantity - a.quantity);

    setMostSold(productArray.slice(0, 5));
    setLeastSold(productArray.slice(-5).reverse());
  }, [sellData, filter]);

  // Calculate total sales for the selected filter
  const totalSales = filteredSales.reduce((total, sale) => total + sale.price, 0);

  return (
    <div className="flex flex-col h-screen overflow-y-auto bg-gray-50"> {/* Main container with overflow */ }
      <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-extrabold mb-6 text-center text-[#0a1963]">Service Sales Dashboard</h1>
        <Card className="mb-8 shadow-lg">
          <CardHeader className="bg-[#0a1963] text-white">
            <CardTitle className="text-2xl">Sales Overview</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold mb-4 text-[#0a1963]">Total Sales: ₹{totalSales.toFixed(2)}</h2>
            <div className="flex justify-center space-x-4 mb-6">
              <Button
                onClick={() => setFilter('today')}
                variant={filter === 'today' ? 'default' : 'outline'}
                className={filter === 'today' ? 'bg-[#0a1963] hover:bg-[#0c1d7a] text-white' : ''}
              >
                Todays Sales
              </Button>
              <Button
                onClick={() => setFilter('month')}
                variant={filter === 'month' ? 'default' : 'outline'}
                className={filter === 'month' ? 'bg-[#0a1963] hover:bg-[#0c1d7a] text-white' : ''}
              >
                This Months Sales
              </Button>
            </div>
            {filteredSales.length > 0 ? (
              <div className="overflow-y-auto max-h-[400px]"> {/* Scrollable area within the card */ }
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredSales.map((sale) => (
                    <Card
                      key={sale.id}
                      className="shadow-md hover:shadow-xl transition-shadow duration-300"
                    >
                      <CardHeader className="bg-[#0a1963] bg-opacity-10">
                        <CardTitle className="text-xl font-semibold text-[#0a1963]">{sale.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <p className="font-semibold text-[#0a1963]">₹{sale.price.toFixed(2)}</p>
                        <p className="text-sm text-gray-500 mt-2">
                          {format(parseISO(sale.soldAt), 'dd MMM yyyy HH:mm')}
                        </p>
                        <p className="text-sm text-gray-500 mt-2">Payment: {sale.paymentMethod}</p> {/* Payment Method */}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-center text-gray-500">No sales found for the selected period.</p>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 mb-8">
          <Card className="shadow-lg">
            <CardHeader className="bg-[#0a1963] text-white">
              <CardTitle className="text-xl">Full Service Sales Graph</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="max-h-[500px] overflow-y-auto"> {/* Scrollable area for the full service sales graph */ }
                {sellData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={sellData}>
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="price" fill="#0a1963" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-gray-500">No data available.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <Card className="shadow-lg">
            <CardHeader className="bg-[#0a1963] text-white">
              <CardTitle className="text-xl">Top Sold Services</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="max-h-[300px] overflow-y-auto"> {/* Scrollable area for the top sold services */ }
                {mostSold.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={mostSold}>
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="quantity" fill="#0a1963" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-gray-500">No data available.</p>
                )}
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-lg">
            <CardHeader className="bg-[#0a1963] text-white">
              <CardTitle className="text-xl">Least Sold Services</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="max-h-[300px] overflow-y-auto"> {/* Scrollable area for the least sold services */ }
                {leastSold.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={leastSold}>
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="quantity" fill="#0a1963" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-gray-500">No data available.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="bg-[#0a1963] text-white">
            <CardTitle className="text-xl">Sales Details</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold mb-4 text-[#0a1963]">Top Sold Services</h3>
                {mostSold.length > 0 ? (
                  <ul className="space-y-2 max-h-[200px] overflow-y-auto"> {/* Scrollable list of top sold services */ }
                    {mostSold.map((product, index) => (
                      <li
                        key={index}
                        className="flex justify-between px-4 py-2 bg-gray-100 rounded"
                      >
                        <span className="font-medium text-[#0a1963]">{product.name}</span>
                        <span className="text-gray-600">Quantity: {product.quantity}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-center text-gray-500">No data available.</p>
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4 text-[#0a1963]">Least Sold Services</h3>
                {leastSold.length > 0 ? (
                  <ul className="space-y-2 max-h-[200px] overflow-y-auto"> {/* Scrollable list of least sold services */ }
                    {leastSold.map((product, index) => (
                      <li
                        key={index}
                        className="flex justify-between px-4 py-2 bg-gray-100 rounded"
                      >
                        <span className="font-medium text-[#0a1963]">{product.name}</span>
                        <span className="text-gray-600">Quantity: {product.quantity}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-center text-gray-500">No data available.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ServiceSalesPage;
