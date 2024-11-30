// components/ProductEntryForm.tsx
'use client'

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import axios, { isAxiosError } from 'axios'; // Updated import
import { ref, get, push, set } from "firebase/database";
import { database } from '@/lib/firebase';
// Removed unused import
// import thumbnail from "@/public/aqsa.png"

/**
 * Interface representing the details of a service/product.
 */
interface ServiceDetail {
  id: string;
  name: string;
  description: string;
  price: number;
  createdAt: string;
}

/**
 * Interface representing the data of a sold product.
 */
interface SellData {
  productId: string;
  name: string;
  description: string;
  price: number;
  phoneNumber: string | null;
  soldAt: string;
  paymentMethod: 'cash' | 'online';
}

/**
 * Interface representing the structure of the WhatsApp API response.
 */
interface WhatsAppApiResponse {
  success: boolean;
  message: string;
  [key: string]: unknown; // Replaced 'any' with 'unknown'
}

export function ProductEntryForm() {
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<ServiceDetail[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ServiceDetail[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ServiceDetail | null>(null);
  const [price, setPrice] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>('cash'); // Added state
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // New loading state

  // Fetch products on component mount
  useEffect(() => {
    const fetchProducts = async () => {
      const servicedetailsRef = ref(database, 'servicedetails');
      try {
        const snapshot = await get(servicedetailsRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          const productsList: ServiceDetail[] = Object.keys(data).map(key => ({
            id: key,
            name: data[key].name,
            description: data[key].description,
            price: data[key].price,
            createdAt: data[key].createdAt,
          }));
          setProducts(productsList);
        } else {
          setProducts([]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchProducts();
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (value.trim() === '') {
      setFilteredProducts([]);
      setShowSuggestions(false);
      return;
    }

    const filtered = products.filter(product =>
      product.name.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredProducts(filtered);
    setShowSuggestions(true);
  };

  const handleSelectProduct = (product: ServiceDetail) => {
    setSelectedProduct(product);
    setPrice(product.price.toFixed(2));
    setSearchTerm(product.name);
    setShowSuggestions(false);
    setMessage(null);
  };

  const handleSell = async () => {
    if (!selectedProduct) {
      setMessage({ type: 'error', text: "No product selected to sell." });
      return;
    }

    if (!price || parseFloat(price) < 0) {
      setMessage({ type: 'error', text: "Please enter a valid price." });
      return;
    }

    setIsLoading(true); // Start loading

    const sellRef = ref(database, 'sell');
    const newSellRef = push(sellRef);

    const sellData: SellData = {
      productId: selectedProduct.id,
      name: selectedProduct.name,
      description: selectedProduct.description,
      price: parseFloat(price),
      phoneNumber: phoneNumber.trim() || null,
      soldAt: new Date().toISOString(),
      paymentMethod, // Include payment method
    };

    try {
      await set(newSellRef, sellData);

      // Send WhatsApp message if phone number is provided
      if (sellData.phoneNumber) {
        await sendWhatsAppMessage(sellData, sellData.phoneNumber);
      }

      setMessage({ type: 'success', text: "Product sold successfully." });
      // Reset form
      setSelectedProduct(null);
      setPrice('');
      setSearchTerm('');
      setPhoneNumber('');
      setPaymentMethod('cash'); // Reset payment method
    } catch (error: unknown) { // Changed from any to unknown
      console.error('Error selling product:', error);
      setMessage({ type: 'error', text: "Failed to sell product." });
    } finally {
      setIsLoading(false); // End loading
    }
  };

  /**
   * Sends a professional invoice message via WhatsApp.
   * @param sellData The data related to the sold product.
   * @param phoneNumber The recipient's phone number.
   */
  const sendWhatsAppMessage = async (sellData: SellData, phoneNumber: string) => {
    try {
      // Craft a professional invoice message
      const invoiceMessage = `
Hello,

*Thank you for your purchase!* Here are your invoice details:

*Product Name:* ${sellData.name}
*Description:* ${sellData.description}
*Price:* ₹${sellData.price.toFixed(2)}
*Payment Method:* ${capitalizeFirstLetter(sellData.paymentMethod)}
*Date:* ${new Date(sellData.soldAt).toLocaleString()}

If you have any *questions,* feel free to contact us.

Best regards,
*AQSA TRAVELS*
      `.trim();

      const payload = {
        number: phoneNumber,
        message: invoiceMessage,
        type: "media",
        media_url: "https://raw.githubusercontent.com/mudassir47/public/refs/heads/main/aqsa.png" // Keeping the same image URL
      };

      const response = await axios.post<WhatsAppApiResponse>('/api/send-whatsapp', payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        console.log('Invoice message sent successfully');
      } else {
        console.error('Failed to send invoice message:', response.data.message);
        setMessage({ type: 'error', text: "Failed to send WhatsApp invoice message." });
      }
    } catch (error: unknown) { // Changed from any to unknown
      if (isAxiosError(error)) { // Use isAxiosError directly
        console.error('Axios Error:', error.response?.data?.message || error.message);
        setMessage({ type: 'error', text: "Failed to send WhatsApp invoice message." });
      } else if (error instanceof Error) {
        console.error('General Error:', error.message);
        setMessage({ type: 'error', text: "Failed to send WhatsApp invoice message." });
      } else {
        console.error('Unexpected Error:', error);
        setMessage({ type: 'error', text: "Failed to send WhatsApp invoice message." });
      }
    }
  };

  /**
   * Capitalizes the first letter of a string.
   * @param str The string to capitalize.
   * @returns The capitalized string.
   */
  const capitalizeFirstLetter = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  return (
    <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="bg-[#0a1963] text-white">
          <CardTitle className="text-2xl font-bold">Product Entry</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {message && (
            <div
              className={`mb-4 p-2 text-sm rounded ${
                message.type === 'success'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {message.text}
            </div>
          )}
          <div className="space-y-4">
            <div className="relative">
              <Label htmlFor="productSearch" className="sr-only">
                Search for a product
              </Label>
              <Input
                id="productSearch"
                type="text"
                placeholder="Search for a product..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full"
                onFocus={() => setShowSuggestions(filteredProducts.length > 0)}
              />
              {showSuggestions && filteredProducts.length > 0 && (
                <ul className="absolute z-10 bg-white border border-gray-300 w-full mt-1 max-h-40 overflow-y-auto">
                  {filteredProducts.map((product) => (
                    <li
                      key={product.id}
                      className="p-2 hover:bg-gray-100 cursor-pointer"
                      onClick={() => handleSelectProduct(product)}
                    >
                      {product.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {selectedProduct && (
              <div className="space-y-4 border-t pt-4">
                <div>
                  <Label htmlFor="productName">Product Name</Label>
                  <Input
                    id="productName"
                    value={selectedProduct.name}
                    readOnly
                    className="bg-gray-100"
                  />
                </div>
                <div>
                  <Label htmlFor="productDescription">Description</Label>
                  <Input
                    id="productDescription"
                    value={selectedProduct.description}
                    readOnly
                    className="bg-gray-100"
                  />
                </div>
                <div>
                  <Label htmlFor="productPrice">Price (Rs)</Label>
                  <Input
                    id="productPrice"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    step="0.01"
                    min="0"
                  />
                </div>
                <div>
                  <Label htmlFor="phoneNumber">Phone Number (Optional)</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Enter phone number"
                  />
                </div>
                {/* Payment Method Selection */}
                <div>
                  <Label className="block mb-1">Payment Method</Label>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="cash"
                        checked={paymentMethod === 'cash'}
                        onChange={() => setPaymentMethod('cash')}
                        className="mr-2"
                      />
                      Cash
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="online"
                        checked={paymentMethod === 'online'}
                        onChange={() => setPaymentMethod('online')}
                        className="mr-2"
                      />
                      Online
                    </label>
                  </div>
                </div>
                <Button
                  onClick={handleSell}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  disabled={isLoading} // Disable button when loading
                >
                  {isLoading ? (
                    <>
                      <svg
                        className="animate-spin h-5 w-5 mr-3 border-t-2 border-b-2 border-white rounded-full"
                        viewBox="0 0 24 24"
                      ></svg>
                      Selling...
                    </>
                  ) : (
                    "Sell Product"
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ProductEntryForm;
