// file: src/app/components/PlaceholderGuide.tsx
'use client';

export default function PlaceholderGuide() {
  return (
    <div className="rounded-lg border bg-gray-50 p-4">
      <h3 className="mb-2 text-lg font-semibold">Available Placeholders</h3>
      <p className="mb-4 text-sm text-gray-600">
        Use these placeholders in your email subject and body. They will be
        replaced with the correct values when the email is sent.
      </p>
      <ul className="space-y-2 text-sm">
        <li className="flex items-center">
          <code className="rounded bg-gray-200 px-2 py-1 font-mono text-xs text-gray-800">
            {`{{studentName}}`}
          </code>
          <span className="ml-2 text-gray-700">- The student&apos;s name</span>
        </li>
        <li className="flex items-center">
          <code className="rounded bg-gray-200 px-2 py-1 font-mono text-xs text-gray-800">
            {`{{teacherName}}`}
          </code>
          <span className="ml-2 text-gray-700">- The teacher&apos;s name</span>
        </li>
        <li className="flex items-center">
          <code className="rounded bg-gray-200 px-2 py-1 font-mono text-xs text-gray-800">
            {`{{lessonTitle}}`}
          </code>
          <span className="ml-2 text-gray-700">- The title of the lesson</span>
        </li>
        <li className="flex items-center">
          <code className="rounded bg-gray-200 px-2 py-1 font-mono text-xs text-gray-800">
            {`{{deadline}}`}
          </code>
          <span className="ml-2 text-gray-700">- The assignment deadline</span>
        </li>
        <li className="flex items-center">
          <code className="rounded bg-gray-200 px-2 py-1 font-mono text-xs text-gray-800">
            {`{{price}}`}
          </code>
          <span className="ml-2 text-gray-700">- The lesson&apos;s value (€)</span>
        </li>
        <li className="flex items-center">
          <code className="rounded bg-gray-200 px-2 py-1 font-mono text-xs text-gray-800">
            {`{{button}}`}
          </code>
          <span className="ml-2 text-gray-700">- The action button</span>
        </li>
      </ul>
    </div>
  );
}