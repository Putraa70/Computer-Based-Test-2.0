import React from "react";
import Input from "@/Components/UI/Input";
import { useState } from "react";

export default function UserForm({ data, setData, errors, groups }) {
  const [showPassword, setShowPassword] = useState(false);
  const handleGroupChange = (groupId) => {
    const isSelected = data.groups.includes(groupId);

    if (isSelected) {
      // Jika sudah terpilih, hapus dari array (Uncheck)
      setData(
        "groups",
        data.groups.filter((id) => id !== groupId),
      );
    } else {
      // kita gunakan spread operator agar data lama tidak hilang
      setData("groups", [...data.groups, groupId]);
    }
  };

  return (
    <div className="space-y-4 text-left">
      <Input
        label="Nama"
        type="text"
        value={data.name}
        onChange={(e) => setData("name", e.target.value)}
        error={errors.name}
        placeholder="Masukkan nama lengkap"
      />

      <Input
        label="NPM"
        type="text"
        value={data.npm}
        onChange={(e) => setData("npm", e.target.value)}
        error={errors.npm}
        placeholder="Masukkan NPM"
      />

      <Input
        label="Email"
        type="email"
        value={data.email}
        onChange={(e) => setData("email", e.target.value)}
        error={errors.email}
        placeholder="email@contoh.com"
      />

      <div>
        <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">
          Role Pengguna
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label
            className={`flex items-center space-x-3 p-3 border rounded-xl hover:bg-gray-50 cursor-pointer transition-all duration-200 ${
              data.role === "peserta"
                ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/10"
                : "border-gray-200 bg-white"
            }`}>
            <input
              type="radio"
              name="role"
              value="peserta"
              checked={data.role === "peserta"}
              onChange={(e) => setData("role", e.target.value)}
              className="text-blue-600 focus:ring-blue-500 w-4 h-4"
            />
            <div className="flex items-center gap-2">
              <span className="material-icons text-blue-600 text-lg">person</span>
              <span
                className={`text-xs font-bold uppercase tracking-tight ${
                  data.role === "peserta" ? "text-blue-700" : "text-gray-600"
                }`}>
                Peserta
              </span>
            </div>
          </label>

          <label
            className={`flex items-center space-x-3 p-3 border rounded-xl hover:bg-gray-50 cursor-pointer transition-all duration-200 ${
              data.role === "admin"
                ? "border-purple-500 bg-purple-50 ring-2 ring-purple-500/10"
                : "border-gray-200 bg-white"
            }`}>
            <input
              type="radio"
              name="role"
              value="admin"
              checked={data.role === "admin"}
              onChange={(e) => setData("role", e.target.value)}
              className="text-purple-600 focus:ring-purple-500 w-4 h-4"
            />
            <div className="flex items-center gap-2">
              <span className="material-icons text-purple-600 text-lg">admin_panel_settings</span>
              <span
                className={`text-xs font-bold uppercase tracking-tight ${
                  data.role === "admin" ? "text-purple-700" : "text-gray-600"
                }`}>
                Admin
              </span>
            </div>
          </label>
        </div>
        {errors.role && (
          <p className="mt-2 text-[10px] text-red-500 font-bold uppercase tracking-widest italic">
            {errors.role}
          </p>
        )}
      </div>

      <div className="relative">
        <Input
          label="Password"
          type={showPassword ? "text" : "password"}
          value={data.password || ""}
          onChange={(e) => setData("password", e.target.value)}
          error={errors.password}
          placeholder="isi hanya jika ingin mengubah password"
        />

        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600 transition-colors"
          tabIndex="-1"
        >
        </button>

        <p className="mt-1 text-[10px] text-gray-400 font-medium italic flex items-center gap-1">
          <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
          Biarkan kosong jika tidak ingin mengganti password user ini.
        </p>
      </div>

      <div className="mt-4">
        <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">
          Target Grup / Angkatan Mahasiswa
          {data.role === "admin" && (
            <span className="ml-2 text-[9px] text-gray-400 font-normal normal-case">
              (Opsional untuk Admin)
            </span>
          )}
        </label>

        <div className="grid grid-cols-2 gap-2">
          {groups.map((group) => (
            <label
              key={group.id}
              className={`flex items-center space-x-3 p-3 border rounded-xl hover:bg-gray-50 cursor-pointer transition-all duration-200 ${
                data.groups.includes(group.id)
                  ? "border-green-500 bg-green-50 ring-2 ring-green-500/10"
                  : "border-gray-200 bg-white"
              }`}>
              <input
                type="checkbox"
                checked={data.groups.includes(group.id)}
                onChange={() => handleGroupChange(group.id)}
                className="rounded-full border-gray-300 text-[#00a65a] focus:ring-[#00a65a] w-4 h-4 transition-all"
              />
              <span
                className={`text-xs font-bold uppercase tracking-tight ${
                  data.groups.includes(group.id)
                    ? "text-green-700"
                    : "text-gray-600"
                }`}>
                {group.name}
              </span>
            </label>
          ))}
        </div>

        <p className="mt-3 text-[9px] text-gray-400 font-medium italic">
          * Mahasiswa dapat terdaftar dalam beberapa grup sekaligus.
        </p>

        {errors.groups && (
          <p className="mt-2 text-[10px] text-red-500 font-bold uppercase tracking-widest italic">
            {errors.groups}
          </p>
        )}
      </div>
    </div>
  );
}
