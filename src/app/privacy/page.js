"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Shield, AlertTriangle, Database } from "lucide-react";

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
          <h1 className="text-3xl font-playfair font-bold text-gray-900">
            Privacy Policy
          </h1>
          <p className="text-gray-600 mt-2">Last updated: May 29, 2025</p>
        </div>
      </div>

      {/* Important Notice */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-green-50 border-l-4 border-green-400 p-6 mb-8 rounded-r-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-green-800">
                Client-Side Privacy Protection
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <p>
                  <strong>
                    BiblioPod operates entirely in your browser with no server
                    storage.
                  </strong>
                  All your data, including uploaded books and reading progress,
                  is stored locally on your device. We cannot access, view, or
                  collect any of your personal information or content.
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
                Local Storage Notice
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  <strong>Your Data Stays on Your Device:</strong> Since all
                  data is stored locally in your browser, clearing your browser
                  data will permanently delete your library and reading
                  progress. Consider backing up important data regularly.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Privacy Policy Content */}
        <div className="prose prose-lg max-w-none">
          <h2 className="text-2xl font-playfair font-bold text-gray-900 mt-8 mb-4">
            1. Information We Collect
          </h2>
          <div className="text-gray-700 mb-6">
            <p className="mb-4">
              <strong>BiblioPod collects NO personal information.</strong> Since
              the application runs entirely in your browser:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>No account registration or personal details required</li>
              <li>
                Reading preferences stored only in your browser's local storage
              </li>
              <li>EPUB files remain on your device (must be legally owned)</li>
              <li>Reading progress and highlights stored locally only</li>
              <li>No analytics, tracking, or data collection of any kind</li>
            </ul>
          </div>

          <h2 className="text-2xl font-playfair font-bold text-gray-900 mt-8 mb-4">
            2. How We Use Your Information
          </h2>
          <div className="text-gray-700 mb-6">
            <p className="mb-4">
              <strong>
                We don't use your information because we don't have access to
                it.
              </strong>
              Your local browser storage is used solely for:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Providing the digital library functionality on your device
              </li>
              <li>Maintaining your reading progress and preferences locally</li>
              <li>Storing your uploaded EPUB files in your browser</li>
              <li>Remembering your app settings and customizations</li>
              <li>No server communication or data transmission occurs</li>
            </ul>
          </div>

          <h2 className="text-2xl font-playfair font-bold text-gray-900 mt-8 mb-4">
            3. Client-Side Application Benefits and Limitations
          </h2>
          <div className="text-gray-700 mb-6">
            <p className="mb-4">
              Important characteristics of this client-side application:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Maximum privacy - no data ever leaves your device</li>
              <li>No server costs or maintenance required</li>
              <li>Data persistence depends on your browser settings</li>
              <li>No cloud backup - you're responsible for your data</li>
              <li>Works offline once loaded in your browser</li>
            </ul>
          </div>

          <h2 className="text-2xl font-playfair font-bold text-gray-900 mt-8 mb-4">
            4. Data Storage and Security
          </h2>
          <p className="text-gray-700 mb-6">
            All data is stored exclusively in your browser's local storage using
            standard web APIs. No data is transmitted to external servers. Your
            browser's built-in security features protect your data. Only upload
            legally owned EPUB files. Consider the security implications of your
            device and browser when storing sensitive content.
          </p>

          <h2 className="text-2xl font-playfair font-bold text-gray-900 mt-8 mb-4">
            5. Content and Copyright Compliance
          </h2>
          <div className="text-gray-700 mb-6">
            <p className="mb-4">Regarding uploaded content:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Only legally purchased or owned EPUB files are permitted</li>
              <li>
                Users are solely responsible for ensuring content legality
              </li>
              <li>
                Since files stay on your device, we cannot monitor content
              </li>
              <li>You are responsible for complying with copyright laws</li>
              <li>
                Respect intellectual property rights of authors and publishers
              </li>
            </ul>
          </div>

          <h2 className="text-2xl font-playfair font-bold text-gray-900 mt-8 mb-4">
            6. Data Sharing and Disclosure
          </h2>
          <div className="text-gray-700 mb-6">
            <p className="mb-4">
              <strong>
                Your data is never shared because we don't have access to it:
              </strong>
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>No data transmission to external servers occurs</li>
              <li>No third-party services have access to your content</li>
              <li>No analytics or tracking data is collected</li>
              <li>Your data cannot be sold, shared, or disclosed</li>
              <li>Complete privacy protection through client-side operation</li>
            </ul>
          </div>

          <h2 className="text-2xl font-playfair font-bold text-gray-900 mt-8 mb-4">
            7. Your Rights and Controls
          </h2>
          <div className="text-gray-700 mb-6">
            <p className="mb-4">
              Since you have complete control over your local data, you can:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Clear all application data through browser settings</li>
              <li>Remove uploaded content from your library at any time</li>
              <li>Export or backup your data as needed</li>
              <li>Use the application completely offline</li>
              <li>
                No need to request data deletion - you control it entirely
              </li>
            </ul>
          </div>

          <h2 className="text-2xl font-playfair font-bold text-gray-900 mt-8 mb-4">
            8. Cookies and Tracking
          </h2>
          <p className="text-gray-700 mb-6">
            BiblioPod uses only essential browser storage (localStorage) for
            functionality. No cookies, tracking pixels, analytics, or
            third-party services are used. Your browsing and reading habits
            remain completely private and are not monitored or recorded.
          </p>

          <h2 className="text-2xl font-playfair font-bold text-gray-900 mt-8 mb-4">
            9. Changes to This Policy
          </h2>
          <p className="text-gray-700 mb-6">
            This privacy policy may be updated to reflect changes in
            functionality or legal requirements. Since the application operates
            client-side, any changes will be reflected in updated versions of
            the application. Check this page periodically for updates.
          </p>

          <h2 className="text-2xl font-playfair font-bold text-gray-900 mt-8 mb-4">
            10. Contact Information
          </h2>
          <p className="text-gray-700 mb-6">
            For privacy-related questions or concerns about BiblioPod, please
            contact the project maintainer through the appropriate channels.
            Since no personal data is collected, most privacy concerns are
            addressed by the client-side architecture itself.
          </p>

          <div className="bg-gray-50 p-6 rounded-lg mt-8">
            <div className="flex items-center mb-4">
              <Database className="h-6 w-6 text-amber-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">
                Privacy-First Architecture
              </h3>
            </div>
            <p className="text-gray-700">
              BiblioPod's client-side architecture ensures maximum privacy by
              design. Your data never leaves your device, providing you with
              complete control and privacy protection. Only upload legally owned
              EPUB files.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
