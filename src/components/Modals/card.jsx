import React from "react";

export default function Card({ book, onClick }) {
  if (!book) return null;

  const { isbn, title, annotations_count, thumbnail } = book;

  const resolvedThumbnail = thumbnail?.startsWith("public")
    ? `https://bibliopodv2-production.up.railway.app/${thumbnail.replace(
        "public",
        "storage"
      )}`
    : thumbnail;

  return (
    <div
      className="w-full sm:w-1/2 md:w-1/3 lg:w-1/4 px-2 mt-4 cursor-pointer"
      onClick={onClick}
    >
      <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-3 h-full flex flex-col">
        <img
          src={resolvedThumbnail}
          alt={title}
          className="w-full h-48 object-cover rounded-md"
        />
        <div className="mt-2 flex-grow">
          <h2 className="text-lg font-semibold truncate">{title}</h2>
          <p className="text-sm text-gray-600">
            {annotations_count} Annotations
          </p>
        </div>
      </div>
    </div>
  );
}
