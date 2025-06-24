"use client";

import { Suspense } from "react";
import EpubReaderCustom from "../../components/pages/EpubReaderCustom";

function ReaderCustomPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EpubReaderCustom />
    </Suspense>
  );
}

export default ReaderCustomPage;
