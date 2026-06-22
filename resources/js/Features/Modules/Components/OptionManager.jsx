import React from "react";
import Button from "@/Components/UI/Button";

export default function OptionManager({ options, onChange }) {
  const addOption = () => {
    onChange([...options, { id: Date.now(), text: "", isCorrect: false }]);
  };

  const removeOption = (id) => {
    onChange(options.filter((opt) => opt.id !== id));
  };

  const updateOption = (id, field, value) => {
    onChange(
      options.map((opt) => (opt.id === id ? { ...opt, [field]: value } : opt))
    );
  };

  return (
    <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">
          Answer Options
        </label>
        <Button
          onClick={addOption}
          className="text-[10px] py-1 px-3 bg-blue-600">
          + Add Option
        </Button>
      </div>
      {options.map((opt, index) => (
        <div
          key={opt.id}
          className="flex gap-3 items-center group bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
          <input
            type="radio"
            name="correct_answer"
            checked={opt.isCorrect}
            onChange={() => updateOption(opt.id, "isCorrect", true)}
            className="text-green-600 focus:ring-green-500 w-4 h-4"
          />
          <input
            className="flex-1 text-sm border-none focus:ring-0 outline-none"
            placeholder={`Option ${index + 1}`}
            value={opt.text}
            onChange={(e) => updateOption(opt.id, "text", e.target.value)}
          />
          <button
            onClick={() => removeOption(opt.id)}
            className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="material-icons text-sm">delete</span>
          </button>
        </div>
      ))}
    </div>
  );
}
