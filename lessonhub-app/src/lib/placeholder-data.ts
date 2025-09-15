// file: src/lib/placeholder-data.ts

// A type for our placeholder definitions for clarity
export type Placeholder = {
  variable: string;
  description: string;
};

// A type for our categorized list
export type PlaceholderCategory = {
  title: string;
  items: Placeholder[];
};

// The definitive, complete list of ALL placeholders, categorized for clarity.
const allPlaceholders: PlaceholderCategory[] = [
  {
    title: 'General & Common',
    items: [
      { variable: '{{button}}', description: 'The main action button for the email.' },
    ],
  },
  {
    title: 'Student & Lesson Related',
    items: [
      { variable: '{{studentName}}', description: "The student's full name." },
      { variable: '{{teacherName}}', description: "The teacher's full name." },
      { variable: '{{lessonTitle}}', description: 'The title of the lesson.' },
      { variable: '{{deadline}}', description: 'The assignment submission deadline.' },
      { variable: '{{score}}', description: 'The score a student received on an assignment.' },
      { variable: '{{price}}', description: "The lesson's value in Euros (€)." },
      { variable: '{{teacherComments}}', description: "The teacher's formatted feedback on a graded assignment." },
    ],
  },
  {
    title: 'User Management',
    items: [
      { variable: '{{userName}}', description: "A generic user's name (e.g., for welcome emails)." },
    ],
  },
  {
    title: 'Admin Notifications',
    items: [
      { variable: '{{adminName}}', description: "The receiving admin's name." },
      { variable: '{{newUserName}}', description: "A new user's name." },
      { variable: '{{newUserEmail}}', description: "A new user's email address." },
      { variable: '{{deletedUserName}}', description: "A deleted user's name." },
      { variable: '{{deletedUserEmail}}', description: "A deleted user's email address." },
    ],
  },
];


// A simple function to export the complete list.
export function getAllPlaceholders(): PlaceholderCategory[] {
  return allPlaceholders;
}