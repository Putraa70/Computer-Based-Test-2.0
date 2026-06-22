import React, { useState } from "react";
import Button from "@/Components/UI/Button";

export default function QuestionForm({ onCancel }) {
  const [type, setType] = useState("multiple_choice");
  const [options, setOptions] = useState([
    { id: Date.now(), text: "", isCorrect: true },
    { id: Date.now() + 1, text: "", isCorrect: false },
  ]);
  const [previewImage, setPreviewImage] = useState(null);

  const addOption = () =>
    setOptions([...options, { id: Date.now(), text: "", isCorrect: false }]);
  const removeOption = (id) => setOptions(options.filter((o) => o.id !== id));

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) setPreviewImage(URL.createObjectURL(file));
  };

  return (
    <div className="bg-white border-2 border-green-500 rounded-xl p-8 space-y-8 animate-in fade-in slide-in-from-top-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <label className="text-xs font-black uppercase text-gray-400">
            Question Content
          </label>
          <textarea
            className="w-full border-2 border-gray-100 rounded-xl p-4 min-h-[120px] focus:ring-2 focus:ring-green-500"
            placeholder="Question text..."
          />

          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-gray-400">
              Media Attachment
            </label>
            <div className="flex items-center gap-4">
              <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition-all overflow-hidden relative">
                {previewImage ? (
                  <img
                    src={previewImage}
                    className="w-full h-full object-cover"
                    alt="Preview"
                  />
                ) : (
                  <span className="material-icons text-gray-300 text-3xl">
                    add_a_photo
                  </span>
                )}
                <input
                  type="file"
                  className="hidden"
                  onChange={handleImageChange}
                  accept="image/*"
                />
              </label>
              <p className="text-[10px] text-gray-400 italic">
                Click to upload image
                <br />
                Supports JPG, PNG (Max 2MB)
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-xs font-black uppercase text-gray-400">
            Question Type
          </label>
          <div className="flex gap-4 mb-4">
            {["multiple_choice", "essay"].map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                  type === t
                    ? "bg-green-600 border-green-600 text-white shadow-md"
                    : "border-gray-200 text-gray-400"
                }`}>
                {t.replace("_", " ").toUpperCase()}
              </button>
            ))}
          </div>

          {type === "multiple_choice" && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-black uppercase text-gray-400 tracking-tighter">
                  Answer Options
                </label>
                <button
                  onClick={addOption}
                  className="text-[10px] font-bold text-blue-600 uppercase">
                  + Add Option
                </button>
              </div>
              {options.map((opt, idx) => (
                <div key={opt.id} className="flex gap-2 items-center group">
                  <input
                    type="radio"
                    name="isCorrect"
                    defaultChecked={opt.isCorrect}
                    className="text-green-600 focus:ring-green-500"
                  />
                  <input
                    className="flex-1 border p-2 rounded text-sm focus:ring-2 focus:ring-green-500"
                    placeholder={`Option ${idx + 1}`}
                  />
                  <span
                    onClick={() => removeOption(opt.id)}
                    className="material-icons text-gray-300 hover:text-red-500 cursor-pointer text-sm opacity-0 group-hover:opacity-100">
                    delete
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button className="bg-green-600 px-8">Save Question</Button>
      </div>
    </div>
  );
}
