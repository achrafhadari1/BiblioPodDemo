"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { localStorageDB } from "../../../utils/localStorageDB";
import Link from "next/link";
import {
  BarChart4,
  BookOpen,
  Calendar,
  ChevronRight,
  CloudLightning,
  Coffee,
  Compass,
  Feather,
  Heart,
  Layers,
  LibraryBig,
  LogIn,
  Menu,
  Moon,
  Palette,
  Search,
  Star,
  Sun,
  Trophy,
  UserPlus,
  X,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const mockReadingData = [
  { name: "Mon", pages: 65 },
  { name: "Tue", pages: 45 },
  { name: "Wed", pages: 98 },
  { name: "Thu", pages: 27 },
  { name: "Fri", pages: 45 },
  { name: "Sat", pages: 130 },
  { name: "Sun", pages: 86 },
];

export const Landing = () => {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // Check if user exists in IndexedDB
    const checkUser = async () => {
      try {
        const { bookStorageDB } = await import("../../../utils/bookStorageDB");
        const user = await bookStorageDB.getUser();

        if (user) {
          // User exists, redirect to library
          router.push("/library");
          return;
        }

        setCurrentUser(user);
      } catch (error) {
        console.error("Error checking user:", error);
        setCurrentUser(null);
      }
    };

    checkUser();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("BiblioPod_current_user");
    setCurrentUser(null);
    window.location.reload();
  };

  return (
    <div
      className={`min-h-screen font-['Inter',sans-serif] ${
        darkMode ? "bg-gray-900 text-gray-100" : "bg-[#f8f5f0] text-gray-800"
      }`}
    >
      {/* Navigation */}
      <nav
        className={`sticky top-0 z-50 ${
          darkMode ? "bg-gray-800/90" : "bg-[#f8f5f0]/90"
        } backdrop-blur-md border-b ${
          darkMode ? "border-gray-700" : "border-amber-200"
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center">
                <img className="w-[9rem]" src="/logo-long.png" />
                <div className="ml-1 text-xs -rotate-3 font-mono tracking-tight">
                  (beta)
                </div>
              </Link>
            </div>

            <div className=" md:flex items-center space-x-6">
              <a
                href="#features"
                className="text-sm font-medium hover:text-amber-600 transition-colors border-b-2 border-transparent hover:border-amber-600"
              >
                Features
              </a>
              <a
                href="#insights"
                className="text-sm font-medium hover:text-amber-600 transition-colors border-b-2 border-transparent hover:border-amber-600"
              >
                Insights
              </a>

              <Link
                href="/welcome"
                className="text-sm font-sans font-medium bg-amber-600 text-white px-4 py-2 rounded-full hover:bg-amber-700 transition-all duration-200 flex items-center gap-1 shadow-sm transform hover:translate-y-px hover:scale-105"
              >
                <BookOpen size={16} />
                Get Started
              </Link>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-full ${
                  darkMode
                    ? "bg-gray-700 text-amber-400"
                    : "bg-amber-100 text-amber-600"
                } rotate-3 shadow-sm`}
              >
                {darkMode ? <Moon size={18} /> : <Sun size={18} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex">
            <div
              className={`w-64 ${
                darkMode ? "bg-gray-800" : "bg-[#f8f5f0]"
              } h-full`}
            >
              <div className="p-4 flex justify-between items-center border-b border-amber-200">
                <h2 className="text-xl font-bold italic font-playfair">
                  BiblioPod
                </h2>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-md text-gray-500 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <a
                  href="#features"
                  className="block py-2 text-sm font-medium hover:text-amber-600 transition-colors"
                >
                  Features
                </a>
                <a
                  href="#insights"
                  className="block py-2 text-sm font-medium hover:text-amber-600 transition-colors"
                >
                  Insights
                </a>

                <Link
                  href="/welcome"
                  className="block py-3 text-sm font-medium bg-amber-600 text-white rounded-lg text-center hover:bg-amber-700 transition-colors"
                >
                  Get Started
                </Link>
              </div>
            </div>
            <div
              className="flex-1"
              onClick={() => setMobileMenuOpen(false)}
            ></div>
          </div>
        )}
      </nav>

      {/* Educational Project Banner */}
      <div
        className={`${darkMode ? "bg-amber-900/20" : "bg-amber-50"} border-b ${
          darkMode ? "border-amber-800" : "border-amber-200"
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-center text-center">
            <div className="text-left flex items-center gap-2 text-sm">
              <span className="text-amber-600">🎓</span>
              <span
                className={`font-medium ${
                  darkMode ? "text-amber-200" : "text-amber-800"
                }`}
              >
                Showcase Demo Notice:
              </span>
              <span
                className={`  ${
                  darkMode ? "text-amber-300" : "text-amber-700"
                }`}
              >
                This is a demo version using localStorage due to hosting budget
                constraints. Upload your own ePub files to test the reading
                functionality.
              </span>
              <Link
                href="/terms"
                className="text-amber-600 hover:text-amber-700 underline ml-2"
              >
                Learn more
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div
          className={`absolute inset-0 ${
            darkMode ? "bg-gray-800" : "bg-[#f8f5f0]"
          }`}
        >
          {!darkMode && (
            <>
              <div className="absolute top-0 right-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?q=80&w=1000&auto=format&fit=crop')] bg-no-repeat bg-cover opacity-5"></div>
              <div className="absolute top-10 left-10 w-32 h-32 bg-amber-400/20 rounded-full blur-2xl"></div>
              <div className="absolute bottom-10 right-10 w-32 h-32 bg-amber-300/20 rounded-full blur-2xl"></div>
            </>
          )}
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 relative">
          <div className="flex flex-row md:flex-row items-center gap-12">
            <div className="md:w-1/2 text-left">
              <h1 className="font-playfair text-4xl md:text-5xl font-bold mb-6 leading-tight">
                Your cozy corner <br />
                in the{" "}
                <span className="italic text-amber-600">digital bookshelf</span>
              </h1>
              <p className="text-lg md:text-xl opacity-80 mb-4 font-playfair italic">
                Track your reading journey, collect moments from pages, and
                rediscover the joy of literature.
              </p>
              <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>📚 Educational Project:</strong> This platform is
                  designed for managing your legally purchased EPUB collection
                  as part of a school project. Please respect copyright laws and
                  only upload books you own.
                </p>
              </div>
              <div className="flex justify-center">
                <Link
                  href="/welcome"
                  className="px-8 py-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-sans font-medium rounded-xl shadow-lg hover:from-amber-700 hover:to-orange-700 transition-all duration-300 inline-flex items-center gap-3 transform hover:-rotate-1 hover:scale-105 text-lg"
                >
                  <BookOpen size={24} />
                  Start your reading journey
                  <ChevronRight size={20} />
                </Link>
              </div>

              <div className="mt-8 flex items-center gap-2 text-sm opacity-70">
                <Heart size={14} className="text-amber-600" />
                <span>Educational project made for books and learning</span>
              </div>
            </div>

            {/* Hero Image */}
            <div className="md:w-1/2 transform rotate-2">
              <div
                className={`rounded-2xl overflow-hidden shadow-xl border-2 ${
                  darkMode
                    ? "bg-gray-800 border-gray-700"
                    : "bg-amber-50 border-amber-200"
                }`}
              >
                <div className="p-3">
                  <div
                    className={`flex items-center gap-2 p-2 ${
                      darkMode ? "bg-gray-700" : "bg-amber-100"
                    } rounded-lg mb-3`}
                  >
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                    </div>
                    <div
                      className={`text-xs px-3 py-1 rounded-md mx-auto text-center ${
                        darkMode ? "bg-gray-600" : "bg-white/50"
                      } font-mono`}
                    >
                      my-reading-journey.json
                    </div>
                  </div>

                  <div
                    className={`p-4 rounded-lg ${
                      darkMode ? "bg-gray-700/50" : "bg-white/50"
                    }`}
                  >
                    <div className="flex items-center mb-4 border-b pb-2 border-dashed border-amber-200">
                      <BookOpen className="h-5 w-5 text-amber-600 mr-2" />
                      <h3 className="font-playfair italic">
                        Currently Reading
                      </h3>
                    </div>

                    <div className="space-y-4">
                      <div
                        className={`p-3 rounded-lg ${
                          darkMode ? "bg-gray-800" : "bg-white"
                        } shadow-sm`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">The Secret History</h4>
                            <p className="text-xs opacity-70">Donna Tartt</p>
                          </div>
                          <div className="bg-amber-100 text-amber-600 text-xs px-2 py-1 rounded-full">
                            73% done
                          </div>
                        </div>
                        <div className="mt-2 w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500 rounded-full"
                            style={{ width: "73%" }}
                          ></div>
                        </div>
                      </div>

                      <div
                        className={`p-3 rounded-lg ${
                          darkMode ? "bg-gray-800" : "bg-white"
                        } shadow-sm`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">Piranesi</h4>
                            <p className="text-xs opacity-70">Susanna Clarke</p>
                          </div>
                          <div className="bg-amber-100 text-amber-600 text-xs px-2 py-1 rounded-full">
                            41% done
                          </div>
                        </div>
                        <div className="mt-2 w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500 rounded-full"
                            style={{ width: "41%" }}
                          ></div>
                        </div>
                      </div>

                      <div className="flex justify-between text-xs opacity-70 mt-3 italic border-t border-dashed border-amber-200 pt-2">
                        <span>Updated 2 hours ago</span>
                        <Link
                          href="/login"
                          className="text-amber-600 hover:underline"
                        >
                          See more books
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className={`py-20 ${darkMode ? "bg-gray-800" : "bg-amber-50"}`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-block mb-2 transform -rotate-2">
              <span className="bg-amber-100 text-amber-600 text-sm font-medium px-3 py-1 rounded-full">
                Features
              </span>
            </div>
            <h2 className="font-playfair text-3xl md:text-4xl font-bold mb-4">
              A love letter to book enthusiasts
            </h2>
            <p className="text-lg max-w-3xl mx-auto opacity-80">
              Crafted with the same care you'd place a bookmark in your favorite
              novel.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div
              className={`rounded-xl ${
                darkMode ? "bg-gray-700" : "bg-white"
              } p-6 shadow-sm border border-amber-100 transform hover:-rotate-1 transition-transform`}
            >
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4 -rotate-3">
                <LibraryBig className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="text-xl font-playfair font-bold mb-2">
                Curate Your Collection
              </h3>
              <p className="opacity-80">
                Arrange your digital shelves by mood, genre, color—or create
                that "books that made me cry on the subway" collection.
              </p>
            </div>

            {/* Feature 2 */}
            <div
              className={`rounded-xl ${
                darkMode ? "bg-gray-700" : "bg-white"
              } p-6 shadow-sm border border-amber-100 transform hover:rotate-1 transition-transform`}
            >
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4 rotate-3">
                <BarChart4 className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="text-xl font-playfair font-bold mb-2">
                Reading Insights
              </h3>
              <p className="opacity-80">
                Discover your reading patterns—like how you somehow finish more
                books during Mercury retrograde.
              </p>
            </div>

            {/* Feature 3 */}
            <div
              className={`rounded-xl ${
                darkMode ? "bg-gray-700" : "bg-white"
              } p-6 shadow-sm border border-amber-100 transform hover:-rotate-1 transition-transform`}
            >
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4 -rotate-3">
                <Trophy className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="text-xl font-playfair font-bold mb-2">
                Reading Streaks
              </h3>
              <p className="opacity-80">
                Maintain your reading habit with gentle nudges. We promise our
                notifications feel like a friend, not a fitness app.
              </p>
            </div>

            {/* Feature 4 */}
            <div
              className={`rounded-xl ${
                darkMode ? "bg-gray-700" : "bg-white"
              } p-6 shadow-sm border border-amber-100 transform hover:rotate-1 transition-transform`}
            >
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4 rotate-3">
                <Calendar className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="text-xl font-playfair font-bold mb-2">
                Reading Challenges
              </h3>
              <p className="opacity-80">
                "Read 12 books recommended by friends" or "Finish that epic
                fantasy series you've been putting off since 2015."
              </p>
            </div>

            {/* Feature 5 */}
            <div
              className={`rounded-xl ${
                darkMode ? "bg-gray-700" : "bg-white"
              } p-6 shadow-sm border border-amber-100 transform hover:-rotate-1 transition-transform`}
            >
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4 -rotate-3">
                <Compass className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="text-xl font-playfair font-bold mb-2">
                Book Explorer
              </h3>
              <p className="opacity-80">
                Add notes, custom covers, and fix those metadata errors that
                keep you up at night. Yes, we know it matters.
              </p>
            </div>

            {/* Feature 6 */}
            <div
              className={`rounded-xl ${
                darkMode ? "bg-gray-700" : "bg-white"
              } p-6 shadow-sm border border-amber-100 transform hover:rotate-1 transition-transform`}
            >
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4 rotate-3">
                <Feather className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="text-xl font-playfair font-bold mb-2">
                Quotes & Notes
              </h3>
              <p className="opacity-80">
                Capture those passages that make you stop and stare at the wall
                for 10 minutes contemplating existence.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section
        id="insights"
        className={`py-20 ${darkMode ? "bg-gray-900" : "bg-[#f8f5f0]"}`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-block mb-2 transform rotate-2">
              <span className="bg-amber-100 text-amber-600 text-sm font-medium px-3 py-1 rounded-full">
                Insights
              </span>
            </div>
            <h2 className="font-playfair text-3xl md:text-4xl font-bold mb-4">
              See your reading life unfold
            </h2>
            <p className="text-lg max-w-3xl mx-auto opacity-80">
              Those "just one more chapter" nights add up to something
              beautiful.
            </p>
          </div>

          <div
            className={`rounded-xl overflow-hidden shadow-lg border-2 ${
              darkMode
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-amber-200"
            } transform -rotate-1`}
          >
            <div className="p-6 md:p-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-playfair font-bold">
                      Your Reading Rhythm
                    </h3>
                    <div className="flex gap-2">
                      <button
                        className={`px-3 py-1 text-sm rounded-full ${
                          darkMode ? "bg-gray-700" : "bg-gray-100"
                        } transform -rotate-1`}
                      >
                        Week
                      </button>
                      <button
                        className={`px-3 py-1 text-sm rounded-full bg-amber-600 text-white transform rotate-1`}
                      >
                        Month
                      </button>
                      <button
                        className={`px-3 py-1 text-sm rounded-full ${
                          darkMode ? "bg-gray-700" : "bg-gray-100"
                        } transform -rotate-1`}
                      >
                        Year
                      </button>
                    </div>
                  </div>

                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          ...mockReadingData,
                          ...mockReadingData,
                          ...mockReadingData,
                        ].slice(0, 30)}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={darkMode ? "#374151" : "#f1e8d8"}
                        />
                        <XAxis
                          dataKey="name"
                          stroke={darkMode ? "#9ca3af" : "#6b7280"}
                        />
                        <YAxis stroke={darkMode ? "#9ca3af" : "#6b7280"} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: darkMode ? "#1f2937" : "#fff",
                            border: `1px solid ${
                              darkMode ? "#374151" : "#f1e8d8"
                            }`,
                            borderRadius: "0.5rem",
                            color: darkMode ? "#fff" : "#000",
                          }}
                        />
                        <Bar
                          dataKey="pages"
                          fill="#d97706"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="space-y-6">
                  <div
                    className={`p-6 rounded-xl ${
                      darkMode ? "bg-gray-700" : "bg-amber-50"
                    } transform rotate-1`}
                  >
                    <h3 className="text-lg font-playfair font-bold mb-4">
                      This Year's Journey
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Books Finished</span>
                          <span className="font-semibold">27 / 50</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-600 rounded-full"
                            style={{ width: "54%" }}
                          ></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Pages Turned</span>
                          <span className="font-semibold">8,734</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-600 rounded-full"
                            style={{ width: "67%" }}
                          ></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Hours Immersed</span>
                          <span className="font-semibold">214</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-600 rounded-full"
                            style={{ width: "45%" }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`p-6 rounded-xl ${
                      darkMode ? "bg-gray-700" : "bg-amber-50"
                    } transform -rotate-1`}
                  >
                    <h3 className="text-lg font-playfair font-bold mb-4">
                      Literary Wanderings
                    </h3>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-medium italic">Fiction</span>
                        <span className="px-2 py-1 text-xs bg-amber-100 text-amber-600 rounded-full">
                          42%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium italic">Science</span>
                        <span className="px-2 py-1 text-xs bg-amber-100 text-amber-600 rounded-full">
                          28%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium italic">History</span>
                        <span className="px-2 py-1 text-xs bg-amber-100 text-amber-600 rounded-full">
                          15%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium italic">Memoir</span>
                        <span className="px-2 py-1 text-xs bg-amber-100 text-amber-600 rounded-full">
                          10%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium italic">Poetry</span>
                        <span className="px-2 py-1 text-xs bg-amber-100 text-amber-600 rounded-full">
                          5%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={`py-16 ${darkMode ? "bg-gray-800" : "bg-amber-50"}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-block mb-3">
            <Coffee className="h-8 w-8 text-amber-600 inline-block transform -rotate-6" />
          </div>
          <h2 className="font-playfair text-3xl md:text-4xl font-bold mb-4">
            Join our cozy reading nook
          </h2>
          <p className="text-lg max-w-3xl mx-auto opacity-80 mb-8 font-playfair italic">
            Because your reading journey deserves more than a spreadsheet.
          </p>
          <div className="flex  sm:flex-row justify-center gap-4">
            <Link
              href="/signup"
              className="px-8 py-3 bg-amber-600 text-white font-sans font-medium rounded-lg shadow-md hover:bg-amber-700 transition-colors transform hover:-rotate-1"
            >
              Create your bookshelf
            </Link>
            <Link
              href="/login"
              className={`px-8 py-3 border font-sans ${
                darkMode
                  ? "border-gray-600 hover:bg-gray-700"
                  : "border-amber-300 hover:bg-amber-100"
              } rounded-lg font-medium transition-colors transform hover:rotate-1`}
            >
              Return to your books
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className={`py-12 ${
          darkMode ? "bg-gray-900 text-gray-300" : "bg-[#f8f5f0] text-gray-600"
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex  md:flex-row justify-between gap-8">
            <div className="mb-8 md:mb-0">
              <div className="flex items-center mb-4">
                <img className="w-[9rem]" src="/logo-long.png" alt="" />
              </div>
              <p className="max-w-xs text-sm opacity-70">
                An educational project demonstrating digital library management
                for legally purchased EPUB collections.
              </p>
              <div className="mt-4 text-xs">
                <span className="opacity-50">
                  Built for academic purposes for books and learning.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
              <div>
                <h3 className="font-playfair italic font-bold text-lg mb-4">
                  Explore
                </h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <a
                      href="#features"
                      className="hover:text-amber-600 transition-colors"
                    >
                      Features
                    </a>
                  </li>
                  <li>
                    <a
                      href="insights"
                      className="hover:text-amber-600 transition-colors"
                    >
                      Insights
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="hover:text-amber-600 transition-colors"
                    >
                      About Us
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="hover:text-amber-600 transition-colors"
                    >
                      Blog
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-playfair italic font-bold text-lg mb-4">
                  Community
                </h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <a
                      href="#"
                      className="hover:text-amber-600 transition-colors"
                    >
                      Book Club
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="hover:text-amber-600 transition-colors"
                    >
                      Reading Lists
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="hover:text-amber-600 transition-colors"
                    >
                      Recommendations
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="hover:text-amber-600 transition-colors"
                    >
                      Events
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-playfair italic font-bold text-lg mb-4">
                  Legal
                </h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link
                      href="/terms"
                      className="hover:text-amber-600 transition-colors"
                    >
                      Terms of Service
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/privacy"
                      className="hover:text-amber-600 transition-colors"
                    >
                      Privacy Policy
                    </Link>
                  </li>
                  <li>
                    <span className="text-xs opacity-60">
                      Educational Project
                    </span>
                  </li>
                  <li>
                    <span className="text-xs opacity-60">Legal EPUBs Only</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-amber-200/30 text-center text-xs opacity-50">
            <p>
              © 2025 BiblioPod - Educational Project. For legally purchased
              EPUBs only.
            </p>
            <p className="mt-2 text-amber-600">
              🎓 School Project - Academic Use Only
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
