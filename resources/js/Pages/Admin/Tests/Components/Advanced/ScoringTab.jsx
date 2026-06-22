import React from "react";
import Input from "@/Components/UI/Input";

export default function ScoringTab({ data, setData }) {
  return (
    <div className="space-y-4 text-left">
      <Input
        label="Point Minimal Lulus"
        type="number"
        value={data.points_to_pass}
        onChange={(e) => setData("points_to_pass", e.target.value)}
        placeholder={"Masukkan point minimal untuk lulus..."}
      />
    </div>
  );
}
