// file: src/app/about/page.tsx

import type { Metadata } from 'next'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Image from 'next/image';
import { Target, Eye, Users } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Learn about LessonHUB’s mission and the team building an engaging, modern platform for teachers and students.',
  alternates: { canonical: '/about' },
}

// Team members data
const teamMembers = [
  {
    name: "Dr. Evelyn Reed",
    role: "Founder & CEO",
    bio: "With a Ph.D. in Educational Technology, Evelyn is passionate about creating tools that empower educators and inspire students.",
    imageUrl: "/team/evelyn.png",
  },
  {
    name: "Marcus Chen",
    role: "Lead Software Engineer",
    bio: "Marcus brings over a decade of experience in full-stack development, ensuring LessonHUB is robust, secure, and scalable.",
    imageUrl: "/team/marcus.png",
  },
  {
    name: "Sofia Rodriguez",
    role: "Head of Curriculum Design",
    bio: "A former teacher with a Master's in Curriculum & Instruction, Sofia ensures our platform meets the real-world needs of classrooms.",
    imageUrl: "/team/sofia.png", 
  },
];

export default function AboutPage() {
  return (
    <div className="max-w-5xl mx-auto">
      {/* Hero Section */}
      <section className="text-center mb-16">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">About LessonHUB</h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          We believe in a world where every student has access to engaging, high-quality education, and every teacher has the tools to make it happen.
        </p>
      </section>

      {/* Mission and Vision Section */}
      <section className="grid md:grid-cols-2 gap-12 mb-16">
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-primary mb-4">
            <Target className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold">Our Mission</h2>
          <p className="mt-2 text-muted-foreground">
            To empower educators by providing an intuitive, flexible, and powerful platform to create and deliver personalized learning experiences that captivate and inspire students.
          </p>
        </div>
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-primary mb-4">
            <Eye className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold">Our Vision</h2>
          <p className="mt-2 text-muted-foreground">
            To be the leading platform for custom education, fostering a global community of lifelong learners and innovative educators who are shaping the future.
          </p>
        </div>
      </section>
      
      {/* Meet the Team Section */}
      <section className="text-center mb-16">
        <h2 className="text-3xl font-bold mb-8">Meet the Team</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {teamMembers.map((member) => (
            <Card key={member.name} className="text-center">
              <CardContent className="pt-6">
                <Avatar className="w-24 h-24 mx-auto mb-4">
                  <AvatarImage src={member.imageUrl} alt={member.name} />
                  <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <h3 className="text-xl font-semibold">{member.name}</h3>
                <p className="text-primary font-medium">{member.role}</p>
                <p className="text-sm text-muted-foreground mt-2">{member.bio}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
