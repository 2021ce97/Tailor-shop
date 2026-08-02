import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="h-9 w-9 rounded-md bg-slate-900 flex items-center justify-center text-white font-semibold text-sm">
            T
          </div>
          <span className="font-semibold text-slate-900 tracking-tight text-lg">Clothes &amp; Tailor Shop</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
          <h1 className="text-base font-semibold text-slate-900 mb-1">Sign in</h1>
          <p className="text-sm text-slate-500 mb-5">Access your shop's orders, inventory, and accounts.</p>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
