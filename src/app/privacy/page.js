"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Shield,
  AlertTriangle,
  GraduationCap,
  Database,
} from "lucide-react";

export default function PrivacyPolicy() {
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
            Privacy Policy
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
                  This privacy policy outlines data handling practices for an
                  academic assignment. Data protection standards may not meet
                  commercial requirements.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-400 p-6 mb-8 rounded-r-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-blue-800">
                Academic Context Disclaimer
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  <strong>Limited Privacy Protection:</strong> As an educational
                  project, this platform may not provide enterprise-level data
                  security. Please do not upload sensitive personal information.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Privacy Policy Content */}
        <div className="prose prose-lg max-w-none">
          <h2 className="text-2xl font-['Playfair_Display',serif] font-bold text-gray-900 mt-8 mb-4">
            1. Information We Collect
          </h2>
          <div className="text-gray-700 mb-6">
            <p className="mb-4">
              As an educational project, BiblioPod collects minimal information:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Account information (username, email for registration)</li>
              <li>Reading preferences and library organization data</li>
              <li>EPUB files you choose to upload (must be legally owned)</li>
              <li>Reading progress and highlights you create</li>
              <li>Basic usage analytics for project assessment</li>
            </ul>
          </div>

          <h2 className="text-2xl font-['Playfair_Display',serif] font-bold text-gray-900 mt-8 mb-4">
            2. How We Use Your Information
          </h2>
          <div className="text-gray-700 mb-6">
            <p className="mb-4">Your information is used solely for:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Providing the digital library functionality</li>
              <li>Maintaining your reading progress and preferences</li>
              <li>Educational assessment and project demonstration</li>
              <li>Improving the platform as part of the learning process</li>
              <li>Ensuring compliance with legal content requirements</li>
            </ul>
          </div>

          <h2 className="text-2xl font-['Playfair_Display',serif] font-bold text-gray-900 mt-8 mb-4">
            3. Educational Context and Limitations
          </h2>
          <div className="text-gray-700 mb-6">
            <p className="mb-4">
              Important limitations of this educational project:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Data security measures may not meet commercial standards</li>
              <li>The platform may be discontinued after project completion</li>
              <li>
                Data may be reviewed by instructors for educational assessment
              </li>
              <li>No guarantee of long-term data preservation</li>
              <li>Limited technical support and maintenance</li>
            </ul>
          </div>

          <h2 className="text-2xl font-['Playfair_Display',serif] font-bold text-gray-900 mt-8 mb-4">
            4. Data Storage and Security
          </h2>
          <p className="text-gray-700 mb-6">
            As a student project, data is stored locally or on educational
            hosting platforms. While we implement basic security measures, users
            should not upload sensitive personal information or critical data.
            All uploaded content must be legally owned EPUB files only.
          </p>

          <h2 className="text-2xl font-['Playfair_Display',serif] font-bold text-gray-900 mt-8 mb-4">
            5. Content and Copyright Compliance
          </h2>
          <div className="text-gray-700 mb-6">
            <p className="mb-4">Regarding uploaded content:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Only legally purchased or owned EPUB files are permitted</li>
              <li>Users are responsible for ensuring content legality</li>
              <li>
                Illegal content will be removed and may result in account
                termination
              </li>
              <li>
                We may monitor uploads to ensure compliance with legal
                requirements
              </li>
            </ul>
          </div>

          <h2 className="text-2xl font-['Playfair_Display',serif] font-bold text-gray-900 mt-8 mb-4">
            6. Data Sharing and Disclosure
          </h2>
          <div className="text-gray-700 mb-6">
            <p className="mb-4">
              Your data may be shared only in these limited circumstances:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>With instructors for educational assessment purposes</li>
              <li>If required by law or to prevent illegal activity</li>
              <li>In anonymized form for project demonstration</li>
              <li>Never sold or shared for commercial purposes</li>
            </ul>
          </div>

          <h2 className="text-2xl font-['Playfair_Display',serif] font-bold text-gray-900 mt-8 mb-4">
            7. Your Rights and Controls
          </h2>
          <div className="text-gray-700 mb-6">
            <p className="mb-4">
              As a user of this educational platform, you can:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Delete your account and associated data at any time</li>
              <li>Remove uploaded content from your library</li>
              <li>Request information about data we have collected</li>
              <li>Report concerns about content or privacy issues</li>
            </ul>
          </div>

          <h2 className="text-2xl font-['Playfair_Display',serif] font-bold text-gray-900 mt-8 mb-4">
            8. Cookies and Tracking
          </h2>
          <p className="text-gray-700 mb-6">
            This educational platform uses minimal cookies for basic
            functionality such as maintaining login sessions and user
            preferences. No third-party tracking or advertising cookies are
            used.
          </p>

          <h2 className="text-2xl font-['Playfair_Display',serif] font-bold text-gray-900 mt-8 mb-4">
            9. Changes to This Policy
          </h2>
          <p className="text-gray-700 mb-6">
            As this is a school project, this privacy policy may be updated as
            part of the learning process. Any significant changes will be
            communicated through the platform.
          </p>

          <h2 className="text-2xl font-['Playfair_Display',serif] font-bold text-gray-900 mt-8 mb-4">
            10. Contact Information
          </h2>
          <p className="text-gray-700 mb-6">
            For privacy-related questions or concerns about this educational
            project, please contact the project maintainer through appropriate
            educational channels.
          </p>

          <div className="bg-gray-50 p-6 rounded-lg mt-8">
            <div className="flex items-center mb-4">
              <Database className="h-6 w-6 text-amber-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">
                Educational Project Reminder
              </h3>
            </div>
            <p className="text-gray-700">
              This is a student project with limited data protection
              capabilities. Please only upload legally owned EPUB files and
              avoid sharing sensitive personal information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
