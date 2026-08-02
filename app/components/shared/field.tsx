export function Field({
  label,
  name,
  type = "text",
  required,
  error,
  ...props
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  error?: string[];
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-600">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
        {...props}
      />
      {error?.[0] && <span className="text-xs text-red-500">{error[0]}</span>}
    </label>
  );
}
