// file: src/app/dashboard/create/multi-choice/page.tsx

import MultiChoiceCreator from "@/app/components/MultiChoiceCreator";

export default function CreateMultiChoicePage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Create Multi-Choice Lesson</h1>
      {/* Render the creator component without a 'lesson' prop.
        The component is designed to handle this and will start in a blank "create" state.
      */}
      <MultiChoiceCreator />
    </div>
  );
}