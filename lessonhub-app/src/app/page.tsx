// file: src/app/page.tsx

'use client';

import { useState, useEffect } from 'react';
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Role } from "@prisma/client";
import { Button } from '@/components/ui/button';

const testimonials = [
  {
    quote: "LessonHUB has transformed how I create and manage assignments. My students are more engaged than ever!",
    author: "Jane Doe, 5th Grade Teacher",
  },
  {
    quote: "The platform is incredibly intuitive. I was able to build and assign my first lesson in under 10 minutes.",
    author: "John Smith, High School History",
  },
  {
    quote: "My students love the clear deadlines and easy submission process. It's made a huge difference in my classroom.",
    author: "Emily White, Middle School Science",
  },
];

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [isFading, setIsFading] = useState(false);

  // This effect handles redirecting logged-in users
  useEffect(() => {
    if (status === 'authenticated' && session) {
      const userRole = (session.user as any).role;
      if (userRole === Role.TEACHER) {
        router.push('/dashboard');
      } else {
        router.push('/my-lessons');
      }
    }
  }, [session, status, router]);

  // This effect handles the rotating testimonials
  useEffect(() => {
    const timer = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
        setIsFading(false);
      }, 500); // Wait for fade-out to complete
    }, 5000); // Change testimonial every 5 seconds

    return () => clearInterval(timer);
  }, []);

  // Show a loading state while session is being determined
  if (status === 'loading') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
        <p>Loading...</p>
      </main>
    );
  }

  // Only render the homepage for unauthenticated users
  if (status === 'unauthenticated') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-start p-8 pt-24 sm:pt-32 bg-gray-50 text-center">
        <div className="max-w-2xl w-full">

          {/* Hero Image Section */}
          <div className="mb-12">
            <Image
              src="/hero_image_1.png"
              alt="An illustration showing a vibrant and modern learning environment."
              width={600}
              height={400}
              className="w-full h-auto rounded-lg shadow-md" // <-- CORRECTED: Removed max-w-md and mx-auto
              priority 
            />
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Welcome to LessonHUB
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            The modern platform for creating, assigning, and grading lessons with ease.
          </p>
          
          {/* Rotating Testimonials Section */}
          <div className="mt-12 h-32 flex items-center justify-center">
            <div 
              className={`transition-opacity duration-500 ease-in-out ${isFading ? 'opacity-0' : 'opacity-100'}`}
            >
              <blockquote className="text-xl italic text-gray-800">
                &quot;{testimonials[currentTestimonial].quote}&quot;
              </blockquote>
              <p className="mt-4 text-md text-gray-500 font-medium">
                - {testimonials[currentTestimonial].author}
              </p>
            </div>
          </div>

          <div className="mt-10">
            <Button asChild size="lg">
              <Link href="/register">
                SIGN UP NOW!
              </Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // Return null or a placeholder while redirecting
  return null;
}

