"use client";
import React, { useState } from "react";
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
import { Slider } from "@nextui-org/react";

export const EpubReaderSettings = ({ rendition }) => {
  const [fontSlider, setFontSlider] = useState(0.7);
  const [activeFont, setActiveFont] = useState("Lora"); // Default active font

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
    rendition.themes.fontSize(`${value * 40}px`);
    redrawAnnotations();
  };

  // Function to handle font selection
  const handleFontSelect = (font) => {
    setActiveFont(font);
    // Apply font change to rendition

    rendition.themes.override("font-family", font);
  };

  return (
    <>
      <Drawer>
        <DrawerTrigger className="h-0">
          <IoSettingsOutline className="cursor-pointer icon-cog " />
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>SETTINGS</DrawerTitle>
          </DrawerHeader>
          <div className="flex-col flex w-full items-center mb-8 gap-8">
            <div className="flex flex-col gap-6 w-full max-w-md">
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
            <div className="fontContainer flex w-3/12 justify-evenly gap-8">
              <div
                className={`font ${
                  activeFont === "Lora" ? "active" : ""
                } text-center`}
                onClick={() => handleFontSelect("Lora")}
              >
                <div className="font-bold font-1 h-12 m-auto w-12 items-center justify-center flex rounded-full border-2 border-black">
                  Aa
                </div>
                <div className="font-1">Lora</div>
              </div>
              <div
                className={`font ${
                  activeFont === `"Karla", sans-serif` ? "active" : ""
                } text-center`}
                onClick={() => handleFontSelect(`"Karla", sans-serif`)}
              >
                <div className="font-bold font-2 h-12 m-auto w-12 items-center justify-center flex rounded-full border-2 border-black">
                  Aa
                </div>
                <div className="font-2">Karla</div>
              </div>
              <div
                className={`font ${
                  activeFont === `"Zeyada", cursive` ? "active" : ""
                } text-center`}
                onClick={() => handleFontSelect(`"Zeyada", cursive`)}
              >
                <div className="font-bold font-3 h-12 m-auto w-12 items-center justify-center flex rounded-full border-2 border-black">
                  Aa
                </div>
                <div className="font-3">Zeyada</div>
              </div>
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
