import React from 'react';

export default function Input({ 
    label, 
    type = 'text', 
    value, 
    onChange, 
    error, 
    placeholder, 
    icon: Icon, 
    isRequired = false,
}) {
    return (
        <div className="flex flex-col gap-1.5 w-full">
            {label && (
                <label className="text-sm font-bold text-black flex items-center gap-1">
                    {label} 
                    {isRequired && <span className="text-red-500" title="Required">*</span>}
                </label>
            )}
            
            <div className="relative group">
                {Icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-green-600 transition-colors duration-200">
                        <Icon size={18} strokeWidth={2.5} />
                    </div>
                )}
                <input
                    type={type}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className={`
                        w-full text-sm md:text-base border rounded-lg p-2.5 outline-none transition-all duration-200
                        ${Icon ? 'pl-10' : 'px-4'}
                        ${error 
                            ? 'border-red-500 bg-red-50 focus:ring-2 focus:ring-red-200' 
                            : 'border-gray-300 focus:border-green-500 focus:ring-4 focus:ring-green-500/10'
                        }
                        placeholder:text-gray-400
                    `}
                />
            </div>
            
            {error && (
                <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[11px] md:text-xs text-red-600 font-semibold uppercase tracking-wider">
                        {error}
                    </span>
                </div>
            )}
        </div>
    );
}