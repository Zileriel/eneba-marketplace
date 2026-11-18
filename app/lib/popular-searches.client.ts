export interface PopularSearch {
  id: string;
  searchTerm: string;
}

let popularSearchesCache: Promise<PopularSearch[]> | null = null;

export function getPopularSearches() {
  if (!popularSearchesCache) {
    const request = loadPopularSearches();
    popularSearchesCache = request;
    request.catch(() => {
      if (popularSearchesCache === request) popularSearchesCache = null;
    });
  }

  return popularSearchesCache;
}

async function loadPopularSearches(): Promise<PopularSearch[]> {
  const [{ collection, getDocs, getDocsFromCache, orderBy, query }, { db }] =
    await Promise.all([
      import("firebase/firestore"),
      import("./firebase"),
    ]);
  const popularSearchesQuery = query(
    collection(db, "popular_searches"),
    orderBy("rank"),
  );

  let cachedSnapshot;
  try {
    cachedSnapshot = await getDocsFromCache(popularSearchesQuery);
  } catch {
    cachedSnapshot = null;
  }
  const snapshot =
    cachedSnapshot && !cachedSnapshot.empty
      ? cachedSnapshot
      : await getDocs(popularSearchesQuery);

  return snapshot.docs.map((document) => {
    const { searchTerm } = document.data();
    if (typeof searchTerm !== "string") {
      throw new Error(`Popular search "${document.id}" has no search term.`);
    }

    return { id: document.id, searchTerm };
  });
}
