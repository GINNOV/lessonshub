// file: src/app/page.tsx
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, BookOpen, Users, Brain, Lightbulb, GraduationCap, Globe } from 'lucide-react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';

export default async function LandingPage() {
  const session = await auth();

  if (session?.user) {
    if (session.user.role === Role.TEACHER || session.user.role === Role.ADMIN) {
      redirect('/dashboard');
    } else if (session.user.role === Role.STUDENT) {
      redirect('/my-lessons');
    }
  }

  const accentColor = "bg-[#2A5E5B]"; // A deep teal/green inspired by the Branch aesthetic

  return (
    <div className="flex flex-col min-h-screen bg-white text-gray-800">

      {/* Hero Section with Full-Width Background Image */}
      <section className="relative w-full text-white overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/hero_image_1.png" // Your existing image
            alt="An engaging learning environment"
            fill
            className="object-cover"
            priority
          />
          {/* Gradient Overlay for Text Readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/20" />
        </div>

        {/* Content */}
        <div className="container mx-auto px-6 lg:px-8 py-24 md:py-32 relative z-10">
          <div className="max-w-xl text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Education Made Engaging
            </h1>
            <p className="text-lg sm:text-xl text-gray-200 mb-8">
              LessonHUB simplifies teaching and enhances learning with intuitive tools and captivating content.
            </p>
            <div className="space-y-3 mb-10 text-left mx-auto lg:mx-0 max-w-sm">
              <p className="flex items-center text-lg">
                <CheckCircle className="h-5 w-5 text-white mr-3 flex-shrink-0" /> Interactive Lesson Creation
              </p>
              <p className="flex items-center text-lg">
                <CheckCircle className="h-5 w-5 text-white mr-3 flex-shrink-0" /> Personalized Learning Paths
              </p>
              <p className="flex items-center text-lg">
                <CheckCircle className="h-5 w-5 text-white mr-3 flex-shrink-0" /> Collaborative & Accessible
              </p>
            </div>
            <Link href="/register">
              <Button
                size="lg"
                className={`bg-white text-[#2A5E5B] hover:bg-gray-200 rounded-md px-10 py-3 text-lg font-semibold shadow-md transition-all`}
              >
                Start Learning Today
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* The LessonHUB Difference Section */}
      <section className="w-full py-16 md:py-24 bg-gray-50 text-gray-800">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-16">The LessonHUB Difference</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
            <DifferenceCard
              icon={<Lightbulb className="h-8 w-8 text-[#2A5E5B]" />}
              title="Intuitive Content Creation"
              description="Design engaging educational material with an easy-to-use interface, no coding required."
            />
            <DifferenceCard
              icon={<GraduationCap className="h-8 w-8 text-[#2A5E5B]" />}
              title="Enhanced Learning Outcomes"
              description="Boost comprehension and retention with interactive elements and tailored feedback."
            />
            <DifferenceCard
              icon={<Users className="h-8 w-8 text-[#2A5E5B]" />}
              title="Seamless Collaboration"
              description="Foster teamwork and peer learning with integrated tools and group project features."
            />
            <DifferenceCard
              icon={<Globe className="h-8 w-8 text-[#2A5E5B]" />}
              title="Accessible Anywhere, Anytime"
              description="Learn and teach on any device, from any location, with robust cloud-based access."
            />
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="w-full py-16 md:py-24 bg-white text-gray-800">
        <div className="container mx-auto px-4 md:px-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">What Our Users Say</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <TestimonialCard
              quote="LessonHUB has transformed my classroom. The ability to create interactive lessons has boosted student engagement to a level I've never seen before."
              author="Maria Giuilli"
              role="High School Teacher"
            />
            <TestimonialCard
              quote="As a student, I love how organized my assignments are. The personalized feedback from my teacher helps me improve and understand the material better."
              author="G. Conte"
              role="University Student"
            />
            <TestimonialCard
              quote="I’m learning faster with less grammar! The method is so practical that I understand more and more every day — and the grammar comes naturally without even noticing. I don't need a certificate to prove my level; I can just use the language!"
              author="Sofia Cataldo"
              role="Top Student"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

// Reusable DifferenceCard Component
interface DifferenceCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function DifferenceCard({ icon, title, description }: DifferenceCardProps) {
  return (
    <div className="flex flex-col items-center text-center p-4">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

// Reusable TestimonialCard Component
interface TestimonialCardProps {
  quote: string;
  author: string;
  role: string;
}

function TestimonialCard({ quote, author, role }: TestimonialCardProps) {
    return (
        <Card className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <CardContent className="p-0">
                <p className="text-gray-700 italic leading-relaxed">&quot;{quote}&quot;</p>
                <div className="mt-6 text-right">
                    <p className="font-semibold text-gray-800">{author}</p>
                    <p className="text-sm text-gray-500">{role}</p>
                </div>
            </CardContent>
        </Card>
    );
}