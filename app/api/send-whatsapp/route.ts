// app/api/send-whatsapp/route.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import axios, { AxiosError, isAxiosError } from 'axios';

// If you plan to use a local image, ensure it's accessible via a public URL or adjust accordingly.
// import img from "@/public/aqsa.png"; // Not used in this example

interface SendWhatsAppRequest {
  number: string;
  message: string;
  type?: 'text' | 'media';
  media_url?: string; // Required if type is 'media'
  filename?: string;  // Required if type is 'media' and sending a document
}

interface WhatsAppPayload {
  number: string;
  type: 'text' | 'media';
  message: string;
  instance_id: string;
  access_token: string;
  media_url?: string;
  filename?: string;
}

interface ApiResponse {
  success: boolean;
  message: string;
  [key: string]: unknown; // Replaced 'any' with 'unknown'
}

export async function POST(request: NextRequest) {
  try {
    const body: SendWhatsAppRequest = await request.json();

    const { number, message, type = 'text', media_url, filename } = body;

    // Validate input
    if (!number || !message) {
      return NextResponse.json(
        { success: false, message: 'Number and message are required.' },
        { status: 400 }
      );
    }

    // Basic phone number validation (adjust as needed)
    const phoneRegex = /^\d{10,15}$/;
    if (!phoneRegex.test(number)) {
      return NextResponse.json(
        { success: false, message: 'Invalid phone number format.' },
        { status: 400 }
      );
    }

    // If type is 'media', ensure media_url is provided
    if (type === 'media' && !media_url) {
      return NextResponse.json(
        { success: false, message: 'media_url is required for media type messages.' },
        { status: 400 }
      );
    }

    // Construct payload based on message type
    const payload: WhatsAppPayload = {
      number: number,
      type: type,
      message: message,
      instance_id: '6728BD5448232',
      access_token: '67277e6184833'
    };

    if (type === 'media') {
      payload.media_url = media_url;
      if (filename) {
        payload.filename = filename;
      }
    }

    // Define the API endpoint
    const apiEndpoint = 'https://adrika.aknexus.in/api/send';

    // Send POST request to the WhatsApp API
    const apiResponse = await axios.post<ApiResponse>(apiEndpoint, payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Handle API response
    if (apiResponse.data.success) {
      return NextResponse.json(
        { success: true, message: 'Message sent successfully.' },
        { status: 200 }
      );
    } else {
      console.error('API Error:', apiResponse.data);
      return NextResponse.json(
        { success: false, message: 'Failed to send message.' },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    let errorMessage = 'An error occurred while sending the message.';

    if (isAxiosError(error)) {
      const axiosError = error as AxiosError<ApiResponse>;
      console.error('Axios Error:', axiosError.response?.data || axiosError.message);
      if (axiosError.response?.data?.message && typeof axiosError.response.data.message === 'string') {
        errorMessage = axiosError.response.data.message;
      }
    } else if (error instanceof Error) {
      console.error('General Error:', error.message);
    } else {
      console.error('Unexpected Error:', error);
    }

    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
