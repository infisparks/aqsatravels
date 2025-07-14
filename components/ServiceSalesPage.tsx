"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ref, onValue } from "firebase/database"
import { database } from "@/lib/firebase"
import { parseISO, isToday, isSameDay, isSameMonth, isSameYear, format } from "date-fns"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"

interface SellData {
  id: string
  productId: string
  name: string
  paymentMethod: string
  price: number
  soldAt: string
}

const ServiceSalesPage: React.FC = () => {
  const [sellData, setSellData] = useState<SellData[]>([])
  const [filter, setFilter] = useState<"today" | "month" | "year" | "day" | "all">("today")
  const [selectedDateInput, setSelectedDateInput] = useState<string>("") // For day filter (YYYY-MM-DD)
  const [selectedMonthInput, setSelectedMonthInput] = useState<string>("") // For month filter (YYYY-MM)
  const [selectedYearInput, setSelectedYearInput] = useState<string>("") // For year filter (YYYY)

  const [filteredSales, setFilteredSales] = useState<SellData[]>([])
  const [productQuantities, setProductQuantities] = useState<{ name: string; quantity: number }[]>([])
  const [mostSold, setMostSold] = useState<{ name: string; quantity: number }[]>([])
  const [leastSold, setLeastSold] = useState<{ name: string; quantity: number }[]>([])

  useEffect(() => {
    const sellRef = ref(database, "sell")
    const unsubscribe = onValue(sellRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const sellList: SellData[] = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }))
        setSellData(sellList)
      } else {
        setSellData([])
      }
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    let sales: SellData[] = []
    if (filter === "today") {
      sales = sellData.filter((sale) => isToday(parseISO(sale.soldAt)))
    } else if (filter === "month" && selectedMonthInput) {
      // Create a date object from YYYY-MM string for comparison
      const monthDate = parseISO(`${selectedMonthInput}-01`)
      sales = sellData.filter((sale) => isSameMonth(parseISO(sale.soldAt), monthDate))
    } else if (filter === "year" && selectedYearInput) {
      // Create a date object from YYYY string for comparison
      const yearDate = new Date(Number.parseInt(selectedYearInput), 0, 1)
      sales = sellData.filter((sale) => isSameYear(parseISO(sale.soldAt), yearDate))
    } else if (filter === "day" && selectedDateInput) {
      // Create a date object from YYYY-MM-DD string for comparison
      const dayDate = parseISO(selectedDateInput)
      sales = sellData.filter((sale) => isSameDay(parseISO(sale.soldAt), dayDate))
    } else if (filter === "all") {
      sales = sellData
    } else {
      // Default to today's sales if no specific filter is active or selected date is missing
      sales = sellData.filter((sale) => isToday(parseISO(sale.soldAt)))
    }
    setFilteredSales(sales)

    const productCount: { [key: string]: { name: string; quantity: number } } = {}
    sales.forEach((sale) => {
      if (productCount[sale.productId]) {
        productCount[sale.productId].quantity += 1
      } else {
        productCount[sale.productId] = { name: sale.name, quantity: 1 }
      }
    })
    const productArray = Object.values(productCount)
    setProductQuantities(productArray) // Store for the graph

    productArray.sort((a, b) => b.quantity - a.quantity)
    setMostSold(productArray.slice(0, 5))
    setLeastSold(productArray.slice(-5).reverse())
  }, [sellData, filter, selectedDateInput, selectedMonthInput, selectedYearInput])

  // Calculate total sales for the selected filter
  const totalSales = filteredSales.reduce((total, sale) => total + sale.price, 0)

  const handleFilterChange = (newFilter: "today" | "month" | "year" | "day" | "all") => {
    setFilter(newFilter)
    // Reset specific date inputs when changing main filter type
    setSelectedDateInput("")
    setSelectedMonthInput("")
    setSelectedYearInput("")
  }

  return (
    <div className="flex flex-col h-screen overflow-y-auto bg-gray-50">
      <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-extrabold mb-6 text-center text-[#0a1963]">Service Sales Dashboard</h1>
        <Card className="mb-8 shadow-lg">
          <CardHeader className="bg-[#0a1963] text-white">
            <CardTitle className="text-2xl">Sales Overview</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold mb-4 text-[#0a1963]">Total Sales: ₹{totalSales.toFixed(2)}</h2>
            <div className="flex flex-wrap justify-center gap-4 mb-6">
              <Button
                onClick={() => handleFilterChange("today")}
                variant={filter === "today" ? "default" : "outline"}
                className={filter === "today" ? "bg-[#0a1963] hover:bg-[#0c1d7a] text-white" : ""}
              >
                Today's Sales
              </Button>
              <Button
                onClick={() => handleFilterChange("all")}
                variant={filter === "all" ? "default" : "outline"}
                className={filter === "all" ? "bg-[#0a1963] hover:bg-[#0c1d7a] text-white" : ""}
              >
                All Sales
              </Button>
              <div className="flex items-center gap-2">
                <label htmlFor="day-input" className="sr-only">
                  Select Day
                </label>
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
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <Button
                  onClick={() => {
                    if (selectedDateInput) setFilter("day")
                  }}
                  variant={filter === "day" && selectedDateInput ? "default" : "outline"}
                  className={filter === "day" && selectedDateInput ? "bg-[#0a1963] hover:bg-[#0c1d7a] text-white" : ""}
                >
                  Filter Day
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="month-input" className="sr-only">
                  Select Month
                </label>
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
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <Button
                  onClick={() => {
                    if (selectedMonthInput) setFilter("month")
                  }}
                  variant={filter === "month" && selectedMonthInput ? "default" : "outline"}
                  className={
                    filter === "month" && selectedMonthInput ? "bg-[#0a1963] hover:bg-[#0c1d7a] text-white" : ""
                  }
                >
                  Filter Month
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="year-input" className="sr-only">
                  Select Year
                </label>
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
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 w-28"
                />
                <Button
                  onClick={() => {
                    if (selectedYearInput) setFilter("year")
                  }}
                  variant={filter === "year" && selectedYearInput ? "default" : "outline"}
                  className={filter === "year" && selectedYearInput ? "bg-[#0a1963] hover:bg-[#0c1d7a] text-white" : ""}
                >
                  Filter Year
                </Button>
              </div>
            </div>
            {filteredSales.length > 0 ? (
              <div className="overflow-y-auto max-h-[400px]">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredSales.map((sale) => (
                    <Card key={sale.id} className="shadow-md hover:shadow-xl transition-shadow duration-300">
                      <CardHeader className="bg-[#0a1963] bg-opacity-10">
                        <CardTitle className="text-xl font-semibold text-[#0a1963]">{sale.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <p className="font-semibold text-[#0a1963]">₹{sale.price.toFixed(2)}</p>
                        <p className="text-sm text-gray-500 mt-2">
                          {format(parseISO(sale.soldAt), "dd MMM yyyy HH:mm")}
                        </p>
                        <p className="text-sm text-gray-500 mt-2">Payment: {sale.paymentMethod}</p>
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
              <CardTitle className="text-xl">Sales by Product (Filtered)</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="max-h-[500px] overflow-y-auto">
                {productQuantities.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={productQuantities}>
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="quantity" fill="#0a1963" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-gray-500">No data available for the selected period.</p>
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
              <div className="max-h-[300px] overflow-y-auto">
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
              <div className="max-h-[300px] overflow-y-auto">
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
                  <ul className="space-y-2 max-h-[200px] overflow-y-auto">
                    {mostSold.map((product, index) => (
                      <li key={index} className="flex justify-between px-4 py-2 bg-gray-100 rounded">
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
                  <ul className="space-y-2 max-h-[200px] overflow-y-auto">
                    {leastSold.map((product, index) => (
                      <li key={index} className="flex justify-between px-4 py-2 bg-gray-100 rounded">
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
  )
}

export default ServiceSalesPage
