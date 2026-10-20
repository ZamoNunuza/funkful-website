"use client";

import { useState, type InputHTMLAttributes, type CSSProperties } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  inputClassName?: string;
  inputStyle?: CSSProperties;
};

export default function PasswordInput({ inputClassName = "", inputStyle, ...props }: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? "text" : "password"}
        style={inputStyle}
        className={`${inputClassName} pr-12`}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-neutral-500 hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-black"
      >
        {visible ? (
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.2A11.7 11.7 0 0112 5c5.2 0 8.8 4.6 9.5 7-.3 1.1-1.2 2.6-2.7 3.9M6.2 6.2C3.8 7.8 2.7 10.1 2.5 12c.7 2.4 4.3 7 9.5 7 1 0 2-.2 2.9-.5" />
          </svg>
        ) : (
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
