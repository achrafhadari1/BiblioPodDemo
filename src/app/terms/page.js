"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, BookOpen } from "lucide-react";

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
          <h1 className="text-3xl font-playfair font-bold text-gray-900">
            Terms of Service
          </h1>
          <p className="text-gray-600 mt-2">Last updated: June 13, 2025</p>
        </div>
      </div>

      {/* Important Notice */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border-l-4 border-red-400 p-6 mb-8 rounded-r-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-red-800">
                Legal Content Only - Your Responsibility
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>
                  <strong>
                    Upload of illegal content is strictly prohibited.
                  </strong>
                  This platform is designed exclusively for legally purchased
                  EPUB files. Since this is a client-side application that
                  stores data locally in your browser, you are solely
                  responsible for ensuring all uploaded content is legally
                  obtained and owned by you.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-400 p-6 mb-8 rounded-r-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <BookOpen className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-blue-800">
                Client-Side Application
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  <strong>BiblioPod operates entirely in your browser.</strong>
                  We do not host, store, or have access to any of your files.
                  All data is stored locally on your device using browser
                  storage. You are responsible for backing up your own data.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Terms Content */}
        <div className="prose prose-lg max-w-none">
          <h2 className="text-2xl font-playfair font-bold text-gray-900 mt-8 mb-4">
            1. Acceptance of Terms
          </h2>
          <p className="text-gray-700 mb-6">
            By accessing and using BiblioPod, you accept and agree to be bound
            by the terms and provision of this agreement.
          </p>

          <h2 className="text-2xl font-playfair font-bold text-gray-900 mt-8 mb-4">
            2. Legal Content Requirements
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

          <h2 className="text-2xl font-playfair font-bold text-gray-900 mt-8 mb-4">
            3. Prohibited Activities
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

          <h2 className="text-2xl font-playfair font-bold text-gray-900 mt-8 mb-4">
            4. User Responsibilities
          </h2>
          <div className="text-gray-700 mb-6">
            <p className="mb-4">Users are responsible for:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Ensuring all uploaded content is legally obtained</li>
              <li>Maintaining the security of their account credentials</li>
              <li>Using the platform responsibly and legally</li>
              <li>Reporting any suspicious or illegal activity</li>
              <li>Understanding the limitations of client-side applications</li>
            </ul>
          </div>

          <h2 className="text-2xl font-playfair font-bold text-gray-900 mt-8 mb-4">
            5. Disclaimer
          </h2>
          <p className="text-gray-700 mb-6">
            This platform is provided "as is" without warranty of any kind. As a
            client-side application, it may have limitations, bugs, or security
            vulnerabilities. Users should not upload sensitive or critical data.
            The developers are not responsible for any data loss or security
            issues.
          </p>

          <h2 className="text-2xl font-playfair font-bold text-gray-900 mt-8 mb-4">
            6. Client-Side Application & Data Storage
          </h2>
          <div className="text-gray-700 mb-6">
            <p className="mb-4">
              <strong>
                BiblioPod is a client-side application that operates entirely in
                your browser.
              </strong>
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>No Server Storage:</strong> We do not host, store, or
                have access to any of your uploaded files or data
              </li>
              <li>
                <strong>Local Storage Only:</strong> All your books, reading
                progress, and preferences are stored locally in your browser
                using IndexedDB
              </li>
              <li>
                <strong>Your Responsibility:</strong> You are solely responsible
                for the content you upload and store in your browser
              </li>
              <li>
                <strong>Data Persistence:</strong> Your data remains on your
                device and may be lost if you clear browser data or use a
                different device
              </li>
              <li>
                <strong>No Backup:</strong> We do not provide backup services -
                please maintain your own backups of important files
              </li>
            </ul>
          </div>

          <h2 className="text-2xl font-playfair font-bold text-gray-900 mt-8 mb-4">
            7. Privacy and Data Protection
          </h2>
          <div className="text-gray-700 mb-6">
            <p className="mb-4">
              Since BiblioPod operates entirely client-side:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                We cannot access, view, or collect any of your uploaded content
              </li>
              <li>No personal data is transmitted to our servers</li>
              <li>
                Your reading habits and preferences remain private on your
                device
              </li>
              <li>
                No cookies or tracking mechanisms are used for data collection
              </li>
            </ul>
          </div>

          <h2 className="text-2xl font-playfair font-bold text-gray-900 mt-8 mb-4">
            8. Termination
          </h2>
          <p className="text-gray-700 mb-6">
            Access to BiblioPod may be terminated at any time. Users found
            violating these terms, particularly regarding illegal content, will
            have their access immediately revoked.
          </p>

          <h2 className="text-2xl font-playfair font-bold text-gray-900 mt-8 mb-4">
            9. Contact Information
          </h2>
          <p className="text-gray-700 mb-6">
            For questions about these terms or to report violations, please
            contact the project maintainer through the appropriate channels.
          </p>

          <div className="bg-gray-50 p-6 rounded-lg mt-8">
            <div className="flex items-center mb-4">
              <BookOpen className="h-6 w-6 text-amber-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">
                Remember: Legal EPUBs Only & Your Data Responsibility
              </h3>
            </div>
            <div className="text-gray-700 space-y-3">
              <p>
                This platform is designed for managing your legally purchased
                EPUB collection. Please respect copyright laws and only upload
                books you have legally obtained.
              </p>
              <p>
                <strong>Important:</strong> Since BiblioPod is a client-side
                application, all your data is stored locally in your browser. We
                do not have access to your files, and you are responsible for
                maintaining backups of your important content.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
