import {
  collection,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../firebase/firebase";

export interface PopularSearch {
  id: string;
  searchTerm: string;
}

export function getPopularSearches() {
  return loadPopularSearches();
}

async function loadPopularSearches(): Promise<PopularSearch[]> {
  const popularSearchesQuery = query(
    collection(db, "popular_searches"),
    orderBy("rank"),
  );

  const snapshot = await getDocs(popularSearchesQuery);

  return snapshot.docs.map((document) => {
    const { searchTerm } = document.data();
    if (typeof searchTerm !== "string") {
      throw new Error(`Popular search "${document.id}" has no search term.`);
    }

    return { id: document.id, searchTerm };
  });
}
