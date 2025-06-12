"use client";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "../ui/drawer";
import { Button } from "../ui/button";
import React, { useState } from "react";
import { MdEditNote } from "react-icons/md";

export const EpubReaderDrawer = ({ setSelectedColor }) => {
  const [selectedColor, setSelectedColorInside] = useState(null);

  // Function to handle the click on a color circle
  const handleColorClick = (color) => {
    setSelectedColorInside(color);
  };
  const handleSubmit = () => {
    // When the "Submit" button is clicked, send the selected color
    setSelectedColor(selectedColor);
  };

  const getBorderStyle = (color) => {
    return selectedColor === color ? "2px solid #000" : "none";
  };
  const handleClick = (e) => {
    // Prevent the event from bubbling up to parent elements
    e.stopPropagation();
  };

  return (
    <Drawer className="z-40	">
      <DrawerTrigger className="h-full">
        <MdEditNote className="text-2xl" />
      </DrawerTrigger>
      <DrawerContent onClick={handleClick}>
        <DrawerHeader>
          <DrawerTitle>Add your annotation</DrawerTitle>
        </DrawerHeader>
        <div className="m-auto w-4/5">
          <div className="flex justify-between">
            <label
              for="message"
              className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
            >
              Text Area
            </label>
            <div className="flex gap-1">
              <div
                className="focus w-5 h-5 rounded-full bg-lime-500 cursor-pointer"
                style={{
                  border:
                    selectedColor === "#00FF00" ? "2px solid #000" : "none",
                }}
                onClick={() => {
                  handleColorClick("#00FF00");
                }}
              ></div>
              <div
                className="w-5 h-5 rounded-full bg-green-700 cursor-pointer"
                style={{
                  border:
                    selectedColor === "#008000" ? "2px solid #000" : "none",
                }}
                onClick={() => {
                  handleColorClick("#008000");
                }}
              ></div>
              <div
                className="w-5 h-5 rounded-full bg-sky-800 cursor-pointer"
                style={{
                  border:
                    selectedColor === "#87CEEB" ? "2px solid #000" : "none",
                }}
                onClick={() => {
                  handleColorClick("#87CEEB");
                }}
              ></div>
              <div
                className="w-5 h-5 rounded-full bg-violet-900 cursor-pointer"
                style={{
                  border:
                    selectedColor === "#8A2BE2" ? "2px solid #000" : "none",
                }}
                onClick={() => {
                  handleColorClick("#8A2BE2");
                }}
              ></div>
            </div>
          </div>
          <textarea
            id="message"
            rows="4"
            className="block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            placeholder="Write your thoughts here..."
          ></textarea>
        </div>
        <DrawerFooter className="m-auto">
          <DrawerClose>
            <Button className="w-1/8 m-auto" onClick={handleSubmit}>
              Submit
            </Button>
          </DrawerClose>
          <DrawerClose>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
