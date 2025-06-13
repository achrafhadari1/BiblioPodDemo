"use client";

import { useState, useEffect, useMemo } from "react";
import { IoMdMenu } from "react-icons/io";
import { FaListUl } from "react-icons/fa";
import { BiHighlight } from "react-icons/bi";
import { FaRegTrashCan } from "react-icons/fa6";
import { BiHomeAlt2 } from "react-icons/bi";
import { X } from "lucide-react";
import { bookStorageDB } from "../../utils/bookStorageDB";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Button } from "@nextui-org/react";
import { Link } from "react-router-dom";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "../../components/ui/drawer";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { flatten } from "./getChapters";
import { cn } from "../lib/utils";
import { useRouter } from "next/navigation";
export const ReaderMenu = ({
  book,
  bookValue,
  rendition,
  selectedColor,
  saveReadingProgress,
}) => {
  const [chapters, setChapters] = useState([]);
  const [currentCFI, setCurrentCFI] = useState({});
  const [annotations, setAnnotations] = useState([]);
  const [currentChapter, setCurrentChapter] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const fetchAnnotations = async () => {
    try {
      const annotations = await bookStorageDB.getAnnotations(bookValue);
      setAnnotations(annotations);
    } catch (error) {
      console.error("Error fetching annotations:", error);
    }
  };
  useEffect(() => {
    fetchAnnotations();
  }, [bookValue, selectedColor]);

  const gotoChapter = async (href) => {
    const id = href.split("#")[1];
    const item = book.spine.get(href);
    await item.load(book.load.bind(book));
    const el = id ? item.document.getElementById(id) : item.document.body;
    const chapterCFI = item.cfiFromElement(el);

    const newPercentage =
      rendition.book.locations.percentageFromCfi(chapterCFI) * 100;

    setCurrentCFI((prevCFI) => {
      return { newCFI: chapterCFI, newPercentage };
    });

    rendition.display(chapterCFI);
    setCurrentChapter(href);
  };

  useEffect(() => {
    if (rendition && book && isOpen) {
      const currentLocation = rendition.currentLocation();
      if (currentLocation && currentLocation.start) {
        const currentHref = currentLocation.start.href;
        if (currentHref) {
          setCurrentChapter(currentHref);
        }
      }
    }
  }, [rendition, book, isOpen]);

  useEffect(() => {
    if (book) {
      const chapters = flatten(book.navigation.toc);
      setChapters(chapters);
    }
  }, [book]);

  const handleGotoPage = async (cfiRange) => {
    if (rendition) {
      try {
        await rendition.display(cfiRange);

        const pageNumber = rendition.book.locations.locationFromCfi(cfiRange);
        const newPercentage =
          rendition.book.locations.percentageFromCfi(cfiRange) * 100;

        setCurrentCFI({
          newCFI: cfiRange,
          newPercentage,
        });
      } catch (error) {
        console.error("Error navigating to page with CFI:", cfiRange, error);
      }
    }
  };

  const handleDeleteAnnotation = async (id) => {
    try {
      console.log("Deleting annotation with ID:", id);
      console.log("BookValue:", bookValue);

      const result = await bookStorageDB.deleteAnnotation(bookValue, id);
      console.log("Delete result:", result);

      setAnnotations((prevAnnotations) => {
        const filtered = prevAnnotations.filter(
          (annotation) => annotation.id !== id
        );
        console.log("Annotations before filter:", prevAnnotations.length);
        console.log("Annotations after filter:", filtered.length);
        return filtered;
      });

      console.log("deletedsuccess");

      // Trigger annotation refresh in EpubReader
      window.dispatchEvent(
        new CustomEvent("annotationDeleted", {
          detail: { bookValue, annotationId: id },
        })
      );

      // Wait a bit before refetching to ensure delete completed
      setTimeout(() => {
        fetchAnnotations();
      }, 100);
    } catch (error) {
      console.error("Error deleting annotation:", error);
    }
  };

  const memoizedChapters = useMemo(() => chapters, [chapters]);

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
          .chapters-scroll::-webkit-scrollbar {
            width: 8px;
          }
          .chapters-scroll::-webkit-scrollbar-track {
            background: #e5e7eb;
            border-radius: 4px;
          }
          .chapters-scroll::-webkit-scrollbar-thumb {
            background: #9ca3af;
            border-radius: 4px;
          }
          .chapters-scroll::-webkit-scrollbar-thumb:hover {
            background: #6b7280;
          }
        `,
        }}
      />
      <div className="flex items-center gap-3">
        {/* Home Button */}

        <Button
          isIconOnly
          onClick={() => router.push("/library")}
          variant="light"
          className="text-foreground hover:bg-default-100 transition-all duration-200"
          aria-label="Go to home"
        >
          <BiHomeAlt2 className="w-5 h-5 text-black" />
        </Button>

        {/* Menu Drawer */}
        <Drawer open={isOpen} onOpenChange={setIsOpen}>
          <DrawerTrigger asChild>
            <Button
              isIconOnly
              variant="light"
              className="text-foreground hover:bg-default-100 transition-all duration-200"
              aria-label="Open menu"
            >
              <IoMdMenu className="w-5 h-5 text-black" />
            </Button>
          </DrawerTrigger>

          <DrawerContent className="h-[85vh] max-w-sm mx-auto overflow-hidden">
            <DrawerHeader className="pb-4">
              <div className="flex items-center justify-between">
                <DrawerTitle className="text-lg font-semibold">
                  Reader Menu
                </DrawerTitle>
                <DrawerClose asChild>
                  <Button
                    isIconOnly
                    variant="light"
                    size="sm"
                    className="text-default-500 hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </DrawerClose>
              </div>
            </DrawerHeader>

            <div className="flex-1 px-4 pb-4 overflow-hidden">
              <Tabs defaultValue="content" className="w-full h-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger
                    value="content"
                    className="flex flex-col gap-1 py-3"
                  >
                    <FaListUl className="w-4 h-4" />
                    <span className="text-xs">Contents</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="annotations"
                    className="flex flex-col gap-1 py-3"
                  >
                    <BiHighlight className="w-4 h-4" />
                    <span className="text-xs">Annotations</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent
                  value="content"
                  className="h-[calc(100%-4rem)] mt-0"
                >
                  <div
                    className="h-full overflow-y-auto pr-2 chapters-scroll"
                    style={{
                      scrollbarWidth: "thin",
                      scrollbarColor: "#9ca3af #e5e7eb",
                    }}
                  >
                    <ScrollArea className="h-full pr-2 chapters-scroll">
                      <div className="space-y-1 pb-4">
                        {memoizedChapters.map((chapter, i) => (
                          <button
                            key={i}
                            className={cn(
                              "w-full text-left p-3 rounded-lg transition-colors duration-200",
                              "hover:bg-default-100 active:bg-default-200",
                              "text-sm leading-relaxed",
                              currentChapter &&
                                currentChapter.includes(chapter.href)
                                ? "bg-primary/10 text-primary border border-primary/20"
                                : "text-foreground"
                            )}
                            onClick={() => {
                              gotoChapter(chapter.href);
                              saveReadingProgress();
                              setIsOpen(false);
                            }}
                          >
                            {chapter.label}
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </TabsContent>

                <TabsContent
                  value="annotations"
                  className="h-[calc(100%-4rem)] mt-0"
                >
                  <div
                    className="h-full overflow-y-auto pr-2 chapters-scroll"
                    style={{
                      scrollbarWidth: "thin",
                      scrollbarColor: "#9ca3af #e5e7eb",
                    }}
                  >
                    <div className="space-y-4 pb-4">
                      {annotations.length === 0 ? (
                        <div className="text-center py-8 text-default-500">
                          <BiHighlight className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No annotations yet</p>
                          <p className="text-xs mt-1">
                            Select text to create highlights
                          </p>
                        </div>
                      ) : (
                        annotations.map((annotation, index) => {
                          const { id, cfi_range, text } = annotation;
                          return (
                            <div
                              key={index}
                              className="p-4 rounded-lg bg-default-50 border border-default-200 space-y-3"
                            >
                              <div className="text-sm italic text-foreground leading-relaxed">
                                "{text}"
                              </div>
                              <div className="flex items-center justify-between">
                                <Button
                                  size="sm"
                                  variant="light"
                                  className="text-primary hover:bg-primary/10"
                                  onClick={() => {
                                    handleGotoPage(cfi_range);
                                    setIsOpen(false);
                                  }}
                                >
                                  Go to Page
                                </Button>
                                <Button
                                  size="sm"
                                  variant="light"
                                  color="danger"
                                  className="text-danger hover:bg-danger/10"
                                  startContent={
                                    <FaRegTrashCan className="w-3 h-3" />
                                  }
                                  onClick={() => handleDeleteAnnotation(id)}
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </>
  );
};
