"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";

const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

type SignInValues = z.infer<typeof signInSchema>;

const inputClassName =
  "h-12 w-full rounded-md border border-[#dedbe3] bg-white pl-11 pr-12 text-sm text-[#282342] outline-none transition focus:border-[#655c89] focus:ring-2 focus:ring-[#655c89]/15";

export function SignInForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({ resolver: zodResolver(signInSchema) });

  async function onSubmit(values: SignInValues) {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword(values);

    if (error) {
      setError("root.server", {
        message: "We couldn't sign you in with those details. Check your email and password.",
      });
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <div>
      <p className="text-sm font-medium text-[#746e83]">Welcome back</p>
      <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[#282342]">
        Sign in to your account
      </h2>
      <p className="mt-2 text-sm leading-6 text-[#77747e]">
        Pick up where your campus finds left off.
      </p>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium text-[#393641]">
            College email
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#898591]" size={17} aria-hidden="true" />
            <input
              {...register("email")}
              autoComplete="email"
              className={inputClassName}
              id="email"
              type="email"
              placeholder="you@college.edu"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
            />
          </div>
          {errors.email && <p id="email-error" className="mt-1.5 text-xs text-red-700">{errors.email.message}</p>}
        </div>

        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-medium text-[#393641]">
            Password
          </label>
          <div className="relative">
            <LockKeyhole className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#898591]" size={17} aria-hidden="true" />
            <input
              {...register("password")}
              autoComplete="current-password"
              className={inputClassName}
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "password-error" : undefined}
            />
            <button
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded text-[#77747e] hover:bg-[#f1eff4] hover:text-[#282342]"
              onClick={() => setShowPassword((visible) => !visible)}
              type="button"
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          {errors.password && <p id="password-error" className="mt-1.5 text-xs text-red-700">{errors.password.message}</p>}
        </div>

        {errors.root?.server && (
          <p aria-live="polite" className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
            {errors.root.server.message}
          </p>
        )}

        <button
          className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#514879] px-5 text-sm font-semibold text-white transition hover:bg-[#40385f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#514879] disabled:cursor-wait disabled:opacity-65"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? <LoaderCircle className="animate-spin" size={17} /> : null}
          {isSubmitting ? "Signing in" : "Sign in"}
          {!isSubmitting ? <ArrowRight size={17} aria-hidden="true" /> : null}
        </button>
      </form>

      <p className="mt-6 text-center text-xs leading-5 text-[#8b8890]">
        Your account is for campus exchanges. Keep your login details private.
      </p>
    </div>
  );
}