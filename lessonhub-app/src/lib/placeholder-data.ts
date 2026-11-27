// file: src/lib/placeholder-data.ts

// One placeholder and the text the editor shows for it.
export type Placeholder = {
  variable: string;
  description: string;
};

// A titled group of placeholders.
export type PlaceholderCategory = {
  title: string;
  items: Placeholder[];
};

// Every placeholder, grouped by category.
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
      { variable: '{{extraPointsLineEn}}', description: 'Optional bonus points line for graded emails (English HTML).' },
      { variable: '{{extraPointsLineIt}}', description: 'Optional bonus points line for graded emails (Italian HTML).' },
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
  {
    title: 'Teacher Notifications',
    items: [
        { variable: '{{studentList}}', description: 'An HTML unordered list (<ul>) of student names.' },
    ],
  },
];


// Returns every placeholder category.
export function getAllPlaceholders(): PlaceholderCategory[] {
  return allPlaceholders;
}
