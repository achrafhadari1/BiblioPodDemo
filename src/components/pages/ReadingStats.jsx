import React, { useState, useEffect } from "react";
import {
  Award,
  BarChart4,
  BookOpen,
  Calendar,
  ChevronLeft,
  Clock,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { useAuthContext } from "../../context/AuthContext";
import { CircularProgress } from "@nextui-org/react";
import { bookStorageDB } from "../../utils/bookStorageDB";

// Helper functions for generating chart data based on real user data
const generateMonthlyData = (books) => {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const monthlyCount = new Array(12).fill(0);

  // Count completed books by month based on actual completion dates
  books.forEach((book) => {
    if (book.progress === 100 && book.lastRead) {
      const completionDate = new Date(book.lastRead);
      const month = completionDate.getMonth();
      if (completionDate.getFullYear() === new Date().getFullYear()) {
        monthlyCount[month]++;
      }
    }
  });

  return months.map((month, index) => ({
    name: month,
    books: monthlyCount[index],
  }));
};

const generateDailyReadingData = (books) => {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  // For now, return empty data since we don't track daily reading time
  // This could be enhanced later with actual reading session tracking
  return days.map((day) => ({
    day,
    minutes: 0,
  }));
};

const generatePaceData = (books) => {
  // For now, return empty data since we don't track reading pace over time
  // This could be enhanced later with reading session tracking
  const weeks = 8;
  return Array.from({ length: weeks }, (_, index) => ({
    week: `Week ${index + 1}`,
    pagesPerDay: 0,
  }));
};

const calculateReadingStreak = (books) => {
  // Calculate actual reading streak based on recent activity
  if (books.length === 0) return 0;

  const today = new Date();
  const recentBooks = books
    .filter((book) => book.progress > 0 && book.lastRead)
    .sort((a, b) => new Date(b.lastRead) - new Date(a.lastRead));

  if (recentBooks.length === 0) return 0;

  // Simple streak calculation - days since last reading activity
  const lastReadDate = new Date(recentBooks[0].lastRead);
  const daysDiff = Math.floor((today - lastReadDate) / (1000 * 60 * 60 * 24));

  // If last read was today, return 1 day streak, otherwise 0
  return daysDiff === 0 ? 1 : 0;
};

export const ReadingStats = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const { user } = useAuthContext();

  const [stats, setStats] = useState({
    totalBooks: 0,
    booksInProgress: 0,
    completedBooks: 0,
    totalPages: 0,
    pagesRead: 0,
    readingTime: 0,
    favoriteGenre: "",
    genreDistribution: [],
    recentActivity: [],
    monthlyData: [],
    dailyReadingData: [],
    paceData: [],
    readingStreak: 0,
  });

  useEffect(() => {
    if (user) {
      fetchReadingStats();
    }
  }, [user]);

  // No longer need cache event listeners since we're using IndexedDB directly

  const fetchReadingStats = async (forceRefresh = false) => {
    try {
      setLoading(true);

      console.log("ReadingStats: Calculating statistics from IndexedDB...");

      // Get books from IndexedDB
      const books = await bookStorageDB.getAllBooks();
      console.log(`ReadingStats: Found ${books.length} books`);

      // Get reading progress from IndexedDB
      const booksWithProgress = await Promise.all(
        books.map(async (book) => {
          const progress = await bookStorageDB.getReadingProgress(book.isbn);
          return {
            ...book,
            progress: progress?.current_percentage || 0,
            lastRead:
              progress?.updated_at ||
              book.updated_at ||
              new Date().toISOString(),
          };
        })
      );

      // Calculate statistics
      const totalBooks = booksWithProgress.length;
      const booksInProgress = booksWithProgress.filter(
        (book) => book.progress > 0 && book.progress < 100
      ).length;
      const completedBooks = booksWithProgress.filter(
        (book) => book.progress === 100
      ).length;

      console.log(
        `ReadingStats: Statistics calculated - Total: ${totalBooks}, In Progress: ${booksInProgress}, Completed: ${completedBooks}`
      );

      // Estimate total pages (assuming average of 300 pages per book)
      const totalPages = totalBooks * 300;

      // Calculate pages read based on progress
      const pagesRead = booksWithProgress.reduce((total, book) => {
        return total + 300 * (book.progress / 100);
      }, 0);

      // Estimate reading time (assuming 2 minutes per page)
      const readingTime = Math.round((pagesRead * 2) / 60); // in hours

      // Calculate genre distribution
      const genres = {};
      booksWithProgress.forEach((book) => {
        const genre = book.genre || "Unknown";
        genres[genre] = (genres[genre] || 0) + 1;
      });

      // Find favorite genre
      let favoriteGenre = "None";
      let maxCount = 0;
      Object.entries(genres).forEach(([genre, count]) => {
        if (count > maxCount) {
          maxCount = count;
          favoriteGenre = genre;
        }
      });

      // Format genre distribution for display
      const genreDistribution = Object.entries(genres)
        .map(([genre, count]) => ({
          genre,
          count,
          percentage: Math.round((count / totalBooks) * 100),
        }))
        .sort((a, b) => b.count - a.count);

      // Get recent activity (sort by last read date)
      const recentActivity = booksWithProgress
        .filter((book) => book.progress > 0)
        .sort((a, b) => new Date(b.lastRead) - new Date(a.lastRead))
        .slice(0, 5)
        .map((book) => ({
          title: book.title,
          author: book.author,
          progress: book.progress,
          lastRead: new Date(book.lastRead).toLocaleDateString(),
        }));

      // Generate monthly reading data based on actual completion dates
      const monthlyData = generateMonthlyData(booksWithProgress);

      // Generate daily reading time data (currently not tracked, so empty)
      const dailyReadingData = generateDailyReadingData(booksWithProgress);

      // Generate reading pace data (currently not tracked, so empty)
      const paceData = generatePaceData(booksWithProgress);

      // Calculate actual reading streak
      const readingStreak = calculateReadingStreak(booksWithProgress);

      const calculatedStats = {
        totalBooks,
        booksInProgress,
        completedBooks,
        totalPages,
        pagesRead: Math.round(pagesRead),
        readingTime,
        favoriteGenre,
        genreDistribution,
        recentActivity,
        monthlyData,
        dailyReadingData,
        paceData,
        readingStreak,
      };

      setStats(calculatedStats);
      setLoading(false);
      setLastRefresh(new Date());
      console.log("ReadingStats: Statistics calculated successfully");
    } catch (error) {
      console.error("Error fetching reading stats:", error);
      setLoading(false);
    }
  };

  // Color scheme for charts
  const COLORS = ["#fbbf24", "#f59e0b", "#d97706", "#b45309", "#92400e"];

  // Reading achievements based on actual progress
  const achievements = [
    {
      title: "First Steps",
      description: "Add your first book to the library",
      progress: stats.totalBooks > 0 ? 100 : 0,
      icon: <BookOpen size={20} />,
    },
    {
      title: "Getting Started",
      description: "Start reading your first book",
      progress: stats.booksInProgress > 0 || stats.completedBooks > 0 ? 100 : 0,
      icon: <Calendar size={20} />,
    },
    {
      title: "Book Finisher",
      description: "Complete your first book",
      progress: stats.completedBooks > 0 ? 100 : 0,
      icon: <Award size={20} />,
    },
    // Progressive Library Building Achievements
    {
      title: "Book Collector",
      description: "Build a library of 5 books",
      progress: Math.min(100, (stats.totalBooks / 5) * 100),
      icon: <BarChart4 size={20} />,
      completed: stats.totalBooks >= 5,
    },
    {
      title: "Library Enthusiast",
      description: "Build a library of 10 books",
      progress:
        stats.totalBooks >= 5
          ? Math.min(100, (stats.totalBooks / 10) * 100)
          : 0,
      icon: <BarChart4 size={20} />,
      completed: stats.totalBooks >= 10,
      locked: stats.totalBooks < 5,
    },
    {
      title: "Book Curator",
      description: "Build a library of 25 books",
      progress:
        stats.totalBooks >= 10
          ? Math.min(100, (stats.totalBooks / 25) * 100)
          : 0,
      icon: <BarChart4 size={20} />,
      completed: stats.totalBooks >= 25,
      locked: stats.totalBooks < 10,
    },
    {
      title: "Library Scholar",
      description: "Build a library of 50 books",
      progress:
        stats.totalBooks >= 25
          ? Math.min(100, (stats.totalBooks / 50) * 100)
          : 0,
      icon: <BarChart4 size={20} />,
      completed: stats.totalBooks >= 50,
      locked: stats.totalBooks < 25,
    },
    {
      title: "Alexandria Librarian",
      description: "Build a library of 100 books",
      progress:
        stats.totalBooks >= 50
          ? Math.min(100, (stats.totalBooks / 100) * 100)
          : 0,
      icon: <BarChart4 size={20} />,
      completed: stats.totalBooks >= 100,
      locked: stats.totalBooks < 50,
    },
  ];

  if (loading) {
    return (
      <div className="h-screen w-full flex justify-center items-center">
        <CircularProgress size="lg" color="default" />
      </div>
    );
  }

  return (
    <div className="flex-1 w-full lg:w-[96%] lg:ml-auto p-4 sm:p-6 lg:p-8 overflow-auto bg-[#F5F5F0] min-h-screen pt-16 lg:pt-0 pb-20 lg:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div className="flex items-center">
          <button
            onClick={() => router.push("/library")}
            className="mr-3 sm:mr-4 p-2 rounded-full hover:bg-gray-100"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="font-playfair text-2xl sm:text-3xl font-bold">
              Reading Statistics
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Using cached data for fast loading - click refresh for latest from
              database
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button
            onClick={() => fetchReadingStats(true)}
            disabled={loading}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh from Database</span>
          </button>
          {lastRefresh && (
            <p className="text-xs text-gray-500">
              Fresh data fetched: {lastRefresh.toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-playfair text-xl font-bold">Monthly Reading</h2>
            <div className="text-amber-500">
              <Calendar size={20} />
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Books completed per month in 2025
          </p>
          <div className="h-64">
            {stats.monthlyData.some((month) => month.books > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats.monthlyData}
                  margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #f3f4f6",
                      borderRadius: "8px",
                      boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Bar dataKey="books" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <BookOpen size={48} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No completed books yet</p>
                  <p className="text-xs">
                    Start reading to see your monthly progress!
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-playfair text-xl font-bold">
              Genre Distribution
            </h2>
            <div className="text-amber-500">
              <BarChart4 size={20} />
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Breakdown of your reading by genre
          </p>
          <div className="h-64">
            {stats.genreDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.genreDistribution.map((item) => ({
                      name: item.genre,
                      value: item.count,
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {stats.genreDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #f3f4f6",
                      borderRadius: "8px",
                      boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <BarChart4 size={48} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No books in library yet</p>
                  <p className="text-xs">
                    Add books to see genre distribution!
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-playfair text-xl font-bold">
              Daily Reading Time
            </h2>
            <div className="text-amber-500">
              <Clock size={20} />
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Reading time tracking coming soon
          </p>
          <div className="h-64">
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <Clock size={48} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  Reading time tracking not available yet
                </p>
                <p className="text-xs">
                  This feature will be added in a future update!
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-playfair text-xl font-bold">Reading Pace</h2>
            <div className="text-amber-500">
              <TrendingUp size={20} />
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Reading pace tracking coming soon
          </p>
          <div className="h-64">
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <TrendingUp size={48} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  Reading pace tracking not available yet
                </p>
                <p className="text-xs">
                  This feature will be added in a future update!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="font-playfair text-xl font-bold mb-6">
          Reading Achievements
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {achievements.map((achievement, index) => (
            <div
              key={index}
              className={`border border-gray-200 rounded-lg p-5 shadow-sm ${
                achievement.locked ? "bg-gray-50 opacity-60" : "bg-white"
              }`}
            >
              <div className="flex items-center mb-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${
                    achievement.locked
                      ? "bg-gray-100 text-gray-400"
                      : achievement.completed || achievement.progress === 100
                      ? "bg-green-100 text-green-500"
                      : "bg-amber-100 text-amber-500"
                  }`}
                >
                  {achievement.locked ? "🔒" : achievement.icon}
                </div>
                <div>
                  <h3
                    className={`font-medium text-sm ${
                      achievement.locked ? "text-gray-400" : ""
                    }`}
                  >
                    {achievement.title}
                  </h3>
                  <p
                    className={`text-xs ${
                      achievement.locked ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    {achievement.locked
                      ? "Complete previous achievement to unlock"
                      : achievement.description}
                  </p>
                </div>
              </div>
              <div className="mb-1">
                <div className="flex justify-between text-xs mb-1">
                  <span
                    className={`font-medium ${
                      achievement.locked ? "text-gray-400" : ""
                    }`}
                  >
                    {achievement.locked
                      ? "Locked"
                      : `${Math.round(achievement.progress)}%`}
                  </span>
                  {(achievement.completed || achievement.progress >= 100) &&
                    !achievement.locked && (
                      <span className="text-green-500 flex items-center gap-1">
                        <Award size={12} /> Completed
                      </span>
                    )}
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      achievement.locked
                        ? "bg-gray-300"
                        : achievement.completed || achievement.progress >= 100
                        ? "bg-green-500"
                        : "bg-amber-500"
                    }`}
                    style={{
                      width: achievement.locked
                        ? "0%"
                        : `${Math.min(100, achievement.progress)}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-playfair text-xl font-bold">Reading Summary</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border border-gray-100 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-gray-500">
                Total Books Read
              </h3>
              <div className="text-amber-500">
                <BookOpen size={16} />
              </div>
            </div>
            <p className="text-3xl font-playfair font-bold">
              {stats.completedBooks}
            </p>
          </div>
          <div className="border border-gray-100 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-gray-500">
                Total Pages Read
              </h3>
              <div className="text-amber-500">
                <BookOpen size={16} />
              </div>
            </div>
            <p className="text-3xl font-playfair font-bold">
              {stats.pagesRead.toLocaleString()}
            </p>
          </div>
          <div className="border border-gray-100 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-gray-500">
                Reading Streak
              </h3>
              <div className="text-amber-500">
                <Calendar size={16} />
              </div>
            </div>
            <p className="text-3xl font-playfair font-bold">
              {stats.readingStreak} days
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
