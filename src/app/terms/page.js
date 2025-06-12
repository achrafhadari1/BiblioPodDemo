"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  AlertTriangle,
  BookOpen,
  GraduationCap,
} from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#f8f5f0] text-gray-800">
      {/* Header */}
      <div className="bg-white border-b border-amber-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/"
            className="inline-flex items-center text-amber-600 hover:text-amber-700 transition-colors mb-4"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back to BiblioPod
          </Link>
          <h1 className="text-3xl font-['Playfair_Display',serif] font-bold text-gray-900">
            Terms of Service
          </h1>
          <p className="text-gray-600 mt-2">Last updated: May 29, 2025</p>
        </div>
      </div>

      {/* Important Notice */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-amber-50 border-l-4 border-amber-400 p-6 mb-8 rounded-r-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <GraduationCap className="h-6 w-6 text-amber-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-amber-800">
                Educational Project Notice
              </h3>
              <div className="mt-2 text-sm text-amber-700">
                <p>
                  <strong>
                    This is a school project for educational purposes only.
                  </strong>
                  BiblioPod is developed as part of an academic assignment and
                  is not intended for commercial use or distribution.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-red-50 border-l-4 border-red-400 p-6 mb-8 rounded-r-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-red-800">
                Legal Content Only
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>
                  <strong>
                    Upload of illegal content is strictly prohibited.
                  </strong>
                  This platform is designed exclusively for legally purchased
                  EPUB files. Users must own or have legal rights to any content
                  they upload.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Terms Content */}
        <div className="prose prose-lg max-w-none">
          <h2 className="text-2xl font-['Playfair_Display',serif] font-bold text-gray-900 mt-8 mb-4">
            1. Acceptance of Terms
          </h2>
          <p className="text-gray-700 mb-6">
            By accessing and using BiblioPod, you accept and agree to be bound
            by the terms and provision of this agreement. This is a student
            project created for educational purposes and should be treated as
            such.
          </p>

          <h2 className="text-2xl font-['Playfair_Display',serif] font-bold text-gray-900 mt-8 mb-4">
            2. Educational Purpose
          </h2>
          <p className="text-gray-700 mb-6">
            BiblioPod is developed as a school project to demonstrate web
            development skills and digital library management concepts. It is
            not a commercial service and should not be used for any commercial
            purposes.
          </p>

          <h2 className="text-2xl font-['Playfair_Display',serif] font-bold text-gray-900 mt-8 mb-4">
            3. Legal Content Requirements
          </h2>
          <div className="text-gray-700 mb-6">
            <p className="mb-4">
              Users agree to only upload and share content that:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>They legally own or have purchased</li>
              <li>They have explicit permission to use and share</li>
              <li>Does not violate any copyright laws</li>
              <li>
                Does not contain illegal, harmful, or inappropriate material
              </li>
              <li>Consists only of legally obtained EPUB files</li>
            </ul>
          </div>

          <h2 className="text-2xl font-['Playfair_Display',serif] font-bold text-gray-900 mt-8 mb-4">
            4. Prohibited Activities
          </h2>
          <div className="text-gray-700 mb-6">
            <p className="mb-4">
              The following activities are strictly prohibited:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Uploading pirated or illegally obtained books</li>
              <li>Sharing copyrighted content without permission</li>
              <li>Using the platform for commercial purposes</li>
              <li>Attempting to hack or compromise the system</li>
              <li>Uploading malicious files or content</li>
              <li>Violating any applicable laws or regulations</li>
            </ul>
          </div>

          <h2 className="text-2xl font-['Playfair_Display',serif] font-bold text-gray-900 mt-8 mb-4">
            5. User Responsibilities
          </h2>
          <div className="text-gray-700 mb-6">
            <p className="mb-4">Users are responsible for:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Ensuring all uploaded content is legally obtained</li>
              <li>Maintaining the security of their account credentials</li>
              <li>Respecting the educational nature of this project</li>
              <li>Reporting any suspicious or illegal activity</li>
              <li>Understanding this is a student project with limitations</li>
            </ul>
          </div>

          <h2 className="text-2xl font-['Playfair_Display',serif] font-bold text-gray-900 mt-8 mb-4">
            6. Disclaimer
          </h2>
          <p className="text-gray-700 mb-6">
            This platform is provided "as is" for educational purposes. As a
            school project, it may have limitations, bugs, or security
            vulnerabilities. Users should not upload sensitive or critical data.
            The developers are not responsible for any data loss or security
            issues.
          </p>

          <h2 className="text-2xl font-['Playfair_Display',serif] font-bold text-gray-900 mt-8 mb-4">
            7. Data and Privacy
          </h2>
          <p className="text-gray-700 mb-6">
            As an educational project, data handling practices may not meet
            commercial standards. Users should not upload personal or sensitive
            information. All data may be subject to review for educational
            assessment purposes.
          </p>

          <h2 className="text-2xl font-['Playfair_Display',serif] font-bold text-gray-900 mt-8 mb-4">
            8. Termination
          </h2>
          <p className="text-gray-700 mb-6">
            Access to BiblioPod may be terminated at any time, especially upon
            completion of the educational project. Users found violating these
            terms, particularly regarding illegal content, will have their
            access immediately revoked.
          </p>

          <h2 className="text-2xl font-['Playfair_Display',serif] font-bold text-gray-900 mt-8 mb-4">
            9. Contact Information
          </h2>
          <p className="text-gray-700 mb-6">
            For questions about these terms or to report violations, please
            contact the project maintainer through the appropriate educational
            channels.
          </p>

          <div className="bg-gray-50 p-6 rounded-lg mt-8">
            <div className="flex items-center mb-4">
              <BookOpen className="h-6 w-6 text-amber-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">
                Remember: Legal EPUBs Only
              </h3>
            </div>
            <p className="text-gray-700">
              This platform is designed for managing your legally purchased EPUB
              collection. Please respect copyright laws and only upload books
              you have legally obtained.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
