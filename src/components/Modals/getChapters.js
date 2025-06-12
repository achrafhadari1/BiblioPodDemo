export function flatten(chapters) {
  return [].concat.apply(
    [],
    chapters.map((chapter) =>
      [].concat.apply([chapter], flatten(chapter.subitems))
    )
  );
}

export function getCfiFromHref(book, href) {
  if (!href) {
    // Handle the case where href is undefined or falsy
    console.error("Href is undefined or falsy:", href);
    return null; // or return a default CFI or handle it differently
  }

  const [_, id] = href.split("#");
  const section = book.spine.get(href);

  if (!id) {
    // Handle the case where id is undefined or falsy
    console.error("ID is undefined or falsy in href:", href);
    return null; // or return a default CFI or handle it differently
  }

  const el = section.document.getElementById(id);

  if (!el) {
    console.error("Element with ID not found:", id);
    return null; // or return a default CFI or handle it differently
  }

  return section.cfiFromElement(el);
}

export function getChapter(book, location) {
  const locationHref = location.start.href;

  let match = flatten(book.navigation.toc)
    .filter((chapter) => {
      return book
        .canonical(chapter.href)
        .includes(book.canonical(locationHref));
    }, null)
    .reduce((result, chapter) => {
      const locationAfterChapter =
        EpubCFI.prototype.compare(
          location.start.cfi,
          getCfiFromHref(book, chapter.href)
        ) > 0;
      return locationAfterChapter ? chapter : result;
    }, null);

  return match;
}
