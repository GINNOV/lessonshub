// file: src/app/contact/page.tsx

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ContactPage() {
  const contactEmail = "contact@lessonhub.com"; // Replace with your actual contact email

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">Contact Us</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          We&apos;d love to hear from you. Please fill out the form below or reach out to us directly.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Contact Information */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Contact Information</h2>
          <p className="text-muted-foreground">
            For any inquiries, support requests, or feedback, please don&apos;t hesitate to get in touch.
          </p>
          <div className="space-y-4">
            <div className="flex items-start space-x-4">
              <div className="mt-1">📧</div>
              <div>
                <h3 className="font-semibold">Email</h3>
                <Link href={`mailto:${contactEmail}`} className="text-primary hover:underline">
                  {contactEmail}
                </Link>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="mt-1">📍</div>
              <div>
                <h3 className="font-semibold">Address</h3>
                <p className="text-muted-foreground">
                  123 Education Lane<br />
                  Learning City, ED 45678<br />
                  United States
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <Card>
          <CardHeader>
            <CardTitle>Send us a Message</CardTitle>
            <CardDescription>Your message will be sent directly to our team.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Note: This is a UI-only form. For full functionality, you would need to create an API endpoint. */}
            <form action={`mailto:${contactEmail}`} method="post" encType="text/plain" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" placeholder="Your Name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" placeholder="your@email.com" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" name="subject" placeholder="What can we help you with?" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" name="body" placeholder="Please include any details..." className="min-h-[120px]" required />
              </div>
              <Button type="submit" className="w-full">
                Send Message
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}