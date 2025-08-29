// file: src/app/signin/page.tsx

'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignInPage() {
  const router = useRouter();
  // State for both forms
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // General state
  const [error, setError] = useState('');
  const [magicLinkMessage, setMagicLinkMessage] = useState('');

  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMagicLinkMessage('');
    const result = await signIn('email', { email, redirect: false });
    if (result?.error) {
      setError('Could not send sign-in link.');
    } else {
      setMagicLinkMessage('Check your email for a sign-in link!');
    }
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const result = await signIn('credentials', { redirect: false, email, password });
    if (result?.error) {
      setError('Invalid email or password');
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm space-y-4 p-8 bg-white shadow-md rounded-lg">
        <h1 className="text-2xl font-bold text-center">Sign In</h1>
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        {magicLinkMessage && <p className="text-green-600 text-sm text-center">{magicLinkMessage}</p>}
        
        <form onSubmit={handleMagicLinkSubmit} className="space-y-4">
           <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
          <button type="submit" className="w-full bg-slate-600 text-white py-2 rounded-md hover:bg-slate-700">
            Sign In with Email Link
          </button>
        </form>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-gray-500">Or</span>
          </div>
        </div>

        <form onSubmit={handleCredentialsSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">
            Sign In with Password
          </button>
        </form>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-gray-500">Or</span>
          </div>
        </div>
        
        {/* Corrected Google Button */}
        <button 
          onClick={() => signIn('google', { callbackUrl: '/dashboard' })} 
          className="w-full flex justify-center items-center bg-white border border-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-50"
        >
          <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 5,12C5,7.75 8.36,4.73 12.19,4.73C14.03,4.73 15.69,5.36 16.95,6.45L19.34,4.06C17.27,2.14 14.84,1 12.19,1C6.92,1 3,5.5 3,12C3,18.5 6.92,23 12.19,23C17.38,23 21.5,19.21 21.5,13.19C21.5,12.22 21.45,11.66 21.35,11.1Z"/>
          </svg>
          Sign In with Google
        </button>

        <p className="text-center text-sm">
          No account? <Link href="/register" className="text-blue-600 hover:underline">Register here</Link>
        </p>
      </div>
    </div>
  );
}