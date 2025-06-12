"use client";

import { SignUp } from "@/components/pages/SignUp";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function SignUpPage() {
  usePageTitle("Sign Up");

  return <SignUp />;
}
