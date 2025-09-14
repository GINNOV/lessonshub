// file: src/app/components/PlaceholderGuide.tsx
'use client';

export default function PlaceholderGuide() {
  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="font-semibold mb-2 text-lg">Available Placeholders</h3>
      <p className="text-sm text-gray-600 mb-4">
        Use these placeholders in your email subject and body. They will be replaced with the correct values when the email is sent.
      </p>
      <ul className="space-y-2 text-sm">
        <li className="flex items-center">
          <code className="font-mono bg-gray-200 text-gray-800 rounded px-2 py-1 text-xs">
            {`{{studentName}}`}
          </code>
          <span className="ml-2 text-gray-700">- The student&apos;s name</span>
        </li>
        <li className="flex items-center">
          <code className="font-mono bg-gray-200 text-gray-800 rounded px-2 py-1 text-xs">
            {`{{teacherName}}`}
          </code>
          <span className="ml-2 text-gray-700">- The teacher&apos;s name</span>
        </li>
        <li className="flex items-center">
          <code className="font-mono bg-gray-200 text-gray-800 rounded px-2 py-1 text-xs">
            {`{{lessonTitle}}`}
          </code>
          <span className="ml-2 text-gray-700">- The title of the lesson</span>
        </li>
        <li className="flex items-center">
          <code className="font-mono bg-gray-200 text-gray-800 rounded px-2 py-1 text-xs">
            {`{{deadline}}`}
          </code>
          <span className="ml-2 text-gray-700">- The assignment deadline</span>
        </li>
        <li className="flex items-center">
          <code className="font-mono bg-gray-200 text-gray-800 rounded px-2 py-1 text-xs">
            {`{{button}}`}
          </code>
          <span className="ml-2 text-gray-700">- The action button</span>
        </li>
      </ul>
    </div>
  );
}