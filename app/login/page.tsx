// app/login/page.tsx or pages/login.tsx for older Next.js versions
"use client";

import React, { useState } from 'react';
import { auth } from '../../lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation'; // For Next.js 13 app directory
import { FirebaseError } from 'firebase/app'; // Import FirebaseError

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Redirect to dashboard or home page after successful login
      router.push('/dashboard');
    } catch (err) {
      if (err instanceof FirebaseError) {
        setError(err.message); // Handle Firebase-specific error messages
      } else {
        setError('An unexpected error occurred.'); // Handle unexpected errors
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Login to Your Account</h2>
        {error && (
          <div className="mb-4 text-red-500 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              id="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="••••••••"
            />
          </div>
          <div>
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Sign In
            </button>
          </div>
        </form>
        <p className="mt-6 text-center text-sm text-gray-600">
          Dont have an account?{' '}
          <a href="/signup" className="text-blue-600 hover:text-blue-500">
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
