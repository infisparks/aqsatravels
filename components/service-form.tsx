// components/ServiceForm.tsx
'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import { ref, push, set } from "firebase/database"
import { database } from '@/lib/firebase' // Ensure the path is correct

export function ServiceForm() {
  // State variables for form fields
  const [serviceName, setServiceName] = useState('')
  const [serviceDescription, setServiceDescription] = useState('')
  const [servicePrice, setServicePrice] = useState('')
  
  // State variable for success/error messages
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Basic validation
    if (!serviceName.trim() || !serviceDescription.trim() || !servicePrice.trim()) {
      setMessage({ type: 'error', text: 'All fields are required.' })
      return
    }

    // Optional: Additional validation (e.g., price is a positive number)
    const priceNumber = parseFloat(servicePrice)
    if (isNaN(priceNumber) || priceNumber < 0) {
      setMessage({ type: 'error', text: 'Please enter a valid price.' })
      return
    }

    try {
      // Prepare service data
      const serviceData = {
        name: serviceName.trim(),
        description: serviceDescription.trim(),
        price: priceNumber,
        createdAt: new Date().toISOString(),
        // Optionally, include the user ID if authenticated
        // userId: auth.currentUser?.uid || null,
      }

      // Reference to the 'servicedetails' node in Realtime Database
      const servicedetailsRef = ref(database, 'servicedetails')

      // Create a new service entry with a unique key
      const newServiceRef = push(servicedetailsRef)

      // Upload the service data
      await set(newServiceRef, serviceData)

      // Display success message
      setMessage({ type: 'success', text: 'Service added successfully.' })

      // Reset form fields
      setServiceName('')
      setServiceDescription('')
      setServicePrice('')
    } catch (error) {
      console.error('Error adding service:', error)
      setMessage({ type: 'error', text: 'Failed to add service. Please try again.' })
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center text-[#0a1963]">Add New Service</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Display success or error message */}
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
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Service Name Field */}
          <div className="space-y-2">
            <Label htmlFor="serviceName">Service Name</Label>
            <Input
              id="serviceName"
              placeholder="Enter service name"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              required
            />
          </div>
          
          {/* Service Description Field */}
          <div className="space-y-2">
            <Label htmlFor="serviceDescription">Service Description</Label>
            <Textarea
              id="serviceDescription"
              placeholder="Describe your service"
              value={serviceDescription}
              onChange={(e) => setServiceDescription(e.target.value)}
              required
              className="min-h-[100px]"
            />
          </div>
          
          {/* Service Price Field */}
          <div className="space-y-2">
            <Label htmlFor="servicePrice">Service Price</Label>
            <Input
              id="servicePrice"
              type="number"
              placeholder="Enter price"
              value={servicePrice}
              onChange={(e) => setServicePrice(e.target.value)}
              required
              min="0"
              step="0.01"
            />
          </div>
          
          {/* Submit Button */}
          <Button type="submit" className="w-full bg-[#0a1963] hover:bg-[#0c1d7a] text-white">
            Add Service
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default ServiceForm
