"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type FormData = z.infer<typeof formSchema>;

export function EmailSignupForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormData) => {
    console.log('Form submitted with data:', data);
    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: "" });

    try {
      console.log('Making API request to /api/subscribe');
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.email,
          source: "landing-page",
        }),
      });

      console.log('Response received:', response.status, response.ok);
      const result = await response.json();
      console.log('Response data:', result);

      if (response.ok) {
        setSubmitStatus({
          type: "success",
          message: "Thank you for subscribing! Check your email for confirmation.",
        });
        reset();
      } else if (response.status === 409) {
        setSubmitStatus({
          type: "error",
          message: "This email is already subscribed.",
        });
      } else {
        setSubmitStatus({
          type: "error",
          message: result.message || "Something went wrong. Please try again.",
        });
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setSubmitStatus({
        type: "error",
        message: "Network error. Please check your connection and try again.",
      });
    } finally {
      console.log('Form submission complete, setting isSubmitting to false');
      setIsSubmitting(false);
    }
  };

  if (submitStatus.type === "success") {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="p-6 rounded-lg flex flex-col items-center gap-4 animate-in fade-in-0 slide-in-from-bottom-4 bg-green-500/10 border border-green-500/20 text-green-400">
          <CheckCircle2 className="h-12 w-12" />
          <div className="text-center">
            <h3 className="text-lg font-semibold text-white mb-2">You&apos;re on the list!</h3>
            <p className="text-sm text-gray-300">{submitStatus.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={(e) => {
        console.log('Form submit event triggered');
        handleSubmit(onSubmit)(e);
      }} className="space-y-4">
        <div className="relative">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                {...register("email")}
                type="email"
                placeholder="Enter your email"
                className="w-full pl-10 pr-4 py-3 bg-white/10 backdrop-blur-md border border-gray-200/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder:text-gray-400 transition-all"
                disabled={isSubmitting}
              />
            </div>
          </div>
          <div className="flex justify-center mt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3 bg-gradient-to-r from-orange-400 to-yellow-400 text-white font-semibold rounded-lg hover:from-orange-500 hover:to-yellow-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Join Waitlist
              </>
            ) : (
              "Join Waitlist"
            )}
            </button>
          </div>
          {errors.email && (
            <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {errors.email.message}
            </p>
          )}
        </div>

        {submitStatus.type === "error" && (
          <div className="p-4 rounded-lg flex items-start gap-3 animate-in fade-in-0 slide-in-from-top-2 bg-red-500/10 border border-red-500/20 text-red-400">
            <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
            <p className="text-sm">{submitStatus.message}</p>
          </div>
        )}
      </form>

      <p className="mt-4 text-xs text-gray-400 text-center">
        We respect your privacy. Unsubscribe at any time.
      </p>
    </div>
  );
}