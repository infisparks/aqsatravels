// components/ProductEntryForm.tsx
'use client'

import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import axios, { isAxiosError } from 'axios';
import { ref, get, push, set } from "firebase/database";
import { database } from '@/lib/firebase';

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
  unitPrice: number;
  quantity: number;
  totalPriceCalculated: number;
  finalPriceCharged: number;
  discount: number; // The numeric value saved to the database
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
  [key: string]: unknown;
}

// Helper to format currency (example: to 2 decimal places)
const formatCurrency = (value: number) => value.toFixed(2);

export function ProductEntryForm() {
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<ServiceDetail[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ServiceDetail[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ServiceDetail | null>(null);
  const [unitPrice, setUnitPrice] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [totalPriceCalculated, setTotalPriceCalculated] = useState<number>(0);
  const [discountInput, setDiscountInput] = useState(''); // New state for discount input (string)
  const [finalPriceCharged, setFinalPriceCharged] = useState(''); // Calculated based on discount
  const [phoneNumber, setPhoneNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>('cash');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch products on component mount (No Change)
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

  // Effect to calculate Total Price and recalculate Final Price/Discount on changes
  useEffect(() => {
    if (selectedProduct && unitPrice) {
      const priceVal = parseFloat(unitPrice);
      const calculatedTotal = priceVal * quantity;
      setTotalPriceCalculated(calculatedTotal);
      
      // Calculate final price based on the current discount input
      const discountVal = parseFloat(discountInput) || 0;
      let finalPrice = calculatedTotal - discountVal;

      // Ensure final price is not negative
      if (finalPrice < 0) {
        finalPrice = 0;
        // Adjust discount if it resulted in a negative final price
        setDiscountInput(formatCurrency(calculatedTotal));
      }

      setFinalPriceCharged(formatCurrency(finalPrice));
    } else {
      setTotalPriceCalculated(0);
      setDiscountInput('');
      setFinalPriceCharged('');
    }
  }, [selectedProduct, unitPrice, quantity, discountInput]); // Now depends on discountInput

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
    setUnitPrice(product.price.toFixed(2));
    setQuantity(1);
    setDiscountInput(''); // Reset discount
    setSearchTerm(product.name);
    setShowSuggestions(false);
    setMessage(null);
  };
  
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    const newQuantity = Math.max(1, isNaN(value) ? 1 : value);
    setQuantity(newQuantity);
    setDiscountInput(''); // Reset discount when quantity changes
  };
  
  // New handler for discount input
  const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const discountVal = parseFloat(value);
    
    // Only update discountInput state with the raw value
    setDiscountInput(value);

    const calculatedTotal = totalPriceCalculated;
    
    if (calculatedTotal > 0 && !isNaN(discountVal) && discountVal >= 0) {
        let newFinalPrice = calculatedTotal - discountVal;
        
        // Cap the discount so the final price is not negative
        if (newFinalPrice < 0) {
            newFinalPrice = 0;
            // The discount will be capped by the total price in the useEffect
        }
        setFinalPriceCharged(formatCurrency(newFinalPrice));

    } else if (value.trim() === '' || isNaN(discountVal) || discountVal < 0) {
        // If discount is cleared or invalid, set final price back to total
        setFinalPriceCharged(formatCurrency(calculatedTotal));
    }
    // Note: The useEffect dependency on discountInput will handle the actual state calculation
  };


  const handleSell = async () => {
    if (!selectedProduct) {
      setMessage({ type: 'error', text: "No product selected to sell." });
      return;
    }

    const finalPriceVal = parseFloat(finalPriceCharged);
    if (isNaN(finalPriceVal) || finalPriceVal < 0) {
      setMessage({ type: 'error', text: "Final price calculation error. Please review the inputs." });
      return;
    }
    
    // Final check for values to be saved
    const unitPriceVal = parseFloat(unitPrice);
    const calculatedTotal = unitPriceVal * quantity;
    const finalDiscount = calculatedTotal - finalPriceVal; // Recalculate based on final values

    setIsLoading(true);

    const sellRef = ref(database, 'sell');
    const newSellRef = push(sellRef);

    const sellData: SellData = {
      productId: selectedProduct.id,
      name: selectedProduct.name,
      description: selectedProduct.description,
      unitPrice: unitPriceVal,
      quantity: quantity,
      totalPriceCalculated: calculatedTotal,
      finalPriceCharged: finalPriceVal,
      discount: finalDiscount > 0 ? finalDiscount : 0, // Ensure discount is non-negative
      phoneNumber: phoneNumber.trim() || null,
      soldAt: new Date().toISOString(),
      paymentMethod,
    };

    try {
      await set(newSellRef, sellData);

      // Send WhatsApp message if phone number is provided
      if (sellData.phoneNumber) {
        await sendWhatsAppMessage(sellData, sellData.phoneNumber);
      }

      setMessage({ type: 'success', text: "Product sold successfully. Invoice sent via WhatsApp (if number provided)." });
      // Reset form
      setSelectedProduct(null);
      setUnitPrice('');
      setQuantity(1);
      setTotalPriceCalculated(0);
      setDiscountInput('');
      setFinalPriceCharged('');
      setSearchTerm('');
      setPhoneNumber('');
      setPaymentMethod('cash');
    } catch (error: unknown) {
      console.error('Error selling product:', error);
      setMessage({ type: 'error', text: "Failed to sell product." });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Sends a professional invoice message via WhatsApp. (Updated for clarity)
   */
  const sendWhatsAppMessage = async (sellData: SellData, phoneNumber: string) => {
    try {
      // Craft a professional invoice message with new fields
      const invoiceMessage = `
Hello,

*Thank you for your purchase!* Here are your invoice details:

*Product Name:* ${sellData.name}
*Unit Price:* ₹${formatCurrency(sellData.unitPrice)}
*Quantity:* ${sellData.quantity}
*Total Calculated Price:* ₹${formatCurrency(sellData.totalPriceCalculated)}
*Discount:* ₹${formatCurrency(sellData.discount)}
*Final Price Charged:* ₹${formatCurrency(sellData.finalPriceCharged)}
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
        media_url: "https://raw.githubusercontent.com/mudassir47/public/refs/heads/main/aqsa.png"
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
    } catch (error: unknown) {
      if (isAxiosError(error)) {
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
                <ul className="absolute z-10 bg-white border border-gray-300 w-full mt-1 max-h-40 overflow-y-auto shadow-lg">
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
                {/* Product details (no change) */}
                <div><Label htmlFor="productName">Product Name</Label><Input id="productName" value={selectedProduct.name} readOnly className="bg-gray-100" /></div>
                <div><Label htmlFor="productDescription">Description</Label><Input id="productDescription" value={selectedProduct.description} readOnly className="bg-gray-100" /></div>
                
                {/* Unit Price (Read-only) */}
                <div>
                  <Label htmlFor="unitPrice">Unit Price (Rs)</Label>
                  <Input id="unitPrice" type="number" value={unitPrice} readOnly className="bg-gray-100" />
                </div>
                
                {/* Quantity Input */}
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input id="quantity" type="number" value={quantity} onChange={handleQuantityChange} min="1" />
                </div>
                
                {/* Total Calculated Price (Read-only) */}
                <div>
                  <Label htmlFor="totalPriceCalculated">Total Calculated Price (Unit Price x Quantity)</Label>
                  <Input
                    id="totalPriceCalculated"
                    type="text"
                    value={`₹${formatCurrency(totalPriceCalculated)}`}
                    readOnly
                    className="bg-blue-100 font-bold"
                  />
                </div>
                
                {/* DISCOUNT INPUT (User Editable) */}
                <div>
                  <Label htmlFor="discountInput">Discount Applied (Rs)</Label>
                  <Input
                    id="discountInput"
                    type="number"
                    value={discountInput}
                    onChange={handleDiscountChange}
                    placeholder="Enter discount amount"
                    step="0.01"
                    min="0"
                  />
                </div>
                
                {/* Final Price Charged (Read-only - derived from discount) */}
                <div>
                  <Label htmlFor="finalPriceCharged">Final Price Charged (Rs)</Label>
                  <Input
                    id="finalPriceCharged"
                    type="text"
                    value={finalPriceCharged ? `₹${finalPriceCharged}` : '₹0.00'}
                    readOnly // Now read-only
                    className="bg-green-100 font-bold"
                  />
                </div>
                
                {/* Phone Number (No Change) */}
                <div>
                  <Label htmlFor="phoneNumber">Phone Number (Optional for WhatsApp Invoice)</Label>
                  <Input id="phoneNumber" type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="Enter phone number" />
                </div>
                
                {/* Payment Method Selection (No Change) */}
                <div>
                  <Label className="block mb-1">Payment Method</Label>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input type="radio" name="paymentMethod" value="cash" checked={paymentMethod === 'cash'} onChange={() => setPaymentMethod('cash')} className="mr-2" />
                      Cash
                    </label>
                    <label className="flex items-center">
                      <input type="radio" name="paymentMethod" value="online" checked={paymentMethod === 'online'} onChange={() => setPaymentMethod('online')} className="mr-2" />
                      Online
                    </label>
                  </div>
                </div>
                
                <Button
                  onClick={handleSell}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  disabled={isLoading || !finalPriceCharged || parseFloat(finalPriceCharged) < 0}
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