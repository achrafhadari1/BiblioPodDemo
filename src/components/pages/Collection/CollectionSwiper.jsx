import React, { useState, useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "../../components/style/collections.css"; // Import your CSS file
import "swiper/css";
import "swiper/css/scrollbar";
import { Scrollbar } from "swiper/modules";
import { Link } from "react-router-dom";
import { RatingComponent } from "../../components/RatingComponent";
import { MdArrowOutward } from "react-icons/md";
import { Progress } from "@nextui-org/react";
import axios from "../../api/axios";

export const CollectionSwiper = ({ books }) => {
  const [rating, setRating] = useState(null);
  const [progressBooks, setProgressBooks] = useState([]);

  useEffect(() => {
    const fetchReadingProgress = async (bookId) => {
      console.log(bookId);
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          console.error("Token not found in local storage");
          return 0;
        }

        const response = await axios.get(`/user-book-progress/${bookId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const { current_percentage } = response.data.progress;

        return current_percentage || 0;
      } catch (error) {
        return 0;
      }
    };

    // Fetch reading progress for each book
    const updateReadingProgress = async () => {
      const updatedBooks = await Promise.all(
        books.map(async (book) => {
          const progress = await fetchReadingProgress(book.isbn);
          return { ...book, progress };
        })
      );

      // Update state with updated books
      setProgressBooks(updatedBooks);
    };

    updateReadingProgress();
  }, [books]);

  return (
    <div className="h-3/4">
      <Swiper
        scrollbar={{
          hide: true,
        }}
        modules={[Scrollbar]}
        className="mySwiper h-full "
      >
        {progressBooks.map((book) => (
          <SwiperSlide key={book.id} className="bg-transparent">
            <div className="flex justify-center gap-4  h-full">
              <div className="w-3/12">
                {book.thumbnail && book.thumbnail.startsWith("public") ? (
                  <img
                    className="swiper-image h-4/5"
                    src={`https://bibliopodv2-production.up.railway.app/${book.thumbnail.replace(
                      "public",
                      "storage"
                    )}`}
                    alt="Book Poster"
                  />
                ) : (
                  <img
                    className="swiper-image h-4/5"
                    src={book.thumbnail}
                    alt="Book Poster"
                  />
                )}
              </div>
              <div className="text-left flex gap-2 flex-col w-5/12">
                <div>
                  <div className="text-6xl mb-3">{book.title}</div>
                  <div>
                    <span>{book.author}</span> - <span>{book.year}</span>
                  </div>
                </div>
                {book.description.length > 310 ? (
                  <div className="swiper-text-desc">{book.description}</div>
                ) : (
                  <div className="">{book.description}</div>
                )}{" "}
                <div className="mb-1">Rate it:</div>
                <div>
                  <RatingComponent
                    currentRating={book.rating}
                    onRatingChange={setRating}
                    bookId={book.isbn}
                  />
                </div>
                <div className="flex justify-between">
                  <Progress
                    size="sm"
                    radius="sm"
                    classNames={{
                      base: "width-12r",
                      track: "drop-shadow-md border border-default",
                      indicator: "bg-gradient-to-r from-pink-500 to-yellow-500",
                      label: "tracking-wider font-medium text-default-600",
                      value: "text-foreground/60",
                    }}
                    label="Progress"
                    value={book.progress || 0}
                    showValueLabel={true}
                  />
                  <div className="curr-button-light cursor-pointer">
                    <Link to={`/read?book=${book.isbn}`}>
                      {book.progress > 0
                        ? "Continue Reading"
                        : "Start Your Journey"}
                    </Link>
                    <div className="goIcon-light">
                      <MdArrowOutward />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};
