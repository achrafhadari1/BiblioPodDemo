"use client";
import React, { useState, useEffect } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "../ui/drawer";
import { Button } from "../ui/button";
import { IoSettingsOutline } from "react-icons/io5";
import { Slider, Button as NextUIButton } from "@nextui-org/react";
import "../../styles/fonts.css";

export const EpubReaderSettings = ({
  rendition,
  fontSize,
  fontFamily,
  updateFontSize,
  updateFontFamily,
}) => {
  const [fontSlider, setFontSlider] = useState(0.7);

  // Available local fonts
  const availableFonts = [
    { name: "Lora", displayName: "Lora", className: "font-lora" },
    { name: "Alegreya", displayName: "Alegreya", className: "font-alegreya" },
    { name: "Atkinson", displayName: "Atkinson", className: "font-atkinson" },
    { name: "Bookerly", displayName: "Bookerly", className: "font-bookerly" },
    { name: "Literata", displayName: "Literata", className: "font-literata" },
  ];

  // Sync font slider with current font size
  useEffect(() => {
    if (fontSize) {
      const sizeValue = parseInt(fontSize) / 40; // Convert px to slider value
      setFontSlider(Math.max(0.5, Math.min(1, sizeValue)));
    }
  }, [fontSize]);

  const redrawAnnotations = () => {
    if (rendition) {
      rendition
        .views()
        .forEach((view) => (view.pane ? view.pane.render() : null));

      rendition.on("rendered", redrawAnnotations);
    }
  };

  // Handle the onChange event to update the slider value
  const handleSliderChange = (value) => {
    setFontSlider(value);
    const newSize = `${value * 40}px`;
    updateFontSize(newSize);
    redrawAnnotations();
  };

  // Function to handle font selection
  const handleFontSelect = (fontName) => {
    updateFontFamily(fontName);
  };

  return (
    <>
      <Drawer>
        <DrawerTrigger asChild>
          <NextUIButton
            isIconOnly
            variant="light"
            className="text-foreground hover:bg-default-100 transition-all duration-200 dark:text-white dark:hover:bg-default-200/20"
            aria-label="Open settings"
          >
            <IoSettingsOutline className="w-5 h-5 text-black " />
          </NextUIButton>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>SETTINGS</DrawerTitle>
          </DrawerHeader>
          <div className="flex-col flex w-full items-center mb-8 gap-8">
            <div className="flex flex-col gap-6 px-8 w-full max-w-md">
              <Slider
                size="sm"
                step={0.1}
                color="foreground"
                label="Font Size"
                showSteps={true}
                maxValue={1}
                minValue={0.5}
                value={fontSlider}
                onChange={handleSliderChange}
                defaultValue={0.5}
                className="max-w-md"
              />
            </div>
            <div className="fontContainer flex w-full justify-center gap-4 flex-wrap">
              {availableFonts.map((font) => (
                <div
                  key={font.name}
                  className={`font ${
                    fontFamily === font.name ? "active" : ""
                  } text-center cursor-pointer`}
                  onClick={() => handleFontSelect(font.name)}
                >
                  <div
                    className={`font-bold ${
                      font.className
                    } h-12 w-12 items-center justify-center flex rounded-full border-2 ${
                      fontFamily === font.name
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-400"
                    } hover:border-blue-400 transition-colors`}
                  >
                    Aa
                  </div>
                  <div className={`${font.className} text-sm mt-1`}>
                    {font.displayName}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* <DrawerFooter>
            <DrawerClose>
              <Button className="w-1/8 m-auto">Submit</Button>
            </DrawerClose>
            <DrawerClose>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter> */}
        </DrawerContent>
      </Drawer>
    </>
  );
};
