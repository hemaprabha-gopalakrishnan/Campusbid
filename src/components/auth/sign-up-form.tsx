"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, BadgeCheck, LoaderCircle, LockKeyhole, Mail, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";

const signUpSchema = z
  .object({
    displayName: z.string().trim().min(2, "Use at least 2 characters.").max(50, "Keep your name under 50 characters."),
    campusIdentifier: z.string().trim().min(2, "Enter your campus identifier.").max(80, "Keep this under 80 characters."),
    email: z.string().trim().email("Enter a valid email address."),
    password: z.string().min(8, "Use at least 8 characters."),
    confirmPassword: z.string().min(1, "Confirm your password."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

type SignUpValues = z.infer<typeof signUpSchema>;

const inputClassName =
  "h-11 w-full rounded-md border border-[#dedbe3] bg-white pl-11 pr-4 text-sm text-[#282342] outline-none transition focus:border-[#655c89] focus:ring-2 focus:ring-[#655c89]/15";

export function SignUpForm() {
  const router = useRouter();
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignUpValues>({ resolver: zodResolver(signUpSchema) });

  async function onSubmit(values: SignUpValues) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          display_name: values.displayName,
          campus_identifier: values.campusIdentifier,
        },
      },
    });

    if (error) {
      setError("root.server", {
        message: "We couldn't create your account. Check your details or try signing in.",
      });
      return;
    }

    if (data.session) {
      router.replace("/");
      router.refresh();
      return;
    }

    setSubmittedEmail(values.email);
  }

  if (submittedEmail) {
    return (
      <div aria-live="polite" className="py-4">
        <span className="grid size-12 place-items-center rounded-md bg-[#e7f2ce] text-[#50672d]">
          <Mail size={22} aria-hidden="true" />
        </span>
        <h2 className="mt-5 text-3xl font-semibold tracking-[-0.03em] text-[#282342]">
          Check your inbox
        </h2>
        <p className="mt-3 text-sm leading-6 text-[#77747e]">
          We sent a confirmation link to <span className="font-semibold text-[#393641]">{submittedEmail}</span>. Open it to finish creating your account.
        </p>
        <p className="mt-6 flex items-start gap-2 rounded-md border border-[#e6e3dd] bg-white px-3 py-3 text-xs leading-5 text-[#77747e]">
          <BadgeCheck className="mt-0.5 shrink-0 text-[#6a7f3e]" size={16} aria-hidden="true" />
          Campus identifiers are self-reported and are not independently verified.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm font-medium text-[#746e83]">Join your campus community</p>
      <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[#282342]">
        Create your account
      </h2>
      <p className="mt-2 text-sm leading-6 text-[#77747e]">
        One account to find a deal or pass something on.
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div>
          <label htmlFor="displayName" className="mb-1.5 block text-sm font-medium text-[#393641]">
            Display name
          </label>
          <div className="relative">
            <UserRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#898591]" size={16} aria-hidden="true" />
            <input {...register("displayName")} autoComplete="name" className={inputClassName} id="displayName" placeholder="How students will see you" aria-invalid={Boolean(errors.displayName)} aria-describedby={errors.displayName ? "displayName-error" : undefined} />
          </div>
          {errors.displayName && <p id="displayName-error" className="mt-1 text-xs text-red-700">{errors.displayName.message}</p>}
        </div>

        <div>
          <label htmlFor="campusIdentifier" className="mb-1.5 block text-sm font-medium text-[#393641]">
            Campus identifier
          </label>
          <div className="relative">
            <BadgeCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#898591]" size={16} aria-hidden="true" />
            <input {...register("campusIdentifier")} autoComplete="off" className={inputClassName} id="campusIdentifier" placeholder="Student ID or campus name" aria-invalid={Boolean(errors.campusIdentifier)} aria-describedby={errors.campusIdentifier ? "campusIdentifier-error" : undefined} />
          </div>
          {errors.campusIdentifier && <p id="campusIdentifier-error" className="mt-1 text-xs text-red-700">{errors.campusIdentifier.message}</p>}
          <p className="mt-1 text-[11px] leading-4 text-[#8b8890]">Self-reported for now; not verified against college records.</p>
        </div>

        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[#393641]">
            Email address
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#898591]" size={16} aria-hidden="true" />
            <input {...register("email")} autoComplete="email" className={inputClassName} id="email" type="email" placeholder="you@college.edu" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-error" : undefined} />
          </div>
          {errors.email && <p id="email-error" className="mt-1 text-xs text-red-700">{errors.email.message}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-[#393641]">
              Password
            </label>
            <div className="relative">
              <LockKeyhole className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#898591]" size={16} aria-hidden="true" />
              <input {...register("password")} autoComplete="new-password" className={`${inputClassName} pr-3`} id="password" type="password" placeholder="8+ characters" aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "password-error" : undefined} />
            </div>
            {errors.password && <p id="password-error" className="mt-1 text-xs text-red-700">{errors.password.message}</p>}
          </div>
          <div>
            <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-[#393641]">
              Confirm password
            </label>
            <div className="relative">
              <LockKeyhole className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#898591]" size={16} aria-hidden="true" />
              <input {...register("confirmPassword")} autoComplete="new-password" className={`${inputClassName} pr-3`} id="confirmPassword" type="password" placeholder="Repeat password" aria-invalid={Boolean(errors.confirmPassword)} aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined} />
            </div>
            {errors.confirmPassword && <p id="confirmPassword-error" className="mt-1 text-xs text-red-700">{errors.confirmPassword.message}</p>}
          </div>
        </div>

        {errors.root?.server && (
          <p aria-live="polite" className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
            {errors.root.server.message}
          </p>
        )}

        <button className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#514879] px-5 text-sm font-semibold text-white transition hover:bg-[#40385f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#514879] disabled:cursor-wait disabled:opacity-65" disabled={isSubmitting} type="submit">
          {isSubmitting ? <LoaderCircle className="animate-spin" size={17} /> : null}
          {isSubmitting ? "Creating account" : "Create account"}
          {!isSubmitting ? <ArrowRight size={17} aria-hidden="true" /> : null}
        </button>
      </form>
    </div>
  );
}