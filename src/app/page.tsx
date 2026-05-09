import type { Metadata } from "next";

import { GalleryServerBody } from "./gallery/gallery-server-body";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Joy Spots",
  description: "Browse tiny joy spots shared by the community.",
};

export default async function Home() {
  return <GalleryServerBody />;
}
