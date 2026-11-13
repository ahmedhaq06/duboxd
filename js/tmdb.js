window.DuboxdTMDB = (function () {
  const cfg = window.DUBOXD_CONFIG;
  const seedMovies = window.DUBOXD_SEED_MOVIES || [];

  function hasApiKey() {
    return Boolean(cfg.TMDB_API_KEY && cfg.TMDB_API_KEY.trim().length > 5);
  }

  function buildCriterionSvgDataUri(title, year, director) {
    const safeTitle = (title || "Untitled Film").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const safeYear = (year || "").replace(/&/g, "&amp;");
    const safeDir = (director || "DU Archive").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const words = safeTitle.toUpperCase().split(" ");
    let line1 = "";
    let line2 = "";
    let line3 = "";
    words.forEach((w) => {
      if ((line1 + " " + w).trim().length <= 14) {
        line1 = (line1 + " " + w).trim();
      } else if ((line2 + " " + w).trim().length <= 14) {
        line2 = (line2 + " " + w).trim();
      } else {
        line3 = (line3 + " " + w).trim().slice(0, 16);
      }
    });

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#191c24"/>
          <stop offset="55%" stop-color="#111318"/>
          <stop offset="100%" stop-color="#0b0c0f"/>
        </linearGradient>
      </defs>
      <rect width="400" height="600" fill="url(#bg)"/>
      <rect x="22" y="22" width="356" height="556" fill="none" stroke="#2d323e" stroke-width="1"/>
      <line x1="22" y1="74" x2="378" y2="74" stroke="#2d323e" stroke-width="1"/>
      <text x="42" y="54" fill="#c8963e" font-family="Netflix Sans, sans-serif" font-size="11" font-weight="700" letter-spacing="3">DUBOXD ARCHIVE</text>
      <text x="358" y="54" fill="#686e7a" font-family="Netflix Sans, sans-serif" font-size="11" font-weight="700" text-anchor="end" letter-spacing="2">${safeYear}</text>
      <rect x="42" y="120" width="36" height="3" fill="#b11e24"/>
      <text x="42" y="158" fill="#9da3ae" font-family="Netflix Sans, sans-serif" font-size="12" font-weight="700" letter-spacing="2">${safeDir.toUpperCase()}</text>
      <text x="42" y="440" fill="#e8e6e1" font-family="Netflix Sans, sans-serif" font-size="34" font-weight="900" letter-spacing="1">${line1}</text>
      <text x="42" y="480" fill="#e8e6e1" font-family="Netflix Sans, sans-serif" font-size="34" font-weight="900" letter-spacing="1">${line2}</text>
      <text x="42" y="520" fill="#e8e6e1" font-family="Netflix Sans, sans-serif" font-size="34" font-weight="900" letter-spacing="1">${line3}</text>
    </svg>`;
    return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  }

  function getPosterUrl(movie) {
    if (!movie) return buildCriterionSvgDataUri("Film", "", "");
    const year = (movie.release_date || "").slice(0, 4);
    if (movie.poster_path && movie.poster_path.startsWith("http")) {
      return movie.poster_path;
    }
    if (movie.poster_path && hasApiKey()) {
      return cfg.TMDB_IMG_POSTER + movie.poster_path;
    }
    const verifiedPaths = [
      "/iYypPT4bhqXfq1b6EnmxvRt6b2Y.jpg",
      "/2LquGwEhbg3soxSCs9VNyh5VJd9.jpg",
      "/dLlH4aNHdnmf62umnInL8xPlPzw.jpg",
      "/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
      "/4911T5FbJ9eD2Faz5Z8cT3SUhU3.jpg"
    ];
    if (movie.poster_path && verifiedPaths.includes(movie.poster_path)) {
      return cfg.TMDB_IMG_POSTER + movie.poster_path;
    }
    return buildCriterionSvgDataUri(movie.title || movie.movie_title, year || movie.movie_year, movie.director);
  }

  function getBackdropUrl(movie) {
    if (movie && movie.backdrop_path && hasApiKey()) {
      return cfg.TMDB_IMG_BACKDROP + movie.backdrop_path;
    }
    if (movie && movie.backdrop_path === "/TU9NIjwzjoKPwQHoHshkFcQUCG.jpg") {
      return cfg.TMDB_IMG_BACKDROP + movie.backdrop_path;
    }
    return "";
  }

  function normalizeTmdbMovie(raw) {
    const seedMatch = seedMovies.find((m) => Number(m.id) === Number(raw.id));
    let director = raw.director || (seedMatch ? seedMatch.director : "Archive Selection");
    let cast = raw.cast || (seedMatch ? seedMatch.cast : []);
    if (raw.credits && raw.credits.crew) {
      const dirObj = raw.credits.crew.find((c) => c.job === "Director");
      if (dirObj) director = dirObj.name;
    }
    if (raw.credits && raw.credits.cast) {
      cast = raw.credits.cast.slice(0, 6).map((c) => c.name);
    }
    let genres = raw.genres || [];
    if (genres.length && typeof genres[0] === "object") {
      genres = genres.map((g) => g.name);
    }
    return {
      id: Number(raw.id),
      title: raw.title || raw.name || "Untitled",
      release_date: raw.release_date || "2000-01-01",
      director: director,
      runtime: raw.runtime || (seedMatch ? seedMatch.runtime : 115),
      country: (raw.production_countries && raw.production_countries[0] && raw.production_countries[0].name) || raw.country || "International",
      tagline: raw.tagline || (seedMatch ? seedMatch.tagline : ""),
      poster_path: raw.poster_path || "",
      backdrop_path: raw.backdrop_path || "",
      vote_average: raw.vote_average || 7.8,
      du_rating: raw.du_rating || (seedMatch ? seedMatch.du_rating : Number(((raw.vote_average || 7.6) / 2).toFixed(1))),
      du_logs: raw.du_logs || (seedMatch ? seedMatch.du_logs : 42),
      genres: genres.length ? genres : ["Drama"],
      cast: cast,
      overview: raw.overview || "Synopsis archived in DU Film Society catalog."
    };
  }

  async function fetchTrending() {
    if (!hasApiKey()) {
      return seedMovies.map(normalizeTmdbMovie);
    }
    try {
      const res = await fetch(`${cfg.TMDB_BASE_URL}/trending/movie/week?api_key=${cfg.TMDB_API_KEY}`);
      if (!res.ok) throw new Error("TMDB error");
      const data = await res.json();
      return (data.results || []).slice(0, 12).map(normalizeTmdbMovie);
    } catch (e) {
      return seedMovies.map(normalizeTmdbMovie);
    }
  }

  async function searchMovies(query, genreFilter, sortBy) {
    let list = [];
    if (hasApiKey() && query && query.trim().length > 1) {
      try {
        const res = await fetch(`${cfg.TMDB_BASE_URL}/search/movie?api_key=${cfg.TMDB_API_KEY}&query=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          list = (data.results || []).map(normalizeTmdbMovie);
        }
      } catch (e) {
        list = [];
      }
    }

    if (!list.length) {
      const q = (query || "").trim().toLowerCase();
      list = seedMovies
        .filter((m) => {
          if (!q) return true;
          return (
            m.title.toLowerCase().includes(q) ||
            (m.director && m.director.toLowerCase().includes(q)) ||
            (m.release_date && m.release_date.includes(q))
          );
        })
        .map(normalizeTmdbMovie);
    }

    if (genreFilter && genreFilter !== "all") {
      list = list.filter((m) =>
        (m.genres || []).some((g) => g.toLowerCase() === genreFilter.toLowerCase())
      );
    }

    if (sortBy === "rating") {
      list.sort((a, b) => (b.du_rating || 0) - (a.du_rating || 0));
    } else if (sortBy === "year") {
      list.sort((a, b) => (b.release_date || "").localeCompare(a.release_date || ""));
    } else {
      list.sort((a, b) => (b.du_logs || 0) - (a.du_logs || 0));
    }

    return list;
  }

  async function getMovieDetails(movieId) {
    const numId = Number(movieId);
    const customMovies = JSON.parse(localStorage.getItem("duboxd_custom_movies") || "[]");
    const foundCustom = customMovies.find((m) => Number(m.id) === numId);
    if (foundCustom) return normalizeTmdbMovie(foundCustom);

    if (hasApiKey()) {
      try {
        const res = await fetch(`${cfg.TMDB_BASE_URL}/movie/${numId}?api_key=${cfg.TMDB_API_KEY}&append_to_response=credits`);
        if (res.ok) {
          const raw = await res.json();
          return normalizeTmdbMovie(raw);
        }
      } catch (e) {}
    }

    const foundSeed = seedMovies.find((m) => Number(m.id) === numId);
    return normalizeTmdbMovie(foundSeed || seedMovies[0]);
  }

  return {
    hasApiKey,
    getPosterUrl,
    getBackdropUrl,
    buildCriterionSvgDataUri,
    fetchTrending,
    searchMovies,
    getMovieDetails
  };
})();
